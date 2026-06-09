import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino();

export interface IndexDefinition {
  collection: string;
  key: Record<string, 1 | -1 | 'text'>;
  options?: mongoose.IndexOptions;
}

export const RECOMMENDED_INDEXES: IndexDefinition[] = [
  // Users
  { collection: 'users', key: { clerkId: 1 }, options: { unique: true } },
  { collection: 'users', key: { email: 1 }, options: { unique: true } },
  { collection: 'users', key: { subscriptionPlan: 1, isActive: 1 } },
  { collection: 'users', key: { automationMode: 1, lastActiveAt: -1 } },
  { collection: 'users', key: { onboardingStatus: 1 } },
  { collection: 'users', key: { lastActiveAt: -1 } },

  // LinkedIn Profiles
  { collection: 'linkedin_profiles', key: { userId: 1 }, options: { unique: true } },
  { collection: 'linkedin_profiles', key: { linkedinId: 1 }, options: { unique: true } },
  { collection: 'linkedin_profiles', key: { 'metadata.syncStatus': 1 } },
  { collection: 'linkedin_profiles', key: { industry: 1 } },
  { collection: 'linkedin_profiles', key: { 'summary.profileType': 1 } },

  // Brand DNA
  { collection: 'brand_dnas', key: { userId: 1, isActive: 1 } },
  { collection: 'brand_dnas', key: { userId: 1, status: 1, version: -1 } },
  { collection: 'brand_dnas', key: { archetype: 1 } },
  { collection: 'brand_dnas', key: { 'brandTerritory.keywords': 1 } },

  // Voice Profiles
  { collection: 'voice_profiles', key: { userId: 1 }, options: { unique: true } },
  { collection: 'voice_profiles', key: { confidence: -1 } },

  // Career Goals
  { collection: 'career_goals', key: { userId: 1, isActive: 1 } },
  { collection: 'career_goals', key: { primaryGoal: 1, status: 1 } },
  { collection: 'career_goals', key: { targetIndustries: 1 } },

  // Content Pillars
  { collection: 'content_pillars', key: { userId: 1, isActive: 1, rank: 1 } },
  { collection: 'content_pillars', key: { keywords: 1 } },

  // Content Strategies
  { collection: 'content_strategies', key: { userId: 1, isActive: 1 } },
  { collection: 'content_strategies', key: { userId: 1, status: 1, version: -1 } },

  // Content Calendar
  { collection: 'content_calendars', key: { userId: 1, date: -1, status: 1 } },
  { collection: 'content_calendars', key: { userId: 1, status: 1, date: 1 } },
  { collection: 'content_calendars', key: { status: 1, date: 1 } },
  { collection: 'content_calendars', key: { 'performance.engagementRate': -1 } },

  // Content Ideas
  { collection: 'content_ideas', key: { userId: 1, status: 1, confidence: -1 } },
  { collection: 'content_ideas', key: { keywords: 1 } },

  // Posts
  { collection: 'posts', key: { userId: 1, status: 1, createdAt: -1 } },
  { collection: 'posts', key: { userId: 1, contentPillarId: 1, status: 1 } },
  { collection: 'posts', key: { status: 1, 'schedule.scheduledAt': 1 } },
  { collection: 'posts', key: { 'scores.overall': -1 } },
  { collection: 'posts', key: { hashtags: 1 } },
  { collection: 'posts', key: { contentCalendarId: 1 } },
  { collection: 'posts', key: { opportunityId: 1 } },

  // Opportunities
  { collection: 'opportunities', key: { userId: 1, status: 1, score: -1 } },
  { collection: 'opportunities', key: { userId: 1, priority: 1, status: 1 } },
  { collection: 'opportunities', key: { type: 1, status: 1 } },
  { collection: 'opportunities', key: { score: -1 } },

  // Analytics Events (time-series)
  { collection: 'analytics_events', key: { userId: 1, timestamp: -1 } },
  { collection: 'analytics_events', key: { userId: 1, eventType: 1, timestamp: -1 } },
  { collection: 'analytics_events', key: { postId: 1, timestamp: -1 } },
  { collection: 'analytics_events', key: { eventType: 1, timestamp: -1 } },
  { collection: 'analytics_events', key: { timestamp: -1 }, options: { expireAfterSeconds: 7776000 } },

  // Analytics Aggregations
  { collection: 'analytics_aggregations', key: { userId: 1, period: 1, periodStart: -1 }, options: { unique: true } },
  { collection: 'analytics_aggregations', key: { period: 1, periodStart: -1 } },

  // Notifications
  { collection: 'notifications', key: { userId: 1, status: 1, createdAt: -1 } },
  { collection: 'notifications', key: { status: 1, createdAt: -1 } },
  { collection: 'notifications', key: { channel: 1, status: 1 } },

  // Chat Sessions
  { collection: 'chat_sessions', key: { userId: 1, lastMessageAt: -1 } },
  { collection: 'chat_sessions', key: { userId: 1, status: 1, lastMessageAt: -1 } },
  { collection: 'chat_sessions', key: { tokenCount: 1 } },

  // Audit Logs
  { collection: 'audit_logs', key: { userId: 1, timestamp: -1 } },
  { collection: 'audit_logs', key: { action: 1, timestamp: -1 } },
  { collection: 'audit_logs', key: { resourceType: 1, resourceId: 1 } },
  { collection: 'audit_logs', key: { 'actor.type': 1, timestamp: -1 } },
  { collection: 'audit_logs', key: { timestamp: -1 }, options: { expireAfterSeconds: 7776000 } },

  // Subscriptions
  { collection: 'subscriptions', key: { userId: 1 }, options: { unique: true } },
  { collection: 'subscriptions', key: { stripeCustomerId: 1, status: 1 } },
  { collection: 'subscriptions', key: { plan: 1, status: 1 } },
  { collection: 'subscriptions', key: { status: 1, currentPeriodEnd: 1 } },

  // LinkedIn Skills
  { collection: 'linkedin_skills', key: { profileId: 1, name: 1 }, options: { unique: true } },
  { collection: 'linkedin_skills', key: { profileId: 1, endorsements: -1 } },
  { collection: 'linkedin_skills', key: { name: 1 } },

  // LinkedIn Activity
  { collection: 'linkedin_activities', key: { profileId: 1, activityId: 1 }, options: { unique: true } },
  { collection: 'linkedin_activities', key: { profileId: 1, timestamp: -1 } },
  { collection: 'linkedin_activities', key: { type: 1, timestamp: -1 } },

  // Feature Flags
  { collection: 'feature_flags', key: { key: 1 }, options: { unique: true } },
];

