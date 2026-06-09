// Database Connection
export { connectDatabase } from '../config/database';

// Repositories
export {
  BaseRepository,
  UserRepository,
  PostRepository,
  CalendarRepository,
  ContentIdeaRepository,
  AnalyticsEventRepository,
  AnalyticsAggregationRepository,
  OpportunityRepository,
  userRepo,
  postRepo,
  calendarRepo,
  contentIdeaRepo,
  analyticsEventRepo,
  analyticsAggRepo,
  opportunityRepo,
} from './repositories';

// Services
export { DatabaseService, dbService } from './services/DatabaseService';
export { QueryService, queryService } from './services/QueryService';
export { IndexManager, indexManager, RECOMMENDED_INDEXES } from './services/IndexManager';

// Types
export * from '../types/database';
export * from '../types/events';
