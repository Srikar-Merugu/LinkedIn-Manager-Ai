import pino from 'pino';
import {
  ProfileScore,
  BrandingScore,
  VisibilityScore,
  OpportunityScore,
  ContentReadinessScore,
  ScoreBreakdownItem,
  CareerStage,
  ProfileType,
  LinkedInUserProfile,
} from '../../types/linkedin';
import { ParsedProfile } from '../linkedin/ProfileParser';

const logger = pino();

export interface ScoreWeights {
  profile: {
    completeness: number;
    headline: number;
    about: number;
    experience: number;
    education: number;
    skills: number;
    certifications: number;
    projects: number;
    activity: number;
  };
  branding: {
    headlineClarity: number;
    personalBranding: number;
    valueProposition: number;
    keywordOptimization: number;
    storytelling: number;
  };
  content: {
    topicClarity: number;
    expertiseDepth: number;
    contentHistory: number;
    engagementPotential: number;
    consistency: number;
  };
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  profile: {
    completeness: 0.20,
    headline: 0.15,
    about: 0.15,
    experience: 0.20,
    education: 0.10,
    skills: 0.10,
    certifications: 0.05,
    projects: 0.03,
    activity: 0.02,
  },
  branding: {
    headlineClarity: 0.25,
    personalBranding: 0.25,
    valueProposition: 0.20,
    keywordOptimization: 0.15,
    storytelling: 0.15,
  },
  content: {
    topicClarity: 0.25,
    expertiseDepth: 0.25,
    contentHistory: 0.20,
    engagementPotential: 0.15,
    consistency: 0.15,
  },
};

export class ScoringEngine {
  private weights: ScoreWeights;

  constructor(weights?: Partial<ScoreWeights>) {
    this.weights = {
      profile: { ...DEFAULT_WEIGHTS.profile, ...weights?.profile },
      branding: { ...DEFAULT_WEIGHTS.branding, ...weights?.branding },
      content: { ...DEFAULT_WEIGHTS.content, ...weights?.content },
    };
  }

  calculateProfileScore(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): ProfileScore {
    const completeness = this.scoreCompleteness(profile);
    const headline = this.scoreHeadline(profile.headline);
    const about = this.scoreAbout(profile.about);
    const experience = this.scoreExperience(parsed);
    const education = this.scoreEducation(parsed);
    const skills = this.scoreSkills(parsed);
    const certifications = this.scoreCertifications(parsed);
    const projects = this.scoreProjects(parsed);
    const activity = this.scoreActivity(parsed);
    const featured = this.scoreFeatured(profile);

    const breakdown: ScoreBreakdownItem[] = [
      { label: 'Profile Completeness', score: completeness, maxScore: 100, weight: this.weights.profile.completeness, description: 'Overall profile completion rate' },
      { label: 'Headline Quality', score: headline, maxScore: 100, weight: this.weights.profile.headline, description: 'Professional headline effectiveness' },
      { label: 'About Section', score: about, maxScore: 100, weight: this.weights.profile.about, description: 'About section quality and completeness' },
      { label: 'Experience', score: experience, maxScore: 100, weight: this.weights.profile.experience, description: 'Experience section depth and relevance' },
      { label: 'Education', score: education, maxScore: 100, weight: this.weights.profile.education, description: 'Educational background presentation' },
      { label: 'Skills', score: skills, maxScore: 100, weight: this.weights.profile.skills, description: 'Skills inventory completeness' },
      { label: 'Certifications', score: certifications, maxScore: 100, weight: this.weights.profile.certifications, description: 'Certifications and licenses' },
      { label: 'Projects', score: projects, maxScore: 100, weight: this.weights.profile.projects, description: 'Project portfolio' },
      { label: 'Activity', score: activity, maxScore: 100, weight: this.weights.profile.activity, description: 'Content engagement activity' },
    ];

    if (featured > 0) {
      breakdown.push({ label: 'Featured', score: featured, maxScore: 100, weight: this.weights.profile.projects, description: 'Featured section quality' });
    }

    const overall = this.calculateWeightedScore(breakdown);

    return {
      overall: Math.round(overall),
      completeness,
      headline,
      about,
      experience,
      education,
      skills,
      certifications,
      projects,
      featured,
      activity,
      breakdown,
    };
  }

