import mongoose from 'mongoose';
import pino from 'pino';
import {
  ExpandedIntelligenceReport,
  ScoreDimension,
  LinkedInUserProfile,
  CareerStage,
  ProfessionalIdentity,
} from '../../types/linkedin';
import { ParsedProfile, ProfileParser } from '../linkedin/ProfileParser';
import { IdentityDetectionService } from './IdentityDetectionService';
import { ExpertiseEngine } from './ExpertiseEngine';
import { ContentOpportunityEngine } from './ContentOpportunityEngine';
import { ProfileGapAnalyzer } from './ProfileGapAnalyzer';
import { CareerIntelligenceEngine } from './CareerIntelligenceEngine';
import { ProfileChangeDetector } from './ProfileChangeDetector';
import { LinkedInProfile, ILinkedInProfile } from '../../models/LinkedInProfile';
import { LinkedInSkill } from '../../models/LinkedInSkill';
import { LinkedInActivity } from '../../models/LinkedInActivity';
import { ProfileScore } from '../../models/intelligence/ProfileScore';
import { ExpertiseProfile } from '../../models/intelligence/ExpertiseProfile';
import { OpportunityEvent } from '../../models/intelligence/OpportunityEvent';

const logger = pino();

export class IntelligenceAggregator {
  private profileParser: ProfileParser;
  private identityDetection: IdentityDetectionService;
  private expertiseEngine: ExpertiseEngine;
  private contentOpportunityEngine: ContentOpportunityEngine;
  private profileGapAnalyzer: ProfileGapAnalyzer;
  private careerIntelligenceEngine: CareerIntelligenceEngine;
  private profileChangeDetector: ProfileChangeDetector;

  constructor() {
    this.profileParser = new ProfileParser();
    this.identityDetection = new IdentityDetectionService();
    this.expertiseEngine = new ExpertiseEngine();
    this.contentOpportunityEngine = new ContentOpportunityEngine();
    this.profileGapAnalyzer = new ProfileGapAnalyzer();
    this.careerIntelligenceEngine = new CareerIntelligenceEngine();
    this.profileChangeDetector = new ProfileChangeDetector();
  }

  async generateFullReport(profileId: string, userId: string): Promise<ExpandedIntelligenceReport> {
    const profile = await LinkedInProfile.findById(profileId).select('-accessToken -refreshToken');
    if (!profile) throw new Error('Profile not found');

    const skills = await LinkedInSkill.find({ profileId }).lean();
    const activity = await LinkedInActivity.find({ profileId }).sort({ timestamp: -1 }).limit(100).lean();

    const linkedinProfile = this.buildLinkedInUserProfile(profile, skills as any[], activity as any[]);
    const parsed = this.profileParser.parse(linkedinProfile);

    const identity = this.identityDetection.detectIdentity(parsed, linkedinProfile);
    const expertise = this.expertiseEngine.analyze(parsed, linkedinProfile);
    const contentOpportunities = this.contentOpportunityEngine.generate(parsed, linkedinProfile);
    const gaps = this.profileGapAnalyzer.analyze(parsed, linkedinProfile);
    const careerIntelligence = this.careerIntelligenceEngine.analyze(parsed, linkedinProfile);
    const changes = await this.profileChangeDetector.getChangeHistory(profileId);

    const scores = this.computeScores(parsed, linkedinProfile, identity, expertise);
    const recommendations = this.generateRecommendations(scores, gaps, contentOpportunities);

    this.persistResults(profileId, userId, scores, expertise, contentOpportunities, parsed, linkedinProfile, identity).catch(
      (err: unknown) => { logger.error({ err }, 'Failed to persist intelligence results'); }
    );

    return {
      userId,
      profileId,
      generatedAt: new Date(),
      scores,
      identity,
      expertise,
      contentOpportunities,
      gaps,
      career: careerIntelligence,
      changes,
      recommendations,
      raw: {
        totalExperienceYears: parsed.summary.totalExperienceYears,
        totalSkills: parsed.summary.totalSkills,
        totalCertifications: parsed.summary.totalCertifications,
        totalProjects: parsed.summary.totalProjects,
        totalActivities: parsed.summary.totalActivities,
        totalPosts: parsed.content.totalPosts,
        careerStabilityScore: parsed.summary.careerStabilityScore,
      },
    };
  }

