export type DomainEventType =
  | 'user.created'
  | 'user.onboarding.completed'
  | 'user.linkedin.connected'
  | 'user.resume.uploaded'
  | 'user.github.connected'
  | 'user.goals.updated'
  | 'user.automation.changed'
  | 'user.subscription.changed'
  | 'intelligence.profile.synced'
  | 'intelligence.report.generated'
  | 'intelligence.score.updated'
  | 'brand.dna.generated'
  | 'brand.dna.updated'
  | 'brand.voice.created'
  | 'brand.voice.updated'
  | 'brand.pillars.created'
  | 'strategy.created'
  | 'strategy.updated'
  | 'strategy.calendar.generated'
  | 'strategy.calendar.synced'
  | 'content.generated'
  | 'content.quality.checked'
  | 'content.queued'
  | 'content.approved'
  | 'content.rejected'
  | 'content.scheduled'
  | 'content.published'
  | 'content.failed'
  | 'content.engagement.updated'
  | 'opportunity.discovered'
  | 'opportunity.scored'
  | 'opportunity.expired'
  | 'analytics.daily.aggregated'
  | 'analytics.weekly.report.generated'
  | 'analytics.performance.updated'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.cancelled'
  | 'subscription.entitlements.changed';

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  userId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  correlationId?: string;
  source: string;
  version: number;
}