  calculateBrandingScore(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): BrandingScore {
    const headlineClarity = this.scoreHeadlineClarity(profile.headline);
    const personalBranding = this.scorePersonalBranding(profile, parsed);
    const valueProposition = this.scoreValueProposition(profile.about, parsed);
    const keywordOptimization = this.scoreKeywordOptimization(parsed);
    const storytelling = this.scoreStorytelling(profile, parsed);

    const breakdown: ScoreBreakdownItem[] = [
      { label: 'Headline Clarity', score: headlineClarity, maxScore: 100, weight: this.weights.branding.headlineClarity, description: 'How clearly the headline communicates expertise' },
      { label: 'Personal Branding', score: personalBranding, maxScore: 100, weight: this.weights.branding.personalBranding, description: 'Strength of personal brand elements' },
      { label: 'Value Proposition', score: valueProposition, maxScore: 100, weight: this.weights.branding.valueProposition, description: 'Clarity of professional value proposition' },
      { label: 'Keyword Optimization', score: keywordOptimization, maxScore: 100, weight: this.weights.branding.keywordOptimization, description: 'SEO and discovery optimization' },
      { label: 'Storytelling', score: storytelling, maxScore: 100, weight: this.weights.branding.storytelling, description: 'Narrative quality across the profile' },
    ];

    const overall = this.calculateWeightedScore(breakdown);

    return {
      overall: Math.round(overall),
      headlineClarity,
      personalBranding,
      valueProposition,
      keywordOptimization,
      storytelling,
      breakdown,
    };
  }

  calculateVisibilityScore(
    parsed: ParsedProfile
  ): VisibilityScore {
    const searchability = this.scoreSearchability(parsed);
    const contentFrequency = parsed.content.contentConsistency * 100;
    const engagement = this.scoreEngagement(parsed);
    const networkGrowth = 0;
    const profileViews = 0;

    const breakdown: ScoreBreakdownItem[] = [
      { label: 'Searchability', score: searchability, maxScore: 100, weight: 0.25, description: 'How easy to find in search results' },
      { label: 'Content Frequency', score: contentFrequency, maxScore: 100, weight: 0.25, description: 'How regularly content is posted' },
      { label: 'Engagement', score: engagement, maxScore: 100, weight: 0.20, description: 'Content engagement levels' },
      { label: 'Network Growth', score: networkGrowth, maxScore: 100, weight: 0.15, description: 'Network expansion rate' },
      { label: 'Profile Views', score: profileViews, maxScore: 100, weight: 0.15, description: 'Profile visit metrics' },
    ];

    const overall = this.calculateWeightedScore(breakdown);

    return {
      overall: Math.round(overall),
      searchability,
      contentFrequency,
      engagement,
      networkGrowth,
      profileViews,
      breakdown,
    };
  }

  calculateOpportunityScore(
    parsed: ParsedProfile
  ): OpportunityScore {
    const careerGrowth = this.scoreCareerGrowth(parsed);
    const contentPotential = this.calculateContentPotential(parsed);
    const networking = this.scoreNetworkingPotential(parsed);
    const skillDevelopment = this.scoreSkillDevelopment(parsed);
    const marketPosition = this.scoreMarketPosition(parsed);

    const breakdown: ScoreBreakdownItem[] = [
      { label: 'Career Growth', score: careerGrowth, maxScore: 100, weight: 0.25, description: 'Room for career advancement' },
      { label: 'Content Potential', score: contentPotential, maxScore: 100, weight: 0.25, description: 'Potential for content creation' },
      { label: 'Networking', score: networking, maxScore: 100, weight: 0.20, description: 'Networking opportunities' },
      { label: 'Skill Development', score: skillDevelopment, maxScore: 100, weight: 0.15, description: 'Skills growth potential' },
      { label: 'Market Position', score: marketPosition, maxScore: 100, weight: 0.15, description: 'Competitive positioning' },
    ];

    const overall = this.calculateWeightedScore(breakdown);

    return {
      overall: Math.round(overall),
      careerGrowth,
      contentPotential,
      networking,
      skillDevelopment,
      marketPosition,
      breakdown,
    };
  }