  private computeScores(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile,
    identity: ProfessionalIdentity,
    expertise: any
  ): ExpandedIntelligenceReport['scores'] {
    const totalExperienceYears = parsed.summary.totalExperienceYears;
    const totalSkills = parsed.summary.totalSkills;
    const totalCerts = parsed.summary.totalCertifications;
    const totalActivities = parsed.summary.totalActivities;
    const careerStage = parsed.summary.careerStage;
    const profileType = parsed.summary.profileType;

    const stageMap: Record<string, number> = {
      'student': 10, 'entry-level': 25, 'mid-level': 50, 'senior': 70,
      'leadership': 85, 'executive': 95, 'founder': 75, 'freelancer': 60,
    };

    const profileCompleteness = this.scoreProfileCompleteness(profile, parsed);
    const personalBranding = this.scorePersonalBranding(profile, parsed, identity);
    const expertiseScore = this.scoreExpertise(parsed, expertise);
    const authority = this.scoreAuthority(parsed, identity, careerStage);
    const visibility = this.scoreVisibility(parsed);
    const opportunity = this.scoreOpportunity(parsed, totalExperienceYears);
    const contentReadiness = this.scoreContentReadiness(parsed);
    const careerGrowth = this.scoreCareerGrowth(parsed, careerStage, stageMap);

    return {
      profileCompleteness: this.makeDimension(profileCompleteness, 'Overall profile completion based on filled sections', [
        profileCompleteness < 50 ? 'Complete your About section' : '',
        profileCompleteness < 70 ? 'Add more skills' : '',
        parsed.summary.totalCertifications === 0 ? 'Consider adding certifications' : '',
      ].filter(Boolean)),
      personalBranding: this.makeDimension(personalBranding, 'How well your profile communicates your brand', [
        personalBranding < 50 ? 'Improve headline clarity' : '',
        personalBranding < 60 ? 'Strengthen your About section narrative' : '',
      ].filter(Boolean)),
      expertise: this.makeDimension(expertiseScore, 'Depth and breadth of demonstrated expertise', [
        expertiseScore < 50 ? 'Get certified in your primary expertise' : '',
        expertise.primary.length < 2 ? 'Develop secondary expertise areas' : '',
      ].filter(Boolean)),
      authority: this.makeDimension(authority, 'Industry authority and thought leadership', [
        authority < 40 ? 'Start posting regularly to build authority' : '',
        authority < 60 ? 'Create long-form content about your expertise' : '',
      ].filter(Boolean)),
      visibility: this.makeDimension(visibility, 'Search discoverability and content reach', [
        visibility < 40 ? 'Improve SEO keywords in headline and about' : '',
        parsed.content.totalPosts < 5 ? 'Increase posting frequency' : '',
      ].filter(Boolean)),
      opportunity: this.makeDimension(opportunity, 'Growth and opportunity potential', [
        opportunity < 50 && totalExperienceYears > 3 ? 'Consider expanding your skill set' : '',
        parsed.experience.uniqueCompanies < 2 ? 'Build a broader professional network' : '',
      ].filter(Boolean)),
      contentReadiness: this.makeDimension(contentReadiness, 'Readiness to create compelling content', [
        contentReadiness < 40 ? 'Define your content pillars' : '',
        parsed.content.totalPosts < 3 ? 'Start with short-form posts' : '',
      ].filter(Boolean)),
      careerGrowth: this.makeDimension(careerGrowth, 'Career trajectory and growth potential', [
        careerGrowth < 40 ? 'Identify desired next role' : '',
        careerGrowth < 50 ? 'Build skills gap roadmap' : '',
      ].filter(Boolean)),
    };
  }

  private makeDimension(score: number, reasoning: string, recommendations: string[]): ScoreDimension {
    return {
      current: Math.round(score),
      reasoning,
      recommendations: recommendations.length > 0 ? recommendations : ['Continue building on your strengths'],
      breakdown: [],
    };
  }

  private scoreProfileCompleteness(profile: LinkedInUserProfile, parsed: ParsedProfile): number {
    let score = 0;
    if (profile.headline) score += 15;
    if (profile.about && profile.about.length > 100) score += 15;
    if (profile.experience && profile.experience.length > 0) score += 20;
    if (profile.education && profile.education.length > 0) score += 10;
    if (parsed.skills.total >= 5) score += 10;
    if (parsed.skills.total >= 15) score += 5;
    if (profile.profilePicture) score += 10;
    if (parsed.summary.totalCertifications > 0) score += 5;
    if (profile.experience?.some(e => e.description && e.description.length > 100)) score += 5;
    if (profile.experience?.some(e => e.currentlyWorking)) score += 5;
    return Math.min(score, 100);
  }

