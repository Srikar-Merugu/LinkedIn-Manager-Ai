import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: (process.env.MONGO_URI || 'mongodb://localhost:27017/linkedin-intelligence').trim(),
  redisUri: (process.env.REDIS_URI || 'redis://localhost:6379').trim(),

  jwtSecret: (process.env.JWT_SECRET || 'dev-secret-change-in-production').trim(),
  jwtExpiry: (process.env.JWT_EXPIRY || '7d').trim(),

  encryptionKey: (process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!').trim(),

  linkedinClientId: (process.env.LINKEDIN_CLIENT_ID || '').trim(),
  linkedinClientSecret: (process.env.LINKEDIN_CLIENT_SECRET || '').trim(),
  linkedinRedirectUri: (process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/auth/linkedin/callback').trim(),
  linkedinScopes: (process.env.LINKEDIN_SCOPES || 'openid profile email w_member_social').trim(),

  clientUrl: (process.env.CLIENT_URL || 'http://localhost:3000').trim(),

  cacheTtl: parseInt(process.env.CACHE_TTL || '300', 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  syncInterval: parseInt(process.env.SYNC_INTERVAL || '3600000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
} as const;
