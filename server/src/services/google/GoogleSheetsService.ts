import axios from 'axios';
import pino from 'pino';

const logger = pino();

interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ExportData {
  posts: any[];
  queueItems: any[];
  analytics: any[];
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

  async createSpreadsheet(accessToken: string, title: string, sheetNames: string[]): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const response = await axios.post(
      'https://sheets.googleapis.com/v4/spreadsheets',
      {
        properties: {
          title,
          locale: 'en_US',
          timeZone: 'America/New_York',
        },
        sheets: sheetNames.map(name => ({
          properties: { title: name },
        })),
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
    if (rows.length === 0) return;

    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append`,
      {
        values: rows,
        majorDimension: 'ROWS',
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { valueInputOption: 'USER_ENTERED', insertDataOption: 'INSERT_ROWS' },
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
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: columnCount,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.13, green: 0.35, blue: 0.55 },
                  textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                  horizontalAlignment: 'CENTER',
                  padding: { top: 8, bottom: 8, left: 6, right: 6 },
                },
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,padding)',
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  async resizeColumns(
    accessToken: string,
    spreadsheetId: string,
    sheetId: number,
    columnWidths: number[]
  ): Promise<void> {
    const requests = columnWidths.map((width, i) => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: width },
        fields: 'pixelSize',
      },
    }));

    await axios.post(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      { requests },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  }

  async exportAllData(
    accessToken: string,
    data: ExportData
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    const now = new Date();
    const title = `Content Operations - ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    const sheetNames = ['Content Calendar', 'Post Content', 'Publishing Queue', 'Analytics'];

    const { spreadsheetId, spreadsheetUrl } = await this.createSpreadsheet(accessToken, title, sheetNames);

    const calHeaders = ['Date', 'Time', 'Topic', 'Content Type', 'Pillar', 'Status', 'Scheduled Time', 'Score'];
    const postHeaders = ['Post Title', 'Full LinkedIn Post', 'Hook', 'CTA', 'Content Type', 'Hashtags', 'Score'];
    const queueHeaders = ['Post Title', 'Scheduled Time', 'Current Status', 'LinkedIn Status', 'Publish Result', 'Error'];
    const analyticsHeaders = ['Post Title', 'Likes', 'Comments', 'Shares', 'Impressions', 'Engagement Rate', 'Status'];

    await Promise.all([
      this.writeHeaders(accessToken, spreadsheetId, 'Content Calendar', calHeaders),
      this.writeHeaders(accessToken, spreadsheetId, 'Post Content', postHeaders),
      this.writeHeaders(accessToken, spreadsheetId, 'Publishing Queue', queueHeaders),
      this.writeHeaders(accessToken, spreadsheetId, 'Analytics', analyticsHeaders),
    ]);

    const calRows = data.posts.map(post => [
      post.scheduleDate ? new Date(post.scheduleDate).toLocaleDateString() :
        post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() :
          post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '',
      post.scheduleDate ? new Date(post.scheduleDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
      post.title || '',
      post.contentType || '',
      (post.tags && post.tags[0]) || '',
      post.status || '',
      post.scheduleDate ? new Date(post.scheduleDate).toLocaleString() : '',
      post.overallScore ? String(post.overallScore) : '',
    ]);

    const postRows = data.posts.map(post => [
      post.title || '',
      post.fullContent || `${post.hook || ''}\n\n${post.body || ''}\n\n${post.cta || ''}`,
      post.hook || '',
      post.cta || '',
      post.contentType || '',
      (post.tags || []).join(', '),
      post.overallScore ? String(post.overallScore) : '',
    ]);

    const queueRows = data.queueItems.map(item => [
      item.title || item.topic || '',
      item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : '',
      item.stage || '',
      item.linkedinPostId ? 'Published' : item.stage === 'failed' ? 'Failed' : 'Pending',
      item.linkedinPostId || '',
      item.lastError || '',
    ]);

    const analyticsRows = data.posts
      .filter(p => p.status === 'published')
      .map(post => [
        post.title || '',
        '0',
        '0',
        '0',
        '0',
        '0%',
        post.status || '',
      ]);

    const postCount = data.posts.length;
    const queueCount = data.queueItems.length;
    const publishedCount = data.posts.filter(p => p.status === 'published').length;

    if (postCount > 0 || queueCount > 0 || publishedCount > 0) {
      await this.appendRows(accessToken, spreadsheetId, 'Content Calendar', calRows);
      await this.appendRows(accessToken, spreadsheetId, 'Post Content', postRows);
      await this.appendRows(accessToken, spreadsheetId, 'Publishing Queue', queueRows);
      if (analyticsRows.length > 0) {
        await this.appendRows(accessToken, spreadsheetId, 'Analytics', analyticsRows);
      }
    }

    try {
      const [calSheetId, postSheetId, queueSheetId, analyticsSheetId] = await Promise.all([
        this.getSheetId(accessToken, spreadsheetId, 'Content Calendar'),
        this.getSheetId(accessToken, spreadsheetId, 'Post Content'),
        this.getSheetId(accessToken, spreadsheetId, 'Publishing Queue'),
        this.getSheetId(accessToken, spreadsheetId, 'Analytics'),
      ]);

      await Promise.all([
        this.formatHeaderRow(accessToken, spreadsheetId, calSheetId, calHeaders.length),
        this.formatHeaderRow(accessToken, spreadsheetId, postSheetId, postHeaders.length),
        this.formatHeaderRow(accessToken, spreadsheetId, queueSheetId, queueHeaders.length),
        this.formatHeaderRow(accessToken, spreadsheetId, analyticsSheetId, analyticsHeaders.length),
        this.resizeColumns(accessToken, spreadsheetId, calSheetId, [100, 80, 250, 120, 100, 90, 140, 60]),
        this.resizeColumns(accessToken, spreadsheetId, postSheetId, [200, 500, 300, 200, 120, 150, 60]),
        this.resizeColumns(accessToken, spreadsheetId, queueSheetId, [200, 140, 100, 100, 140, 200]),
        this.resizeColumns(accessToken, spreadsheetId, analyticsSheetId, [200, 70, 80, 70, 100, 120, 90]),
      ]);
    } catch (e) {
      logger.warn({ error: (e as Error).message }, 'Failed to format sheets');
    }

    logger.info({ spreadsheetId, posts: postCount, queue: queueCount, published: publishedCount }, 'Full export complete');
    return { spreadsheetId, spreadsheetUrl };
  }
}

export const googleSheetsService = GoogleSheetsService.getInstance();
