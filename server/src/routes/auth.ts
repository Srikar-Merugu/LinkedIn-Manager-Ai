import { Router, Request, Response } from 'express';
import pino from 'pino';
import axios from 'axios';
import { env } from '../config/env';
import { User } from '../models/identity/User';
import { OnboardingState } from '../models/onboarding/OnboardingState';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken, setAuthCookie, clearAuthCookie, getTokenFromReq, verifyToken } from '../utils/jwt';
import { LinkedInService } from '../services/linkedin/LinkedInService';

const logger = pino();

export function createAuthRouter(linkedinService?: LinkedInService): Router {
  const router = Router();

  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, password, fullName } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Email, password, and full name are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await hashPassword(password);
      const user = await User.create({
        email: email.toLowerCase(),
        passwordHash,
        fullName,
      });

      await OnboardingState.create({
        userId: user._id,
        clerkId: user._id.toString(),
        status: 'in_progress',
        currentStep: 'welcome',
        completedSteps: [],
        stepData: [],
        connectedSources: {
          linkedin: { connected: false },
          github: { connected: false },
          resume: { connected: false },
          portfolio: { connected: false },
        },
      });

      const token = signToken({ userId: user._id.toString(), email: user.email });
      setAuthCookie(res, token);

      res.status(201).json({
        user: { id: user._id, email: user.email, fullName: user.fullName },
      });
    } catch (error) {
      logger.error({ error }, 'Registration failed');
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      user.lastActiveAt = new Date();
      await user.save();

      const token = signToken({ userId: user._id.toString(), email: user.email });
      setAuthCookie(res, token);

      res.json({
        user: { id: user._id, email: user.email, fullName: user.fullName, avatar: user.avatar },
      });
    } catch (error) {
      logger.error({ error }, 'Login failed');
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.post('/logout', (_req: Request, res: Response) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  router.get('/me', async (req: Request, res: Response) => {
    try {
      const token = getTokenFromReq(req);
      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const payload = verifyToken(token);
      if (!payload) {
        clearAuthCookie(res);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      const user = await User.findById(payload.userId).select('-passwordHash');
      if (!user) {
        clearAuthCookie(res);
        return res.status(401).json({ error: 'User not found' });
      }

      res.json({
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          onboardingStatus: user.onboardingStatus,
          subscriptionPlan: user.subscriptionPlan,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Get user failed');
      res.status(500).json({ error: 'Server error' });
    }
  });

  // LinkedIn OAuth
  if (linkedinService) {
    router.get('/linkedin', (_req: Request, res: Response) => {
      const authUrl = linkedinService!.getAuthorizationUrl();
      res.json({ url: authUrl });
    });

    router.get('/linkedin/callback', async (req: Request, res: Response) => {
      try {
        const { code, error, state } = req.query;
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

        if (error) {
          logger.warn({ error }, 'LinkedIn OAuth error');
          return res.redirect(`${clientUrl}/sign-in?error=linkedin_auth_failed`);
        }

        if (!code || typeof code !== 'string') {
          return res.status(400).json({ error: 'Missing authorization code' });
        }

        const tokenResponse = await linkedinService!.exchangeCodeForToken(code);
        const profile = await linkedinService!.getProfile(tokenResponse.access_token);

        // Parse LinkedIn profile
        const linkedinId = profile.sub;
        const email = profile.email || `${linkedinId}@linkedin.com`;
        const fullName = profile.name || profile.given_name || 'LinkedIn User';
        const avatar = profile.picture;

        // Find or create user by LinkedIn ID or email
        let user = await User.findOne({
          $or: [{ email }, { clerkId: linkedinId }],
        });

        if (user) {
          user.fullName = fullName;
          if (avatar) user.avatar = avatar;
          user.lastActiveAt = new Date();
          await user.save();
        } else {
          user = await User.create({
            email,
            fullName,
            avatar,
            clerkId: linkedinId,
          });

          await OnboardingState.create({
            userId: user._id,
            clerkId: linkedinId,
            status: 'in_progress',
            currentStep: 'connect_linkedin',
            completedSteps: [],
            stepData: [],
            connectedSources: {
              linkedin: { connected: true, profileId: linkedinId, accessToken: tokenResponse.access_token, syncedAt: new Date() },
              github: { connected: false },
              resume: { connected: false },
              portfolio: { connected: false },
            },
          });
        }

        const jwtToken = signToken({ userId: user._id.toString(), email: user.email });
        setAuthCookie(res, jwtToken);

        res.redirect(`${clientUrl}/onboarding`);
      } catch (error) {
        logger.error({ error }, 'LinkedIn OAuth callback failed');
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        res.redirect(`${clientUrl}/sign-in?error=linkedin_auth_failed`);
      }
    });
  }

  // Google OAuth
  router.get('/google', (_req: Request, res: Response) => {
    const params = new URLSearchParams({
      client_id: env.google.clientId,
      redirect_uri: env.google.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  router.get('/google/callback', async (req: Request, res: Response) => {
    try {
      const { code, error } = req.query;
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

      if (error) {
        return res.redirect(`${clientUrl}/sign-in?error=google_auth_failed`);
      }

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
      }

      // Exchange code for token
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        code,
        client_id: env.google.clientId,
        client_secret: env.google.clientSecret,
        redirect_uri: env.google.redirectUri,
        grant_type: 'authorization_code',
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { id_token, access_token } = tokenRes.data;

      // Get user info from Google
      const userInfoRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { id: googleId, email, name, picture } = userInfoRes.data;

      let user = await User.findOne({
        $or: [{ googleId }, { email }],
      });

      if (user) {
        user.googleId = googleId;
        user.fullName = user.fullName || name;
        if (picture) user.avatar = picture;
        user.lastActiveAt = new Date();
        await user.save();
      } else {
        user = await User.create({
          email: email || `${googleId}@google.com`,
          fullName: name || 'Google User',
          avatar: picture,
          googleId,
        });

        await OnboardingState.create({
          userId: user._id,
          clerkId: user._id.toString(),
          status: 'in_progress',
          currentStep: 'welcome',
          completedSteps: [],
          stepData: [],
          connectedSources: {
            linkedin: { connected: false },
            github: { connected: false },
            resume: { connected: false },
            portfolio: { connected: false },
          },
        });
      }

      const jwtToken = signToken({ userId: user._id.toString(), email: user.email });
      setAuthCookie(res, jwtToken);

      res.redirect(`${clientUrl}/onboarding`);
    } catch (error) {
      logger.error({ error }, 'Google OAuth callback failed');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/sign-in?error=google_auth_failed`);
    }
  });

  // GitHub OAuth
  router.get('/github', (_req: Request, res: Response) => {
    const params = new URLSearchParams({
      client_id: env.github.clientId,
      redirect_uri: env.github.redirectUri,
      scope: 'read:user user:email',
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  });

  router.get('/github/callback', async (req: Request, res: Response) => {
    try {
      const { code, error } = req.query;
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

      if (error) {
        return res.redirect(`${clientUrl}/sign-in?error=github_auth_failed`);
      }

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ error: 'Missing authorization code' });
      }

      // Exchange code for token
      const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
        client_id: env.github.clientId,
        client_secret: env.github.clientSecret,
        code,
        redirect_uri: env.github.redirectUri,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const { access_token } = tokenRes.data;

      // Get user info from GitHub
      const [userRes, emailsRes] = await Promise.all([
        axios.get('https://api.github.com/user', {
          headers: { Authorization: `Bearer ${access_token}` },
        }),
        axios.get('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${access_token}` },
        }),
      ]);

      const githubUser = userRes.data;
      const emails = emailsRes.data as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primaryEmail = emails.find((e) => e.primary)?.email || emails[0]?.email || `${githubUser.id}@github.com`;

      let user = await User.findOne({
        $or: [{ githubId: String(githubUser.id) }, { email: primaryEmail }],
      });

      if (user) {
        user.githubId = String(githubUser.id);
        user.fullName = user.fullName || githubUser.name || githubUser.login;
        if (githubUser.avatar_url) user.avatar = githubUser.avatar_url;
        user.lastActiveAt = new Date();
        await user.save();
      } else {
        user = await User.create({
          email: primaryEmail,
          fullName: githubUser.name || githubUser.login || 'GitHub User',
          avatar: githubUser.avatar_url,
          githubId: String(githubUser.id),
        });

        await OnboardingState.create({
          userId: user._id,
          clerkId: user._id.toString(),
          status: 'in_progress',
          currentStep: 'welcome',
          completedSteps: [],
          stepData: [],
          connectedSources: {
            linkedin: { connected: false },
            github: { connected: true, username: githubUser.login, repos: githubUser.public_repos },
            resume: { connected: false },
            portfolio: { connected: false },
          },
        });
      }

      const jwtToken = signToken({ userId: user._id.toString(), email: user.email });
      setAuthCookie(res, jwtToken);

      res.redirect(`${clientUrl}/onboarding`);
    } catch (error) {
      logger.error({ error }, 'GitHub OAuth callback failed');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/sign-in?error=github_auth_failed`);
    }
  });

  return router;
}
