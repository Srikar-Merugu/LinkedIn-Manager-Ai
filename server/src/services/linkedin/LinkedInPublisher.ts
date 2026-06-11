import axios from 'axios';
import pino from 'pino';
import { LinkedInConnection } from '../../models/identity/LinkedInConnection';

const logger = pino();

export interface PublishResult {
  success: boolean;
  linkedinPostId?: string;
  error?: string;
  status: 'published' | 'failed';
}

export class LinkedInPublisher {
  private readonly apiBase = 'https://api.linkedin.com/v2';
  private readonly authUrl = 'https://www.linkedin.com/oauth/v2';

  async publishPost(
    userId: string,
    content: string,
    visibility: 'PUBLIC' | 'CONNECTIONS' = 'PUBLIC'
  ): Promise<PublishResult> {
    try {
      const connection = await LinkedInConnection.findOne({ userId, isConnected: true });
      if (!connection) {
        return { success: false, error: 'LinkedIn account not connected', status: 'failed' };
      }

      let accessToken = connection.getAccessToken();

      // Refresh token if expired
      if (connection.isTokenExpired() && connection.refreshTokenEncrypted) {
        try {
          const refreshResult = await this.refreshAccessToken(connection.getRefreshToken());
          connection.setTokens(refreshResult.access_token, refreshResult.refresh_token, refreshResult.expires_in);
          await connection.save();
          accessToken = refreshResult.access_token;
          logger.info({ userId }, 'LinkedIn token refreshed successfully');
        } catch (refreshError: any) {
          logger.error({ error: refreshError.message, userId }, 'LinkedIn token refresh failed');
          connection.isConnected = false;
          await connection.save();
          return { success: false, error: 'LinkedIn session expired. Please reconnect.', status: 'failed' };
        }
      }

      // Create post via LinkedIn Posts API
      const authorUrn = `urn:li:person:${connection.linkedinUserId}`;
      const postBody = {
        author: authorUrn,
        commentary: content,
        visibility: visibility,
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      };

      const response = await axios.post(
        `${this.apiBase}/posts`,
        postBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          timeout: 30000,
        }
      );

      const postId = response.headers['x-restli-id'] || response.data?.id || '';
      const linkedinPostId = postId.replace('urn:li:share:', '').replace('urn:li:ugcPost:', '');

      connection.lastUsedAt = new Date();
      await connection.save();

      logger.info({ userId, linkedinPostId }, 'Post published to LinkedIn successfully');

      return {
        success: true,
        linkedinPostId,
        status: 'published',
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      logger.error({ error: errorMessage, userId, statusCode: error.response?.status }, 'LinkedIn publish failed');

      if (error.response?.status === 401) {
        return { success: false, error: 'LinkedIn authentication expired. Please reconnect.', status: 'failed' };
      }
      if (error.response?.status === 429) {
        return { success: false, error: 'LinkedIn rate limit exceeded. Try again later.', status: 'failed' };
      }
      if (error.response?.status === 403) {
        return { success: false, error: 'LinkedIn permission denied. Check w_member_social scope.', status: 'failed' };
      }

      return { success: false, error: errorMessage, status: 'failed' };
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const response = await axios.post(
      `${this.authUrl}/accessToken`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      }
    );
    return response.data;
  }

  async testConnection(userId: string): Promise<{ connected: boolean; profile?: any; error?: string }> {
    try {
      const connection = await LinkedInConnection.findOne({ userId, isConnected: true });
      if (!connection) {
        return { connected: false, error: 'No LinkedIn connection found' };
      }

      let accessToken = connection.getAccessToken();

      if (connection.isTokenExpired() && connection.refreshTokenEncrypted) {
        const refreshResult = await this.refreshAccessToken(connection.getRefreshToken());
        connection.setTokens(refreshResult.access_token, refreshResult.refresh_token, refreshResult.expires_in);
        await connection.save();
        accessToken = refreshResult.access_token;
      }

      const response = await axios.get(`${this.apiBase}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000,
      });

      return {
        connected: true,
        profile: {
          id: response.data.sub,
          name: response.data.name,
          email: response.data.email,
        },
      };
    } catch (error: any) {
      return { connected: false, error: error.message };
    }
  }
}

export const linkedinPublisher = new LinkedInPublisher();
