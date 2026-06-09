export { BaseRepository } from './BaseRepository';
export { UserRepository } from './UserRepository';
export { PostRepository, CalendarRepository, ContentIdeaRepository } from './ContentRepository';
export { AnalyticsEventRepository, AnalyticsAggregationRepository } from './AnalyticsRepository';
export { OpportunityRepository } from './OpportunityRepository';

// Singleton instances
import { UserRepository } from './UserRepository';
import { PostRepository, CalendarRepository, ContentIdeaRepository } from './ContentRepository';
import { AnalyticsEventRepository, AnalyticsAggregationRepository } from './AnalyticsRepository';
import { OpportunityRepository } from './OpportunityRepository';

export const userRepo = new UserRepository();
export const postRepo = new PostRepository();
export const calendarRepo = new CalendarRepository();
export const contentIdeaRepo = new ContentIdeaRepository();
export const analyticsEventRepo = new AnalyticsEventRepository();
export const analyticsAggRepo = new AnalyticsAggregationRepository();
export const opportunityRepo = new OpportunityRepository();