  calculateContentReadinessScore(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): ContentReadinessScore {
    const topicClarity = this.scoreTopicClarity(profile, parsed);
    const expertiseDepth = this.scoreExpertiseDepth(parsed);
    const contentHistory = parsed.content.contentConsistency * 100;
    const engagementPotential = this.scoreEngagementPotential(parsed);
    const consistency = parsed.content.contentConsistency * 100;

    const breakdown: ScoreBreakdownItem[] = [
      { label: 'Topic Clarity', score: topicClarity, maxScore: 100, weight: this.weights.content.topicClarity, description: 'How clear the content niche is' },
      { label: 'Expertise Depth', score: expertiseDepth, maxScore: 100, weight: this.weights.content.expertiseDepth, description: 'Depth of demonstrated expertise' },
      { label: 'Content History', score: contentHistory, maxScore: 100, weight: this.weights.content.contentHistory, description: 'Existing content track record' },
      { label: 'Engagement Potential', score: engagementPotential, maxScore: 100, weight: this.weights.content.engagementPotential, description: 'Likely engagement on future content' },
      { label: 'Consistency', score: consistency, maxScore: 100, weight: this.weights.content.consistency, description: 'Content posting consistency' },
    ];

    const overall = this.calculateWeightedScore(breakdown);

    return {
      overall: Math.round(overall),
      topicClarity,
      expertiseDepth,
      contentHistory,
      engagementPotential,
      consistency,
      breakdown,
    };
  }

  private scoreCompleteness(profile: LinkedInUserProfile): number {
    let score = 0;
    const checks = [
      { condition: !!profile.headline, weight: 15 },
      { condition: !!profile.about && profile.about.length > 100, weight: 15 },
      { condition: (profile.experience?.length || 0) > 0, weight: 20 },
      { condition: (profile.education?.length || 0) > 0, weight: 10 },
      { condition: (profile.skills?.length || 0) >= 5, weight: 10 },
      { condition: !!profile.profilePicture, weight: 10 },
      { condition: !!profile.location, weight: 5 },
      { condition: !!profile.industry, weight: 5 },
      { condition: (profile.experience || []).some(e => e.description), weight: 5 },
      { condition: !!(profile.experience || []).find(e => e.currentlyWorking), weight: 5 },
    ];

    for (const check of checks) {
      if (check.condition) score += check.weight;
    }

    return Math.min(score, 100);
  }

  private scoreHeadline(headline?: string): number {
    if (!headline) return 0;

    let score = 30;
    const length = headline.length;

    if (length >= 50 && length <= 150) score += 30;
    else if (length > 150) score += 20;
    else if (length > 0) score += 10;

    const hasRole = /(engineer|developer|designer|manager|director|vp|head|lead|founder|ceo|cto|architect|consultant|specialist|analyst)/i.test(headline);
    if (hasRole) score += 15;

    const hasIndustry = /\b(ai|ml|data|cloud|saas|fintech|health|tech|software|product|marketing|sales|finance|consulting)\b/i.test(headline);
    if (hasIndustry) score += 15;

    const hasMetrics = /[0-9]/.test(headline);
    if (hasMetrics) score += 10;

    return Math.min(score, 100);
  }

  private scoreAbout(about?: string): number {
    if (!about) return 0;
    const length = about.length;

    if (length >= 500 && length <= 2000) return 90;
    if (length >= 300) return 75;
    if (length >= 200) return 60;
    if (length >= 100) return 40;
    if (length > 0) return 20;
    return 0;
  }

  private scoreExperience(parsed: ParsedProfile): number {
    const { experience } = parsed;

    if (experience.totalRoles === 0) return 0;

    let score = 20;
    if (experience.totalRoles >= 3) score += 20;
    else if (experience.totalRoles >= 1) score += 10;

    if (experience.uniqueCompanies >= 3) score += 15;
    else if (experience.uniqueCompanies >= 2) score += 10;

    if (experience.averageRoleDuration >= 24) score += 15;
    else if (experience.averageRoleDuration >= 12) score += 10;

    if (!experience.hasGaps) score += 15;
    else if (experience.gapMonths < 6) score += 5;

    if (parsed.summary.roleProgressionScore >= 70) score += 15;

    return Math.min(score, 100);
  }