export class IndexManager {
  async ensureIndexes(): Promise<{
    created: number;
    existing: number;
    errors: string[];
  }> {
    let created = 0;
    let existing = 0;
    const errors: string[] = [];

    for (const def of RECOMMENDED_INDEXES) {
      try {
        const collection = mongoose.connection.db?.collection(def.collection);
        if (!collection) {
          errors.push(`Collection ${def.collection} not found`);
          continue;
        }

        const existingIndexes = await collection.indexes();
        const indexName = Object.keys(def.key).join('_');

        const alreadyExists = existingIndexes.some(
          (idx) => idx.key && Object.keys(idx.key).length === Object.keys(def.key).length &&
            Object.entries(def.key).every(([k, v]) => (idx.key as any)[k] === v)
        );

        if (alreadyExists) {
          existing++;
          continue;
        }

        const options: any = { ...def.options, background: true };
        await collection.createIndex(def.key as any, options);
        created++;
        logger.info({ collection: def.collection, index: indexName }, 'Index created');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${def.collection}: ${message}`);
        logger.error({ collection: def.collection, error: message }, 'Failed to create index');
      }
    }

    return { created, existing, errors };
  }

  async getIndexStats(): Promise<
    Array<{
      collection: string;
      indexes: Array<{ name: string; key: Record<string, number>; size: number }>;
      totalIndexSize: number;
    }>
  > {
    const collections = await mongoose.connection.db?.listCollections().toArray() || [];
    const stats: Array<any> = [];

    for (const col of collections) {
      try {
        const indexes = await mongoose.connection.db!
          .collection(col.name)
          .indexInformation({ full: true });

        const indexArray = Object.entries(indexes).map(([name, spec]: [string, any]) => ({
          name,
          key: spec.key || {},
          size: spec.size || 0,
        }));

        const totalIndexSize = indexArray.reduce((s, i) => s + (i.size || 0), 0);
        stats.push({ collection: col.name, indexes: indexArray, totalIndexSize });
      } catch {
        // skip
      }
    }

    return stats;
  }

  async dropUnusedIndexes(): Promise<{ dropped: number; errors: string[] }> {
    let dropped = 0;
    const errors: string[] = [];

    const recommendedKeys = new Set(
      RECOMMENDED_INDEXES.map((def) => JSON.stringify(def.key))
    );

    const collections = await mongoose.connection.db?.listCollections().toArray() || [];

    for (const col of collections) {
      try {
        const indexes = await mongoose.connection.db!
          .collection(col.name)
          .indexes();

        for (const idx of indexes) {
          if (!idx.name || idx.name === '_id_') continue;
          const keyStr = JSON.stringify(idx.key);
          if (!recommendedKeys.has(keyStr)) {
            await mongoose.connection.db!
              .collection(col.name)
              .dropIndex(idx.name);
            dropped++;
            logger.info({ collection: col.name, index: idx.name }, 'Dropped unused index');
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${col.name}: ${message}`);
      }
    }

    return { dropped, errors };
  }
}

export const indexManager = new IndexManager();
export default indexManager;
