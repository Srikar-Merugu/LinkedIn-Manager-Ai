import axios from 'axios';
import pino from 'pino';

const logger = pino();

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;

  static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  getAuthUrl(userId: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL || 'https://linkedin-manager-ai.onrender.com/api'}/google/callback`;

    if (!clientId) {
      throw new Error('Google Client ID not configured');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      state: JSON.stringify({ userId }),
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleTokens> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.API_URL || 'https://linkedin-manager-ai.onrender.com/api'}/google/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in } = response.data;

    return {
      accessToken: access_token,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
    };
  }

  async createSpreadsheet(accessToken: string, title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const response = await axios.post(
      'https://sheets.googleapis.com/v4/spreadsheets',
      {
        properties: {
          title,
          locale: 'en_US',
          timeZone: 'America/New_York',
        },
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return {
      spreadsheetId: response.data.spreadsheetId,
      spreadsheetUrl: response.data.spreadsheetUrl,
    };
  }

  async getSheetId(accessToken: string, spreadsheetId: string, sheetName: string): Promise<number> {
    const response = await axios.get(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const sheet = response.data.sheets?.find((s: any) => s.properties.title === sheetName);
    return sheet?.properties?.sheetId || 0;
  }

  async appendRows(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
    rows: any[][]
  ): Promise<void> {
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append`,
      {
        values: rows,
        majorDimension: 'ROWS',
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { valueInputOption: 'USER_ENTERED' },
      }
    );
  }

  async writeHeaders(
    accessToken: string,
    spreadsheetId: string,
    sheetName: string,
    headers: string[]
  ): Promise<void> {
    await axios.put(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
      {
        values: [headers],
        majorDimension: 'ROWS',
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { valueInputOption: 'USER_ENTERED' },
      }
    );
  }

  async formatHeaderRow(
    accessToken: string,
    spreadsheetId: string,
    sheetId: number,
    columnCount: number
  ): Promise<void> {
    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: columnCount,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                  textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat)',
            },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  async exportCalendarData(
    accessToken: string,
    entries: any[]
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const now = new Date();
    const title = `LinkedIn Content Calendar - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    const { spreadsheetId, spreadsheetUrl } = await this.createSpreadsheet(accessToken, title);

    const headers = ['Date', 'Topic', 'Hook', 'Content Type', 'Status', 'Pillar', 'Score'];

    const rows = entries.map(entry => [
      entry.date ? new Date(entry.date).toLocaleDateString() : '',
      entry.topic || entry.title || '',
      entry.hook || '',
      entry.contentType || '',
      entry.status || '',
      entry.pillarName || '',
      entry.overallScore ? String(entry.overallScore) : '',
    ]);

    await this.writeHeaders(accessToken, spreadsheetId, 'Sheet1', headers);
    if (rows.length > 0) {
      await this.appendRows(accessToken, spreadsheetId, 'Sheet1', rows);
    }

    try {
      const sheetId = await this.getSheetId(accessToken, spreadsheetId, 'Sheet1');
      await this.formatHeaderRow(accessToken, spreadsheetId, sheetId, headers.length);
    } catch (e) {
      logger.warn('Failed to format header row');
    }

    return { spreadsheetId, spreadsheetUrl };
  }
}

export const googleSheetsService = GoogleSheetsService.getInstance();