  private scoreEducation(parsed: ParsedProfile): number {
    const { education } = parsed;

    if (education.totalEducation === 0) return 30;

    let score = 30;
    if (education.highestDegree === 'PhD') score += 35;
    else if (education.highestDegree === "Master's") score += 30;
    else if (education.highestDegree === "Bachelor's") score += 25;
    else if (education.highestDegree === "Associate's") score += 15;
    else if (education.highestDegree === 'Diploma') score += 10;

    if (education.totalEducation > 1) score += 20;
    if (education.fieldOfStudy.length > 0) score += 15;

    return Math.min(score, 100);
  }

  private scoreSkills(parsed: ParsedProfile): number {
    const { skills } = parsed;

    if (skills.total === 0) return 0;

    let score = 10;
    if (skills.total >= 20) score += 30;
    else if (skills.total >= 10) score += 20;
    else if (skills.total >= 5) score += 10;

    if (skills.topSkills.length >= 3) score += 20;
    else if (skills.topSkills.length > 0) score += 10;

    if (skills.skillCategories.length >= 3) score += 15;
    else if (skills.skillCategories.length > 0) score += 5;

    if (skills.averageEndorsements >= 5) score += 25;
    else if (skills.averageEndorsements >= 2) score += 15;

    return Math.min(score, 100);
  }

  private scoreCertifications(parsed: ParsedProfile): number {
    const count = parsed.summary.totalCertifications;

    if (count >= 5) return 90;
    if (count >= 3) return 75;
    if (count >= 1) return 50;
    return 0;
  }

  private scoreProjects(parsed: ParsedProfile): number {
    const count = parsed.summary.totalProjects;

    if (count >= 5) return 90;
    if (count >= 3) return 70;
    if (count >= 1) return 45;
    return 0;
  }

  private scoreFeatured(profile: LinkedInUserProfile): number {
    if (profile.projects?.some(p => p.url)) return 70;
    if (profile.projects?.length) return 40;
    return 0;
  }

  private scoreActivity(parsed: ParsedProfile): number {
    const { content } = parsed;

    if (content.totalPosts === 0) return 0;

    let score = 10;
    if (content.totalPosts >= 50) score += 30;
    else if (content.totalPosts >= 20) score += 20;
    else if (content.totalPosts >= 5) score += 10;

    if (content.averageEngagement >= 50) score += 30;
    else if (content.averageEngagement >= 20) score += 20;
    else if (content.averageEngagement >= 5) score += 10;

    if (content.totalArticles > 0) score += 15;
    if (content.contentConsistency >= 0.5) score += 15;

    return Math.min(score, 100);
  }

  private scoreHeadlineClarity(headline?: string): number {
    if (!headline) return 0;

    let score = 20;
    const length = headline.length;

    if (length >= 80 && length <= 150) score += 30;
    else if (length >= 50) score += 20;
    else score += 10;

    const hasRole = /(engineer|developer|designer|manager|director|vp|lead|founder|ceo|consultant|specialist|architect)/i.test(headline);
    if (hasRole) score += 20;

    const hasIndustry = /\b(ai|ml|data|cloud|saas|fintech|health|tech|software|product|marketing|sales)\b/i.test(headline);
    if (hasIndustry) score += 15;

    const hasKeywords = /(building|leading|helping|driving|creating|transforming|scaling|growing)/i.test(headline);
    if (hasKeywords) score += 15;

    return Math.min(score, 100);
  }

  private scorePersonalBranding(profile: LinkedInUserProfile, parsed: ParsedProfile): number {
    let score = 20;

    if (profile.headline && profile.headline.length > 50) score += 15;
    if (profile.about && profile.about.length > 300) score += 15;
    if (profile.profilePicture) score += 10;
    if (parsed.experience.careerProgression.length >= 3) score += 10;
    if (parsed.summary.profileType === 'founder' || parsed.summary.profileType === 'executive') score += 10;

    const hasPersonalVoice = /\b(I|my|our|we)\b/i.test(profile.about || '') ? 10 : 0;
    score += hasPersonalVoice;

    const hasResults = /(increased|reduced|improved|grew|achieved|delivered|launched)/i.test(profile.about || '');
    if (hasResults) score += 10;

    return Math.min(score, 100);
  }

