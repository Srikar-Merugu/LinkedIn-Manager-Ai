export interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
}

export interface LinkedInProfileResponse {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  email?: string;
  email_verified?: boolean;
}

export interface LinkedInUserProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  vanityName?: string;
  profilePicture?: string;
  about?: string;
  email?: string;
  location?: string;
  industry?: string;
  experience: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: LinkedInSkill[];
  certifications: LinkedInCertification[];
  projects: LinkedInProject[];
  activity: LinkedInActivity[];
}

export interface LinkedInExperience {
  title: string;
  company: string;
  companyLogo?: string;
  companyUrl?: string;
  location?: string;
  description?: string;
  startDate?: LinkedInDate;
  endDate?: LinkedInDate;
  currentlyWorking?: boolean;
  employmentType?: string;
  industry?: string;
  durationInMonths?: number;
}

export interface LinkedInEducation {
  school: string;
  schoolLogo?: string;
  degree?: string;
  fieldOfStudy?: string;
  grade?: string;
  description?: string;
  startDate?: LinkedInDate;
  endDate?: LinkedInDate;
  activities?: string;
}

export interface LinkedInSkill {
  name: string;
  endorsements?: number;
  isTopSkill?: boolean;
  category?: string;
}

export interface LinkedInCertification {
  name: string;
  issuingOrganization: string;
  authority?: string;
  licenseNumber?: string;
  url?: string;
  issueDate?: LinkedInDate;
  expirationDate?: LinkedInDate;
  doesNotExpire?: boolean;
}

export interface LinkedInProject {
  title: string;
  description?: string;
  url?: string;
  members?: string[];
  startDate?: LinkedInDate;
  endDate?: LinkedInDate;
  currentlyWorking?: boolean;
}

export interface LinkedInActivity {
  type: 'post' | 'repost' | 'comment' | 'reaction' | 'article';
  content?: string;
  url?: string;
  timestamp: Date;
  engagement?: {
    likes: number;
    comments: number;
    shares: number;
  };
}

export interface LinkedInDate {
  month?: number;
  year: number;
  day?: number;
}

export interface ParsedProfileResult {
  profile: LinkedInUserProfile;
  summary: {
    totalExperienceYears: number;
    totalSkills: number;
    totalCertifications: number;
    totalProjects: number;
    totalActivities: number;
    careerStabilityScore: number;
    skillRelevanceScore: number;
  };
}

export interface IntelligenceReport {
  userId: string;
  profileId: string;
  generatedAt: Date;
  scores: {
    profile: ProfileScore;
    branding: BrandingScore;
    visibility: VisibilityScore;
    opportunity: OpportunityScore;
    contentReadiness: ContentReadinessScore;
  };
  analysis: ProfileAnalysis;
  recommendations: Recommendation[];
  contentOpportunities: ContentOpportunity[];
  missingOpportunities: MissingOpportunity[];
}

export interface ProfileScore {
  overall: number;
  completeness: number;
  headline: number;
  about: number;
  experience: number;
  education: number;
  skills: number;
  certifications: number;
  projects: number;
  featured: number;
  activity: number;
  breakdown: ScoreBreakdownItem[];
}

export interface BrandingScore {
  overall: number;
  headlineClarity: number;
  personalBranding: number;
  valueProposition: number;
  keywordOptimization: number;
  storytelling: number;
  breakdown: ScoreBreakdownItem[];
}

export interface VisibilityScore {
  overall: number;
  searchability: number;
  contentFrequency: number;
  engagement: number;
  networkGrowth: number;
  profileViews: number;
  breakdown: ScoreBreakdownItem[];
}

export interface OpportunityScore {
  overall: number;
  careerGrowth: number;
  contentPotential: number;
  networking: number;
  skillDevelopment: number;
  marketPosition: number;
  breakdown: ScoreBreakdownItem[];
}

export interface ContentReadinessScore {
  overall: number;
  topicClarity: number;
  expertiseDepth: number;
  contentHistory: number;
  engagementPotential: number;
  consistency: number;
  breakdown: ScoreBreakdownItem[];
}

export interface ScoreBreakdownItem {
  label: string;
  score: number;
  maxScore: number;
  weight: number;
  description?: string;
}

export interface ProfileAnalysis {
  strengths: AnalysisItem[];
  weaknesses: AnalysisItem[];
  summary: string;
  careerStage: CareerStage;
  industryAlignment: number;
  skillGaps: SkillGap[];
  experienceQuality: ExperienceQuality;
}

export interface AnalysisItem {
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  score: number;
  evidence: string[];
}

export interface SkillGap {
  skill: string;
  importance: 'critical' | 'recommended' | 'optional';
  relevance: number;
  reason: string;
}

export interface ExperienceQuality {
  relevanceScore: number;
  progressionScore: number;
  consistencyScore: number;
  descriptionQualityScore: number;
  overall: number;
}

