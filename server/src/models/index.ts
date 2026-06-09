// Identity
export { User, IUser } from './identity/User';
export { Subscription, ISubscription } from './identity/Subscription';

// Intelligence (existing - kept for backward compatibility)
export { LinkedInProfile, ILinkedInProfile, ILinkedInExperience, ILinkedInEducation } from './LinkedInProfile';
export { LinkedInSkill, ILinkedInSkill } from './LinkedInSkill';
export { LinkedInActivity, ILinkedInActivity } from './LinkedInActivity';
export { LinkedInProject, ILinkedInProject } from './LinkedInProject';
export { LinkedInCertificate, ILinkedInCertificate } from './LinkedInCertificate';

// Brand
export { BrandDNA, IBrandDNA, IBrandDNAVersion, IPositioning, IUniquenessFactor, IContentDNATopic, IGrowthMilestone, IBrandRule } from './brand/BrandDNA';
export { BrandSnapshot, IBrandSnapshot } from './brand/BrandSnapshot';
export { BrandPillar, IContentPillar as IBrandPillarEntry, IPillarMetrics } from './brand/BrandPillar';
export { StoryBank, IStoryBank, IStoryEntry, StoryType } from './brand/StoryBank';
export { BrandRecommendation, IBrandRecommendation, IBrandRecommendationEntry } from './brand/BrandRecommendation';
export { VoiceProfile, IVoiceProfile } from './brand/VoiceProfile';
export { CareerGoal, ICareerGoal, ICareerMilestone, GoalType } from './brand/CareerGoal';

// Strategy
export { ContentPillar, IContentPillar } from './strategy/ContentPillar';
export { ContentStrategy, IContentStrategy, IStrategyWeek } from './strategy/ContentStrategy';
export { ContentCalendar, ICalendarEntry } from './strategy/ContentCalendar';

// Content
export { ContentIdea, IContentIdea } from './content/ContentIdea';
export { Post, IPost, IPostVariant } from './content/Post';
export { Opportunity, IOpportunity } from './content/Opportunity';

// Analytics
export { AnalyticsEvent, IAnalyticsEvent } from './analytics/AnalyticsEvent';
export { AnalyticsAggregation, IAnalyticsAggregation, IMetricValue } from './analytics/AnalyticsAggregation';

// System
export { Notification, INotification } from './system/Notification';
export { ChatSession, IChatSession, IChatMessage } from './system/ChatSession';
export { AuditLog, IAuditLog } from './system/AuditLog';
export { FeatureFlag, IFeatureFlag } from './system/FeatureFlag';

// Onboarding
export { OnboardingState, IOnboardingState, IStepData, IConnectedSource, ILinkedInSource, IGitHubSource, IResumeSource, IPortfolioSource } from './onboarding/OnboardingState';
export { VoiceSample, IVoiceSample, VoiceSampleType } from './onboarding/VoiceSample';
export { ResumeData, IResumeData, IResumeEntry, IResumeEducation } from './onboarding/ResumeData';
export { GitHubData, IGitHubData, IGitHubRepo } from './onboarding/GitHubData';
export { PortfolioData, IPortfolioData, IPortfolioEntry } from './onboarding/PortfolioData';

// Writing DNA
export { WritingDNA, IWritingDNA, IToneDimension, IHookPattern, ICTAPattern, IContentFormatPreference, IStorytellingBlueprint, IEmotionalProfile } from './writing/WritingDNA';
export { WritingSnapshot, IWritingSnapshot } from './writing/WritingSnapshot';
export { VoiceScore, IVoiceScore } from './writing/VoiceScore';

// Intelligence
export { ProfileSnapshot, IProfileSnapshot } from './intelligence/ProfileSnapshot';
export { ProfileScore, IProfileScore, IScoreDimensionSnapshot } from './intelligence/ProfileScore';
export { OpportunityEvent, IOpportunityEvent } from './intelligence/OpportunityEvent';
export { ExpertiseProfile, IExpertiseProfile, IExpertiseAreaSchema } from './intelligence/ExpertiseProfile';
export { IntelligenceReport, IIntelligenceReport } from './intelligence/IntelligenceReport';