  private scorePersonalBranding(profile: LinkedInUserProfile, parsed: ParsedProfile, identity: ProfessionalIdentity): number {
    let score = 20;
    if (profile.headline) {
      const hasRole = /(engineer|developer|designer|manager|director|founder|lead|head|vp|chief|consultant|analyst|specialist)/i.test(profile.headline);
      if (hasRole) score += 15;
      if (profile.headline.length > 50) score += 10;
    }
    if (profile.about) {
      if (profile.about.length > 500) score += 15;
      if (profile.about.length > 1000) score += 10;
    }
    if (identity.roleConfidence > 70) score += 10;
    if (identity.technicalSkills.length > 5) score += 10;
    if (parsed.skills.topSkills.length > 0) score += 10;
    return Math.min(score, 100);
  }

  private scoreExpertise(parsed: ParsedProfile, expertise: any): number {
    let score = 10;
    if (expertise.primary && expertise.primary.length > 0) score += 25;
    if (expertise.secondary && expertise.secondary.length > 0) score += 15;
    if (parsed.experience.totalRoles >= 2) score += 10;
    if (parsed.summary.totalExperienceYears >= 3) score += 10;
    if (parsed.summary.totalExperienceYears >= 6) score += 10;
    if (parsed.skills.total >= 10) score += 10;
    if (parsed.summary.totalCertifications > 0) score += 10;
    return Math.min(score, 100);
  }

  private scoreAuthority(parsed: ParsedProfile, identity: ProfessionalIdentity, careerStage: CareerStage): number {
    let score = 10;
    const stageScores: Record<string, number> = { 'student': 10, 'entry-level': 20, 'mid-level': 40, 'senior': 60, 'leadership': 75, 'executive': 90, 'founder': 70, 'freelancer': 45 };
    score += stageScores[careerStage] || 20;
    if (parsed.summary.totalExperienceYears > 5) score += 10;
    if (parsed.summary.totalExperienceYears > 10) score += 10;
    if (parsed.content.totalPosts > 10) score += 10;
    if (identity.roleConfidence > 80) score += 10;
    return Math.min(score, 100);
  }

  private scoreVisibility(parsed: ParsedProfile): number {
    let score = 10;
    score += Math.min(parsed.content.contentConsistency * 100, 25);
    score += Math.min(parsed.content.totalPosts * 3, 20);
    if (parsed.content.averageEngagement > 10) score += 15;
    if (parsed.skills.total > 15) score += 10;
    if (parsed.summary.totalCertifications > 0) score += 5;
    if (parsed.experience.uniqueCompanies > 2) score += 5;
    return Math.min(score, 100);
  }

  private scoreOpportunity(parsed: ParsedProfile, totalExperienceYears: number): number {
    let score = 20;
    if (totalExperienceYears >= 3 && parsed.summary.totalCertifications === 0) score += 20;
    if (parsed.content.totalPosts < 5) score += 15;
    if (parsed.experience.uniqueCompanies < 2) score += 10;
    if (parsed.skills.total < 10) score += 10;
    score += Math.min(parsed.content.contentConsistency * 50, 15);
    return Math.min(score, 100);
  }

  private scoreContentReadiness(parsed: ParsedProfile): number {
    let score = 15;
    if (parsed.content.totalPosts > 0) score += 15;
    if (parsed.content.totalPosts > 5) score += 10;
    if (parsed.content.totalArticles > 0) score += 10;
    if (parsed.content.averageEngagement > 5) score += 10;
    if (parsed.skills.topSkills.length > 3) score += 10;
    if (parsed.summary.totalExperienceYears > 3) score += 10;
    score += Math.min(parsed.content.contentConsistency * 50, 20);
    return Math.min(score, 100);
  }

  private scoreCareerGrowth(parsed: ParsedProfile, careerStage: CareerStage, stageMap: Record<string, number>): number {
    let score = 25;
    score += (stageMap[careerStage] || 25) * 0.3;
    if (parsed.summary.roleProgressionScore > 50) score += 15;
    if (parsed.summary.totalCertifications > 0) score += 10;
    if (parsed.skills.total > 10) score += 10;
    if (parsed.experience.uniqueCompanies > 1) score += 10;
    return Math.min(score, 100);
  }