export interface Recommendation {
  id: string;
  type: 'profile' | 'content' | 'networking' | 'skills' | 'branding';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short-term' | 'long-term';
  metrics: {
    current: number;
    target: number;
  };
}

export interface MissingOpportunity {
  id: string;
  category: string;
  title: string;
  description: string;
  potentialImpact: string;
  effortToFix: 'low' | 'medium' | 'high';
  revenuePotential?: string;
}

export type CareerStage =
  | 'student'
  | 'entry-level'
  | 'mid-level'
  | 'senior'
  | 'leadership'
  | 'executive'
  | 'founder'
  | 'freelancer'
  | 'career-transition'
  | 'returning';

export type ProfileType =
  | 'standard'
  | 'student'
  | 'founder'
  | 'freelancer'
  | 'influencer'
  | 'executive'
  | 'recruiter';

export type ExpertiseLevel = 'primary' | 'secondary' | 'emerging' | 'hidden';

export type OpportunityCategory = 'teach' | 'document' | 'debate' | 'share_experience' | 'build_authority';

export type GapCategory = 'missing_section' | 'weak_headline' | 'incomplete_experience' | 'weak_skills' | 'missing_certifications' | 'missing_featured' | 'inconsistent_activity';

export type ChangeType = 'headline' | 'about' | 'experience_added' | 'experience_removed' | 'experience_updated' | 'skill_added' | 'certification_added' | 'project_added' | 'education_added' | 'new_post' | 'profile_picture' | 'position_change';

export interface ScoreDimension {
  current: number;
  previous?: number;
  reasoning: string;
  recommendations: string[];
  breakdown: ScoreBreakdownItem[];
}

export interface ExpandedIntelligenceReport {
  userId: string;
  profileId: string;
  generatedAt: Date;
  scores: {
    profileCompleteness: ScoreDimension;
    personalBranding: ScoreDimension;
    expertise: ScoreDimension;
    authority: ScoreDimension;
    visibility: ScoreDimension;
    opportunity: ScoreDimension;
    contentReadiness: ScoreDimension;
    careerGrowth: ScoreDimension;
  };
  identity: ProfessionalIdentity;
  expertise: ExpertiseAnalysis;
  contentOpportunities: ContentOpportunity[];
  gaps: ProfileGap[];
  career: CareerIntelligence;
  changes: ProfileChange[];
  recommendations: Recommendation[];
  raw: {
    totalExperienceYears: number;
    totalSkills: number;
    totalCertifications: number;
    totalProjects: number;
    totalActivities: number;
    totalPosts: number;
    careerStabilityScore: number;
  };
}

export interface ProfessionalIdentity {
  currentRole: string;
  careerStage: CareerStage;
  profileType: ProfileType;
  industry: string;
  technicalSkills: string[];
  softSkills: string[];
  domainExpertise: string[];
  professionalInterests: string[];
  audienceType: string;
  growthDirection: string;
  potentialCareerPaths: string[];
  detectedRole: string;
  roleConfidence: number;
  summary: string;
}

export interface ExpertiseAnalysis {
  primary: ExpertiseArea[];
  secondary: ExpertiseArea[];
  emerging: ExpertiseArea[];
  hidden: ExpertiseArea[];
  confidence: number;
  summary: string;
}

export interface ExpertiseArea {
  name: string;
  confidence: number;
  evidence: string[];
  yearsExperience: number;
  relatedSkills: string[];
  contentIdeas: string[];
}

export interface ContentOpportunity {
  id: string;
  category?: OpportunityCategory;
  topic: string;
  title?: string;
  hook?: string;
  angle?: string;
  format: 'post' | 'article' | 'carousel' | 'thread' | 'poll' | 'video';
  reasoning?: string;
  reason?: string;
  confidence?: number;
  targetAudience?: string;
  suggestedHook?: string;
  suggestedCTA?: string;
  impact?: number;
  authority?: number;
  engagementPotential?: number;
  careerAlignment?: number;
  overallScore?: number;
  effort?: 'low' | 'medium' | 'high';
}

export interface ProfileGap {
  category: GapCategory;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  impact: string;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
}

export interface CareerIntelligence {
  currentPosition: string;
  desiredPosition: string;
  growthPaths: CareerPath[];
  skillGaps: CareerSkillGap[];
  opportunityGaps: string[];
  networkingOpportunities: string[];
  growthReport: string;
}

export interface CareerPath {
  title: string;
  probability: number;
  timeframe: string;
  requiredSkills: string[];
  recommendedContent: string[];
}

export interface CareerSkillGap {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  importance: 'critical' | 'recommended' | 'optional';
  learningResources: string[];
}

export interface ProfileChange {
  type: ChangeType;
  description: string;
  previousValue?: string;
  newValue?: string;
  detectedAt: Date;
  severity: 'info' | 'positive' | 'negative';
  opportunities: string[];
}
