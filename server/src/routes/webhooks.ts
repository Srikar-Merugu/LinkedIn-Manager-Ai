import { Router, Request, Response } from 'express';
import pino from 'pino';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/backend';
import { User } from '../models/identity/User';
import { OnboardingState } from '../models/onboarding/OnboardingState';
import { authEventService } from '../services/auth/AuthEventService';

const logger = pino();

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export function createWebhookRouter(): Router {
  const router = Router();

  router.post('/clerk', expressRawBody, async (req: Request, res: Response) => {
    try {
      const svixId = req.headers['svix-id'] as string;
      const svixTimestamp = req.headers['svix-timestamp'] as string;
      const svixSignature = req.headers['svix-signature'] as string;

      if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(400).json({ error: 'Missing Svix headers' });
      }

      const wh = new Webhook(webhookSecret);
      let evt: WebhookEvent;

      try {
        evt = wh.verify(
          JSON.stringify(req.body),
          { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature }
        ) as WebhookEvent;
      } catch {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const eventType = evt.type as string;
      logger.info({ eventType }, 'Clerk webhook received');

      switch (eventType) {
        case 'user.created':
          await handleUserCreated(evt.data as any, req);
          break;
        case 'user.updated':
          await handleUserUpdated(evt.data as any);
          break;
        case 'user.deleted':
          await handleUserDeleted(evt.data as any);
          break;
        case 'session.created':
          await handleSessionCreated(evt.data as any, req);
          break;
        case 'session.removed':
          await handleSessionRemoved(evt.data as any);
          break;
        case 'user.oauth_account.created':
        case 'oauth_account.created':
          await handleOAuthAccountCreated(evt.data as any);
          break;
        default:
          logger.debug({ eventType }, 'Unhandled webhook event');
      }

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Webhook processing failed');
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return router;
}

async function handleUserCreated(data: any, req: Request): Promise<void> {
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address || '';
  const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || email.split('@')[0];
  const avatar = data.image_url || '';

  let user = await User.findOne({ clerkId });
  if (user) {
    user.fullName = fullName;
    user.avatar = avatar || user.avatar;
    await user.save();
    return;
  }

  user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    user.clerkId = clerkId;
    user.fullName = fullName;
    user.avatar = avatar || user.avatar;
    await user.save();
    return;
  }

  user = await User.create({
    clerkId,
    email: email.toLowerCase(),
    fullName,
    avatar,
    lastActiveAt: new Date(),
  });

  await OnboardingState.create({
    userId: user._id,
    clerkId,
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
    careerGoals: [],
    analysisStatus: 'pending',
    analysisProgress: 0,
    analysisLog: [],
    brandDnaGenerated: false,
    voiceSamplesCount: 0,
    startedAt: new Date(),
  });

  await authEventService.initializeUserPreferences(clerkId, user._id.toString());

  await authEventService.logAuthEvent({
    userId: user._id.toString(),
    clerkId,
    eventType: 'signup',
    provider: 'unknown',
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    success: true,
    metadata: { source: 'clerk_webhook', email },
  });

  logger.info({ clerkId, email }, 'User created via Clerk webhook');
}

async function handleUserUpdated(data: any): Promise<void> {
  const clerkId = data.id;
  const email = data.email_addresses?.[0]?.email_address || '';
  const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim() || email.split('@')[0];
  const avatar = data.image_url || '';

  await User.findOneAndUpdate(
    { clerkId },
    {
      email: email.toLowerCase(),
      fullName,
      avatar,
      lastActiveAt: new Date(),
    }
  );
}

async function handleUserDeleted(data: any): Promise<void> {
  const clerkId = data.id;
  await User.findOneAndUpdate({ clerkId }, { isDeleted: true, deletedAt: new Date() });
  logger.info({ clerkId }, 'User deleted via Clerk webhook');
}

async function handleSessionCreated(data: any, req: Request): Promise<void> {
  const userId = data.user_id;
  const clerkSessionId = data.id;

  const user = await User.findOne({ clerkId: userId });
  if (!user) return;

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  await authEventService.trackSession({
    userId: user._id.toString(),
    clerkId: userId,
    clerkSessionId,
    ip,
    userAgent,
  });

  await authEventService.logAuthEvent({
    userId: user._id.toString(),
    clerkId: userId,
    eventType: 'session_created',
    provider: 'unknown',
    ip,
    userAgent,
    success: true,
    sessionId: clerkSessionId,
  });

  await authEventService.logLoginHistory({
    userId: user._id.toString(),
    clerkId: userId,
    provider: 'email',
    ip,
    userAgent,
    success: true,
    sessionId: clerkSessionId,
  });

  await authEventService.detectSuspiciousActivity({ userId: user._id.toString(), ip, userAgent });

  user.lastActiveAt = new Date();
  await user.save();
}

async function handleSessionRemoved(data: any): Promise<void> {
  const clerkSessionId = data.id;
  await authEventService.endSession(clerkSessionId);
}

async function handleOAuthAccountCreated(data: any): Promise<void> {
  const clerkId = data.user_id;
  const provider = data.provider as string;
  const providerAccountId = data.provider_user_id;

  const providerMap: Record<string, 'linkedin' | 'google' | 'github'> = {
    oauth_linkedin: 'linkedin',
    oauth_google: 'google',
    oauth_github: 'github',
  };

  const mappedProvider = providerMap[provider];
  if (!mappedProvider) return;

  const user = await User.findOne({ clerkId });
  if (!user) return;

  if (mappedProvider === 'google') user.googleId = providerAccountId;
  if (mappedProvider === 'github') user.githubId = providerAccountId;
  await user.save();

  await authEventService.logAuthEvent({
    userId: user._id.toString(),
    clerkId,
    eventType: `oauth_${mappedProvider}` as any,
    provider: mappedProvider,
    ip: '0.0.0.0',
    userAgent: 'clerk_webhook',
    success: true,
    metadata: { provider, providerAccountId },
  });
}

function expressRawBody(req: Request, _res: Response, next: () => void): void {
  if (req.body && typeof req.body === 'object') {
    next();
    return;
  }
  let data = '';
  req.on('data', (chunk: string) => { data += chunk; });
  req.on('end', () => {
    try {
      req.body = JSON.parse(data);
    } catch {
      req.body = {};
    }
    next();
  });
}