  private scoreValueProposition(about?: string, parsed?: ParsedProfile): number {
    if (!about) return 0;

    let score = 20;

    const actionVerbs = /(build|create|develop|lead|drive|transform|scale|solve|design|optimize)/gi;
    const verbMatches = about.match(actionVerbs);
    if (verbMatches && verbMatches.length >= 3) score += 20;

    const hasIndustryMention = parsed?.summary.industry && about.toLowerCase().includes(parsed.summary.industry.toLowerCase());
    if (hasIndustryMention) score += 15;

    const hasMetrics = /\d+/.test(about);
    if (hasMetrics) score += 15;

    const hasOutcomes = /(result|outcome|impact|achievement|success|improvement)/i.test(about);
    if (hasOutcomes) score += 15;

    if (about.length >= 200 && about.length <= 1000) score += 15;
    else if (about.length > 0) score += 5;

    return Math.min(score, 100);
  }

  private scoreKeywordOptimization(parsed: ParsedProfile): number {
    let score = 20;

    const keywords = [
      ...parsed.skills.topSkills,
      ...parsed.skills.skillCategories,
      parsed.summary.industry,
      ...parsed.experience.industries,
    ].filter(Boolean);

    const uniqueKeywords = new Set(keywords.map(k => k.toLowerCase()));
    if (uniqueKeywords.size >= 15) score += 30;
    else if (uniqueKeywords.size >= 10) score += 20;
    else if (uniqueKeywords.size >= 5) score += 10;

    if (parsed.skills.skillCategories.length >= 3) score += 15;

    if (parsed.skills.total >= 20) score += 20;
    else if (parsed.skills.total >= 10) score += 10;

    if (parsed.skills.averageEndorsements > 0) score += 15;

    return Math.min(score, 100);
  }

  private scoreStorytelling(profile: LinkedInUserProfile, parsed: ParsedProfile): number {
    let score = 20;

    const about = profile.about || '';
    if (about.length >= 500) score += 20;
    else if (about.length >= 200) score += 10;

    const hasNarrative = /(journey|passion|mission|vision|believe|started|began|transition|evolve)/i.test(about);
    if (hasNarrative) score += 20;

    const hasStructure = /(first|second|then|finally|currently|previously|prior)/i.test(about);
    if (hasStructure) score += 15;

    const expDescriptions = profile.experience?.filter(e => e.description).length || 0;
    const totalExp = profile.experience?.length || 0;
    if (totalExp > 0 && expDescriptions / totalExp >= 0.5) score += 15;

    if (profile.about && profile.headline) {
      const headline = profile.headline.toLowerCase();
      const aboutLower = about.toLowerCase();
      if (aboutLower.includes(headline.split(' ')[0])) score += 10;
    }

    return Math.min(score, 100);
  }

  private scoreSearchability(parsed: ParsedProfile): number {
    let score = 20;

    if (parsed.summary.industry !== 'Unknown') score += 15;
    if (parsed.experience.totalRoles > 0) score += 15;
    if (parsed.skills.total >= 10) score += 20;
    else if (parsed.skills.total >= 5) score += 10;

    if (parsed.skills.skillCategories.length >= 2) score += 15;

    if (parsed.education.totalEducation > 0) score += 15;

    return Math.min(score, 100);
  }

  private scoreEngagement(parsed: ParsedProfile): number {
    const { content } = parsed;

    if (content.totalPosts === 0) return 0;

    let score = 20;
    if (content.averageEngagement >= 100) score += 40;
    else if (content.averageEngagement >= 50) score += 30;
    else if (content.averageEngagement >= 10) score += 20;
    else score += 10;

    if (content.totalArticles > 0) score += 20;
    if (content.totalEngagements > 1000) score += 20;
    else if (content.totalEngagements > 100) score += 10;

    return Math.min(score, 100);
  }

  private scoreCareerGrowth(parsed: ParsedProfile): number {
    let score = 30;

    if (parsed.summary.totalExperienceYears < 5) score += 25;
    else if (parsed.summary.totalExperienceYears < 10) score += 15;

    if (parsed.summary.roleProgressionScore < 50) score += 20;

    if (parsed.skills.total >= 5 && parsed.skills.total < 15) score += 15;

    if (parsed.education.highestDegree === "Bachelor's" || parsed.education.highestDegree === "Master's") score += 10;

    return Math.min(score, 100);
  }

