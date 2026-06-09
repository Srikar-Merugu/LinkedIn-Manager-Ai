import { Router, Request, Response } from 'express';
import pino from 'pino';
import { LinkedInService } from '../services/linkedin/LinkedInService';

const logger = pino();

export function createAuthRouter(linkedinService: LinkedInService): Router {
  const router = Router();

  router.get('/linkedin', (_req: Request, res: Response) => {
    const authUrl = linkedinService.getAuthorizationUrl();
    res.json({ url: authUrl });
  });

  router.get('/linkedin/callback', async (req: Request, res: Response) => {
    try {
      const { code, error } = req.query;

      if (error) {
        logger.warn({ error }, 'LinkedIn OAuth error');
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?error=${error}`);
      }

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
      }

      const tokenResponse = await linkedinService.exchangeCodeForToken(code);
      const profile = await linkedinService.getProfile(tokenResponse.access_token);

      const redirectUrl = new URL(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard/intelligence`);
      redirectUrl.searchParams.set('token', tokenResponse.access_token);
      redirectUrl.searchParams.set('linkedinId', profile.sub);
      redirectUrl.searchParams.set('expiresIn', String(tokenResponse.expires_in));

      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error({ error }, 'LinkedIn OAuth callback failed');
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/dashboard?error=linkedin_auth_failed`);
    }
  });

  router.post('/token', async (req: Request, res: Response) => {
    try {
      const { code } = req.body;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
      }

      const tokenResponse = await linkedinService.exchangeCodeForToken(code);
      const profile = await linkedinService.getProfile(tokenResponse.access_token);

      res.json({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
        profile,
      });
    } catch (error) {
      logger.error({ error }, 'Token exchange failed');
      res.status(500).json({ error: 'Token exchange failed' });
    }
  });

  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken || typeof refreshToken !== 'string') {
        return res.status(400).json({ error: 'Missing refresh token' });
      }

      const tokenResponse = await linkedinService.refreshAccessToken(refreshToken);

      res.json({
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
      });
    } catch (error) {
      logger.error({ error }, 'Token refresh failed');
      res.status(500).json({ error: 'Token refresh failed' });
    }
  });

  router.post('/revoke', async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body;

      if (!accessToken || typeof accessToken !== 'string') {
        return res.status(400).json({ error: 'Missing access token' });
      }

      await linkedinService.revokeToken(accessToken);
      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, 'Token revocation failed');
      res.status(500).json({ error: 'Token revocation failed' });
    }
  });

  return router;
}
