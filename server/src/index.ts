import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { getRedisClient } from './config/redis';
import { CachingLayer } from './services/CachingLayer';
import { ErrorRecoverySystem } from './services/ErrorRecoverySystem';
import { BackgroundJobProcessor } from './services/BackgroundJobProcessor';
import { LinkedInService } from './services/linkedin/LinkedInService';
import { ProfileParser } from './services/linkedin/ProfileParser';
import { ProfileSyncService } from './services/linkedin/ProfileSyncService';
import { ScoringEngine } from './services/analysis/ScoringEngine';
import { ProfileAnalysisEngine } from './services/analysis/ProfileAnalysisEngine';
import { RecommendationEngine } from './services/analysis/RecommendationEngine';
import { createAuthRouter } from './routes/auth';
import { createLinkedInRouter } from './routes/linkedin';
import { createProfileRouter } from './routes/profile';
import { createAnalysisRouter } from './routes/analysis';
import { createOnboardingRouter } from './routes/onboarding';
import { createIntelligenceRouter } from './routes/intelligence';
import { createBrandRouter } from './routes/brand';
import { createWritingRouter } from './routes/writing';
import { createCareerRouter } from './routes/career';
import { createContentPillarRouter } from './routes/content-pillars';
import { createContentStrategyRouter } from './routes/content-strategy';
import { createContentOperationsRouter } from './routes/content-operations';
import { createOpportunityRouter } from './routes/opportunity';
import { createContentGenerationRouter } from './routes/content-generation';
import { createAIManagerRouter } from './routes/ai-manager';
import { createAnalyticsRouter } from './routes/analytics';
import { createAnalysisReportRouter } from './routes/analysis-report';
import { createLinkedInPublishingRouter } from './routes/linkedin-publishing';
import { createGoogleSheetsRouter } from './routes/google-sheets';
import { createDashboardRouter } from './routes/dashboard';
import { createContentIntelligenceRouter } from './routes/content-intelligence';
import { createContentChallengeRouter } from './routes/content-challenge';
import { createContentAnalyticsRouter } from './routes/content-analytics';
import { autoPublisher } from './services/scheduler/AutoPublisher';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const logger = pino();

export async function createApp(): Promise<express.Express> {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: env.clientUrl,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', apiLimiter);

  await connectDatabase(env.mongoUri);

  let redisClient = null;
  try {
    redisClient = getRedisClient(env.redisUri);
    await redisClient.connect();
    logger.info('Redis connected successfully');
  } catch (error) {
    logger.warn({ error }, 'Redis connection failed, running without cache');
  }

  const cachingLayer = new CachingLayer(redisClient, env.cacheTtl);
  const errorRecoverySystem = new ErrorRecoverySystem();
  const backgroundJobs = new BackgroundJobProcessor(env.redisUri);

  try {
    await backgroundJobs.initialize();
  } catch (error) {
    logger.warn({ error }, 'Background job processor failed to initialize, running without background jobs');
  }

  const linkedinService = new LinkedInService(errorRecoverySystem, cachingLayer);
  const profileParser = new ProfileParser();
  const syncService = new ProfileSyncService(linkedinService, profileParser, errorRecoverySystem);

  const scoringEngine = new ScoringEngine();
  const analysisEngine = new ProfileAnalysisEngine(scoringEngine);
  const recommendationEngine = new RecommendationEngine();

  app.use('/api/auth', authLimiter, createAuthRouter());
  app.use('/api/auth', authLimiter, createLinkedInRouter(linkedinService, syncService));
  app.use('/api/profile', createProfileRouter(linkedinService, syncService, cachingLayer));
  app.use(
    '/api/analysis',
    createAnalysisRouter(
      linkedinService,
      profileParser,
      scoringEngine,
      analysisEngine,
      recommendationEngine,
      cachingLayer
    )
  );

  app.use('/api/onboarding', createOnboardingRouter());
  app.use('/api/intelligence', createIntelligenceRouter());
  app.use('/api/brand', createBrandRouter());
  app.use('/api/writing', createWritingRouter());
  app.use('/api/career', createCareerRouter());
  app.use('/api/content-pillars', createContentPillarRouter());
  app.use('/api/content-strategy', createContentStrategyRouter());
  app.use('/api/content-operations', createContentOperationsRouter());
  app.use('/api/opportunity', createOpportunityRouter());
  app.use('/api/content-generation', createContentGenerationRouter());
  app.use('/api/ai-manager', createAIManagerRouter());
  app.use('/api/analytics', createAnalyticsRouter());
  app.use('/api/report', createAnalysisReportRouter());
  app.use('/api/publishing', createLinkedInPublishingRouter());
  app.use('/api/google', createGoogleSheetsRouter());
  app.use('/api/dashboard', createDashboardRouter());
  app.use('/api/content-intelligence', createContentIntelligenceRouter());
  app.use('/api/content-challenge', createContentChallengeRouter());
  app.use('/api/content-analytics', createContentAnalyticsRouter());

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        cache: redisClient !== null ? 'connected' : 'disabled',
        database: 'connected',
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createApp();

  app.listen(env.port, () => {
    logger.info(`LinkedIn Intelligence Engine running on port ${env.port}`);
    logger.info(`Environment: ${env.nodeEnv}`);
    logger.info(`Health check: http://localhost:${env.port}/api/health`);

    // Start auto-publisher scheduler
    autoPublisher.start();
  });
}

if (require.main === module) {
  bootstrap().catch((error) => {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  });
}