  private calculateContentPotential(parsed: ParsedProfile): number {
    let score = 20;

    if (parsed.skills.topSkills.length >= 3) score += 20;
    else if (parsed.skills.topSkills.length >= 1) score += 10;

    if (parsed.experience.industries.length >= 2) score += 15;

    if (parsed.summary.totalExperienceYears >= 5) score += 15;

    if (parsed.experience.totalRoles >= 3) score += 15;

    if (parsed.summary.profileType === 'founder' || parsed.summary.profileType === 'executive') score += 15;

    return Math.min(score, 100);
  }

  private scoreNetworkingPotential(parsed: ParsedProfile): number {
    let score = 30;

    if (parsed.experience.uniqueCompanies >= 3) score += 20;
    else if (parsed.experience.uniqueCompanies >= 2) score += 10;

    if (parsed.education.totalEducation > 0) score += 15;
    if (parsed.education.universities.length >= 2) score += 10;

    if (parsed.experience.industries.length >= 2) score += 15;

    return Math.min(score, 100);
  }

  private scoreSkillDevelopment(parsed: ParsedProfile): number {
    let score = 30;

    if (parsed.skills.total < 10) score += 20;

    const uniqueCats = parsed.skills.skillCategories.length;
    if (uniqueCats < 3) score += 15;

    if (parsed.summary.totalCertifications < 3) score += 15;

    if (parsed.education.totalEducation < 2) score += 10;

    return Math.min(score, 100);
  }

  private scoreMarketPosition(parsed: ParsedProfile): number {
    let score = 30;

    if (parsed.summary.careerStage === 'founder' || parsed.summary.careerStage === 'executive') score += 25;
    else if (parsed.summary.careerStage === 'senior' || parsed.summary.careerStage === 'leadership') score += 20;

    if (parsed.experience.uniqueCompanies >= 3) score += 15;

    if (parsed.skills.averageEndorsements >= 10) score += 15;

    if (parsed.summary.careerStabilityScore >= 70) score += 15;

    return Math.min(score, 100);
  }

  private scoreTopicClarity(profile: LinkedInUserProfile, parsed: ParsedProfile): number {
    let score = 20;

    const headline = profile.headline || '';
    const about = profile.about || '';

    const topicKeywords = headline.split(' ').filter(w => w.length > 3);
    const aboutWords = about.split(' ').filter(w => w.length > 3);
    const overlap = topicKeywords.filter(w => aboutWords.map(a => a.toLowerCase()).includes(w.toLowerCase())).length;
    if (overlap >= 2) score += 20;

    if (parsed.skills.topSkills.length >= 3) score += 20;
    if (parsed.skills.skillCategories.length >= 2) score += 15;

    if (parsed.content.totalPosts > 0) score += 15;

    if (parsed.content.topTopics.length >= 3) score += 10;

    return Math.min(score, 100);
  }

  private scoreExpertiseDepth(parsed: ParsedProfile): number {
    let score = 20;

    if (parsed.summary.totalExperienceYears >= 10) score += 25;
    else if (parsed.summary.totalExperienceYears >= 5) score += 15;
    else if (parsed.summary.totalExperienceYears >= 2) score += 10;

    if (parsed.skills.averageEndorsements >= 10) score += 20;
    else if (parsed.skills.averageEndorsements >= 5) score += 10;

    if (parsed.education.highestDegree === 'PhD') score += 15;
    else if (parsed.education.highestDegree === "Master's") score += 10;

    if (parsed.summary.totalCertifications >= 3) score += 10;

    return Math.min(score, 100);
  }

  private scoreEngagementPotential(parsed: ParsedProfile): number {
    let score = 30;

    if (parsed.content.totalPosts > 0) score += 15;
    if (parsed.content.averageEngagement > 0) score += 15;

    if (parsed.summary.totalExperienceYears >= 5) score += 10;
    if (parsed.skills.topSkills.length >= 3) score += 10;

    if (parsed.summary.profileType === 'founder' || parsed.summary.profileType === 'influencer') score += 10;

    const hasContentNiche = parsed.content.topTopics.length >= 2 ? 10 : 0;
    score += hasContentNiche;

    return Math.min(score, 100);
  }

  private calculateWeightedScore(items: ScoreBreakdownItem[]): number {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) return 0;

    const weighted = items.reduce((sum, item) => {
      const normalizedScore = item.maxScore > 0 ? item.score / item.maxScore : 0;
      return sum + normalizedScore * item.weight;
    }, 0);

    return Math.round((weighted / totalWeight) * 100);
  }
}
