export type AutomationMode = 'manual' | 'approval' | 'autonomous';

export type OnboardingStatus =
  | 'not_started'
  | 'linkedin_connected'
  | 'resume_uploaded'
  | 'github_connected'
  | 'portfolio_connected'
  | 'goals_set'
  | 'content_experience_set'
  | 'voice_training_complete'
  | 'ai_analysis_complete'
  | 'brand_dna_generated'
  | 'complete';

export type OnboardingStep =
  | 'welcome'
  | 'connect_linkedin'
  | 'upload_resume'
  | 'connect_github'
  | 'connect_portfolio'
  | 'career_goals'
  | 'content_experience'
  | 'voice_training'
  | 'ai_analysis'
  | 'results';

export type SubscriptionPlan = 'free' | 'starter' | 'professional' | 'growth' | 'elite';

export type PostStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'failed' | 'archived';

export type PostFormat = 'post' | 'article' | 'carousel' | 'thread' | 'poll' | 'video';

export type ContentSource = 'generated' | 'manual' | 'opportunity' | 'recycled' | 'ai_suggested';

export type OpportunityType =
  | 'trending_topic'
  | 'content_gap'
  | 'job_posting'
  | 'network_event'
  | 'certification'
  | 'project_idea'
  | 'collaboration'
  | 'industry_news';

export type OpportunityStatus = 'new' | 'analyzed' | 'actioned' | 'dismissed' | 'expired';

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export type NotificationChannel = 'in_app' | 'email' | 'push';

export type NotificationType =
  | 'content_ready'
  | 'opportunity_found'
  | 'weekly_report'
  | 'strategy_updated'
  | 'publish_success'
  | 'publish_failed'
  | 'milestone_reached'
  | 'ai_input_needed'
  | 'subscription';

export type ChatRole = 'user' | 'assistant' | 'system';

export type AuditAction =
  | 'content.generated'
  | 'content.approved'
  | 'content.rejected'
  | 'content.published'
  | 'strategy.created'
  | 'strategy.updated'
  | 'brand.dna.regenerated'
  | 'voice.updated'
  | 'opportunity.actioned'
  | 'settings.changed'
  | 'automation.changed'
  | 'subscription.changed';

export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