  private generateRecommendations(
    scores: ExpandedIntelligenceReport['scores'],
    gaps: any[],
    opportunities: any[]
  ): any[] {
    const recommendations: any[] = [];
    const criticalGaps = gaps.filter((g: any) => g.severity === 'critical');

    for (const gap of criticalGaps.slice(0, 3)) {
      recommendations.push({
        type: 'profile',
        priority: 'critical',
        title: gap.title,
        description: gap.description,
        actions: [gap.recommendation],
        expectedImpact: gap.impact,
        effort: gap.effort,
        timeframe: 'immediate',
        metrics: { current: 0, target: 100 },
      });
    }

    const lowestDimension = Object.entries(scores)
      .map(([key, dim]) => ({ key, score: dim.current }))
      .sort((a, b) => a.score - b.score)[0];

    if (lowestDimension) {
      recommendations.push({
        type: 'profile',
        priority: 'high',
        title: `Improve your ${lowestDimension.key.replace(/([A-Z])/g, ' $1').trim()} score`,
        description: `Current score: ${lowestDimension.score}/100. This is your lowest scoring dimension.`,
        actions: scores[lowestDimension.key as keyof typeof scores].recommendations,
        expectedImpact: `Improving this will boost your overall profile strength`,
        effort: 'medium',
        timeframe: 'short-term',
        metrics: { current: lowestDimension.score, target: Math.min(lowestDimension.score + 20, 100) },
      });
    }

    if (opportunities.length > 0) {
      recommendations.push({
        type: 'content',
        priority: 'high',
        title: 'Create content from your top opportunity',
        description: `Your top content opportunity is: ${opportunities[0].title}`,
        actions: [
          `Write a post about ${opportunities[0].topic}`,
          `Use the hook: "${opportunities[0].hook}"`,
          `Publish and monitor engagement`,
        ],
        expectedImpact: 'Build authority and engagement in your niche',
        effort: 'low',
        timeframe: 'immediate',
        metrics: { current: 0, target: 1 },
      });
    }

    return recommendations;
  }

  private persistResults(
    profileId: string,
    userId: string,
    scores: ExpandedIntelligenceReport['scores'],
    expertise: any,
    opportunities: any[],
    parsed: ParsedProfile,
    profile: LinkedInUserProfile,
    identity: ProfessionalIdentity
  ): Promise<void> {
    return Promise.all([
      ProfileScore.create({
        userId: new mongoose.Types.ObjectId(userId),
        profileId: new mongoose.Types.ObjectId(profileId),
        version: 1,
        overall: Math.round(
          (scores.profileCompleteness.current + scores.personalBranding.current +
           scores.expertise.current + scores.authority.current +
           scores.visibility.current + scores.opportunity.current +
           scores.contentReadiness.current + scores.careerGrowth.current) / 8
        ),
        dimensions: Object.fromEntries(
          Object.entries(scores).map(([key, dim]) => [key, { current: dim.current, reasoning: dim.reasoning, recommendations: dim.recommendations }])
        ) as any,
        trend: 'first',
        generatedAt: new Date(),
      }).catch((err: unknown) => logger.error({ err }, 'Failed to save profile score')),

      ExpertiseProfile.findOneAndUpdate(
        { profileId },
        {
          $set: {
            userId: new mongoose.Types.ObjectId(userId),
            profileId: new mongoose.Types.ObjectId(profileId),
            primary: expertise.primary || [],
            secondary: expertise.secondary || [],
            emerging: expertise.emerging || [],
            hidden: expertise.hidden || [],
            confidence: expertise.confidence / 100,
            summary: expertise.summary || '',
            analyzedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      ).catch((err: unknown) => logger.error({ err }, 'Failed to save expertise profile')),
    ]).then(() => undefined);
  }

  private buildLinkedInUserProfile(
    profile: any,
    skills: any[],
    activity: any[]
  ): LinkedInUserProfile {
    return {
      id: profile.linkedinId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      headline: profile.headline || '',
      vanityName: profile.vanityName,
      profilePicture: profile.profilePicture,
      about: profile.about || '',
      email: profile.email,
      experience: (profile.experience || []).map((e: any) => ({
        title: e.title,
        company: e.company,
        companyLogo: e.companyLogo,
        companyUrl: e.companyUrl,
        location: e.location,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        currentlyWorking: e.currentlyWorking,
        employmentType: e.employmentType,
        industry: e.industry,
        durationInMonths: e.durationInMonths,
      })),
      education: (profile.education || []).map((e: any) => ({
        school: e.school,
        schoolLogo: e.schoolLogo,
        degree: e.degree,
        fieldOfStudy: e.fieldOfStudy,
        grade: e.grade,
        description: e.description,
        startDate: e.startDate,
        endDate: e.endDate,
        activities: e.activities,
      })),
      skills: skills.map((s: any) => ({
        name: s.name,
        endorsements: s.endorsements,
        isTopSkill: s.isTopSkill,
        category: s.category,
      })),
      certifications: [],
      projects: [],
      activity: activity.map((a: any) => ({
        type: a.type,
        content: a.content,
        url: a.url,
        timestamp: a.timestamp,
        engagement: {
          likes: a.engagement?.likes || 0,
          comments: a.engagement?.comments || 0,
          shares: a.engagement?.shares || 0,
        },
      })),
    };
  }
}

export const intelligenceAggregator = new IntelligenceAggregator();
