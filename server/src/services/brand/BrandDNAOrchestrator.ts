import mongoose from 'mongoose';
import pino from 'pino';
import { BrandDNA, IBrandDNA } from '../../models/brand/BrandDNA';
import { BrandSnapshot } from '../../models/brand/BrandSnapshot';
import { BrandPillar } from '../../models/brand/BrandPillar';
import { StoryBank } from '../../models/brand/StoryBank';
import { BrandRecommendation } from '../../models/brand/BrandRecommendation';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../types/linkedin';
import type { ParsedProfile } from '../linkedin/ProfileParser';

import { brandPositioningEngine } from './engines/BrandPositioningEngine';
import { expertiseMappingEngine } from './engines/ExpertiseMappingEngine';
import { uniquenessEngine } from './engines/UniquenessEngine';
import { audienceIntelligenceEngine } from './engines/AudienceIntelligenceEngine';
import { contentDNAEngine } from './engines/ContentDNAEngine';
import { brandContentPillarEngine } from './engines/BrandContentPillarEngine';
import { storyExtractionEngine } from './engines/StoryExtractionEngine';
import { brandArchetypeEngine } from './engines/BrandArchetypeEngine';
import { growthOpportunityEngine } from './engines/GrowthOpportunityEngine';
import { brandConsistencyEngine } from './engines/BrandConsistencyEngine';

const logger = pino();

export interface BrandDNAGenerateResult {
  dna: IBrandDNA;
  pillars?: any;
  stories?: any;
  recommendations?: any;
  snapshot?: any;
}

export class BrandDNAOrchestrator {

  async generate(
    userId: string,
    profileId: string,
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    linkedinProfile: LinkedInUserProfile
  ): Promise<BrandDNAGenerateResult> {
    logger.info({ userId, profileId }, 'Starting Brand DNA generation');

    const archetypeResult = brandArchetypeEngine.analyze(report, parsed);
    const positioning = brandPositioningEngine.analyze(report, parsed, linkedinProfile);
    const expertise = expertiseMappingEngine.analyze(report, parsed);
    const uniqueness = uniquenessEngine.analyze(report, parsed, linkedinProfile);
    const audience = audienceIntelligenceEngine.analyze(report, parsed);
    const contentDNA = contentDNAEngine.analyze(report, parsed);
    const pillars = brandContentPillarEngine.generate(report, parsed);
    const stories = storyExtractionEngine.extract(report, parsed, linkedinProfile);
    const growth = growthOpportunityEngine.analyze(report, parsed);
    const rules = brandConsistencyEngine.generateRules(report, parsed);

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const profileObjectId = new mongoose.Types.ObjectId(profileId);

    const dnaData: Partial<IBrandDNA> = {
      userId: userObjectId,
      profileId: profileObjectId,
      archetype: archetypeResult.primary.name,
      archetypeConfidence: archetypeResult.primary.confidence,
      archetypeDescription: archetypeResult.primary.description,
      secondaryArchetype: archetypeResult.secondary?.name,
      secondaryArchetypeConfidence: archetypeResult.secondary?.confidence,
      positioning,
      values: this.extractValuesFromUniqueness(uniqueness),
      uniqueValueProposition: uniqueness.uniqueValueProposition,
      missionStatement: `To ${report.identity.growthDirection || 'drive meaningful impact'} by leveraging ${archetypeResult.primary.name.toLowerCase()} thinking and deep expertise.`,
      originStory: this.generateOriginStory(report, parsed, linkedinProfile),
      uniquenessFactors: uniqueness.factors,
      targetAudience: {
        primary: audience.primaryAudience,
        secondary: audience.secondaryAudience,
        demographics: audience.demographicInsights,
        painPoints: audience.personas.flatMap(p => p.painPoints).slice(0, 8),
        aspirations: audience.personas.flatMap(p => p.contentPreferences).slice(0, 8),
      },
      brandTerritory: this.buildBrandTerritory(report, parsed, contentDNA),
      visualDirection: this.suggestVisualDirection(archetypeResult.primary.name),
      competitorAnalysis: this.analyzeCompetitors(report, parsed),
      contentDNA: {
        topics: contentDNA.topics,
        contentAuthorityScore: contentDNA.contentAuthorityScore,
        recommendedContentMix: contentDNA.recommendedContentMix,
      },
      growthRoadmap: {
        milestones: growth.milestones,
        overallPriority: growth.overallPriority,
        focusAreas: growth.focusAreas,
        estimatedTimeline: growth.estimatedTimeline,
      },
      brandRules: rules,
      brandScore: this.computeBrandScore(report, parsed, contentDNA),
      confidence: Math.round(archetypeResult.primary.confidence * 0.3 + contentDNA.contentAuthorityScore / 100 * 0.3 + expertise.confidence * 0.2 + audience.confidence * 0.2),
      status: 'active',
      version: 1,
      isActive: true,
      regeneratedAt: new Date(),
    };

    const existing = await BrandDNA.findOne({ userId: userObjectId, profileId: profileObjectId, isActive: true });

    let dna: IBrandDNA;
    if (existing) {
      Object.assign(existing, dnaData);
      existing.status = 'active';
      existing.regeneratedAt = new Date();
      dna = await existing.save();
      logger.info({ userId, profileId, version: dna.version }, 'Updated existing Brand DNA');
    } else {
      dna = await BrandDNA.create(dnaData);
      logger.info({ userId, profileId, id: dna._id }, 'Created new Brand DNA');
    }

    const snapshot = await BrandSnapshot.create({
      userId: userObjectId,
      profileId: profileObjectId,
      brandDnaId: dna._id,
      version: dna.version,
      snapshot: dna.toObject() as Record<string, unknown>,
      reason: 'Brand DNA generation',
      trigger: 'manual',
      confidence: dna.confidence,
      agentVersion: '2.0.0',
      score: dna.brandScore,
    });

    const pillarDoc = await BrandPillar.findOneAndUpdate(
      { userId: userObjectId, brandDnaId: dna._id },
      {
        userId: userObjectId,
        profileId: profileObjectId,
        brandDnaId: dna._id,
        pillars: pillars.map(p => ({
          ...p,
          postingCadence: p.postingCadence,
        })),
        confidence: 0.7,
        version: 1,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const storyDoc = await StoryBank.findOneAndUpdate(
      { userId: userObjectId, brandDnaId: dna._id },
      {
        userId: userObjectId,
        profileId: profileObjectId,
        brandDnaId: dna._id,
        stories,
        totalStories: stories.length,
        confidence: 0.6,
        version: 1,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const recommendations = this.generateRecommendations(report, parsed, growth, contentDNA);
    const recDoc = await BrandRecommendation.findOneAndUpdate(
      { userId: userObjectId, brandDnaId: dna._id },
      {
        userId: userObjectId,
        profileId: profileObjectId,
        brandDnaId: dna._id,
        recommendations,
        totalRecommendations: recommendations.length,
        confidence: 0.7,
        version: 1,
        isActive: true,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return {
      dna,
      pillars: pillarDoc,
      stories: storyDoc,
      recommendations: recDoc,
      snapshot,
    };
  }

  private extractValuesFromUniqueness(uniqueness: any): IBrandDNA['values'] {
    const valueMap: Record<string, string[]> = {
      Innovation: ['innovate', 'create', 'build', 'novel'],
      Excellence: ['excellence', 'quality', 'best'],
      Impact: ['impact', 'difference', 'change'],
      Growth: ['growth', 'learn', 'develop'],
      Collaboration: ['team', 'together', 'community'],
      Authenticity: ['authentic', 'real', 'genuine'],
      Building: ['build', 'created', 'developed', 'ship'],
      Teaching: ['teach', 'mentor', 'guide', 'share'],
    };

    const allText = uniqueness.factors.map((f: any) => f.factor).join(' ').toLowerCase();
    const values: IBrandDNA['values'] = [];

    for (const [name, keywords] of Object.entries(valueMap)) {
      const matchCount = keywords.filter(k => allText.includes(k)).length;
      if (matchCount > 0) {
        values.push({
          name,
          weight: Math.min(matchCount / keywords.length + 0.3, 1),
          evidence: [`Detected from brand uniqueness analysis: "${name}"`],
          category: matchCount >= 2 ? 'core' : 'secondary',
        });
      }
    }

    if (values.length < 3) {
      const defaults: IBrandDNA['values'] = [
        { name: 'Continuous Learning', weight: 0.7, evidence: ['Inferred from professional journey'], category: 'core' },
        { name: 'Building', weight: 0.7, evidence: ['Inferred from project/experience data'], category: 'core' },
        { name: 'Authenticity', weight: 0.6, evidence: ['Inferred from brand positioning'], category: 'secondary' },
      ];
      for (const d of defaults) {
        if (!values.find(v => v.name === d.name)) values.push(d);
      }
    }

    return values;
  }

  private generateOriginStory(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): string {
    const firstRole = parsed.experience.careerProgression[parsed.experience.careerProgression.length - 1] || 'my first professional role';
    const current = parsed.experience.careerProgression[0] || '';
    const totalYears = parsed.summary.totalExperienceYears;

    return `My journey began with ${firstRole}, where I discovered my passion for ${parsed.summary.industry || 'my field'}. Over ${totalYears} years, I've grown through ${parsed.experience.totalRoles} roles across ${parsed.experience.uniqueCompanies} organizations, each teaching me something new. Today, as ${current}, I ${report.identity.growthDirection?.toLowerCase() || 'continue to push boundaries and create impact'}.`;
  }

  private buildBrandTerritory(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    contentDNA: any
  ): IBrandDNA['brandTerritory'] {
    const identity = report.identity;
    const expertiseNames = [
      ...(report.expertise?.primary || []),
      ...(report.expertise?.secondary || []),
    ].map(e => e.name);

    const owned = [
      ...expertiseNames.slice(0, 5),
      ...parsed.skills.topSkills.slice(0, 3),
      identity.detectedRole || parsed.summary.profileType,
    ].filter(Boolean);

    const adjacent = [
      `${parsed.summary.industry || 'Technology'} Innovation`,
      ...(report.career?.growthPaths?.map(g => g.title) || []),
    ].filter(Boolean);

    const keywords = [
      ...expertiseNames.slice(0, 5),
      identity.growthDirection || parsed.summary.profileType,
      parsed.summary.industry,
    ].filter(Boolean);

    const avoidTopics = contentDNA.topics
      ?.filter((t: any) => t.category === 'avoid')
      ?.map((t: any) => t.topic) || ['Spam', 'Over-promotion', 'Generic content'];

    return {
      owned: [...new Set(owned)],
      adjacent: [...new Set(adjacent)],
      avoid: [...new Set(avoidTopics)] as string[],
      keywords: [...new Set(keywords)],
      hashtags: keywords.map(k => `#${k.replace(/\s+/g, '')}`).filter(Boolean),
    };
  }

  private suggestVisualDirection(archetype: string): IBrandDNA['visualDirection'] {
    const palettes: Record<string, string[]> = {
      'The Builder': ['#E17055', '#00B894', '#2D3436', '#FDCB6E'],
      'The Educator': ['#00B894', '#0984E3', '#DFE6E9', '#FAB1A0'],
      'The Innovator': ['#6C5CE7', '#00CEC9', '#2D3436', '#FDCB6E'],
      'The Authority': ['#2C3E50', '#3498DB', '#ECF0F1', '#E74C3C'],
      'The Connector': ['#E84393', '#6C5CE7', '#DFE6E9', '#00CEC9'],
      'The Storyteller': ['#FDCB6E', '#E17055', '#2D3436', '#00CEC9'],
      'The Expert': ['#0984E3', '#2D3436', '#DFE6E9', '#00B894'],
      'The Visionary': ['#6C5CE7', '#FDCB6E', '#2D3436', '#E17055'],
    };

    const styleMap: Record<string, string> = {
      'The Builder': 'Bold, energetic, action-oriented design with dynamic elements',
      'The Educator': 'Warm, approachable, clean design with friendly visuals',
      'The Innovator': 'Bold, modern, gradient-forward design with geometric elements',
      'The Authority': 'Clean, professional, minimal design with strong typography',
      'The Connector': 'Vibrant, warm, community-focused design with organic shapes',
      'The Storyteller': 'Rich, narrative-driven design with visual storytelling elements',
      'The Expert': 'Precise, structured, detail-oriented design with information hierarchy',
      'The Visionary': 'Bold, aspirational, future-forward design with abstract elements',
    };

    const themeMap: Record<string, string[]> = {
      'The Builder': ['Product shots', 'Team collaboration', 'Workspace culture', 'Process visuals'],
      'The Educator': ['Learning environments', 'People connecting', 'Growth imagery', 'Natural light'],
      'The Innovator': ['Technology', 'Abstract patterns', 'Gradients', 'Futuristic elements'],
      'The Authority': ['Professional portraits', 'Clean backgrounds', 'Industry imagery', 'Data visualizations'],
      'The Connector': ['Community events', 'Diverse groups', 'Network visualization', 'Conversation moments'],
      'The Storyteller': ['Personal moments', 'Behind-the-scenes', 'Journey documentation', 'Authentic shots'],
      'The Expert': ['Technical diagrams', 'Industry tools', 'Workspace focus', 'Certification imagery'],
      'The Visionary': ['Abstract concepts', 'Future technology', 'Nature + tech fusion', 'Panoramic views'],
    };

    const palette = palettes[archetype] || ['#6C5CE7', '#00CEC9', '#2D3436', '#FDCB6E'];
    return {
      colorPalette: palette,
      style: styleMap[archetype] || 'Clean, modern, professional design',
      imageryThemes: themeMap[archetype] || ['Professional imagery', 'Clean backgrounds'],
    };
  }

  private analyzeCompetitors(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IBrandDNA['competitorAnalysis'] {
    const topSkills = parsed.skills.topSkills.slice(0, 2);
    const industry = parsed.summary.industry || 'Technology';

    if (topSkills.length === 0) {
      return [{
        name: `Industry peers in ${industry}`,
        position: 'Established professionals with similar expertise',
        strengths: ['Strong networks', 'Consistent content creation', 'Clear personal branding'],
        weaknesses: ['May lack your unique combination of skills', 'Different career trajectory'],
        differentiation: `Your ${parsed.experience.totalRoles} roles across ${parsed.experience.uniqueCompanies} companies provide a unique multi-perspective advantage`,
      }];
    }

    return topSkills.map((skill, i) => ({
      name: i === 0 ? `${skill} specialists in ${industry}` : `General ${industry} professionals`,
      position: i === 0
        ? `Professionals focused specifically on ${skill}`
        : `Broad ${industry} practitioners`,
      strengths: i === 0
        ? ['Deep specialization', 'Focused content', 'Targeted network']
        : ['Wide reach', 'General appeal', 'Cross-functional visibility'],
      weaknesses: i === 0
        ? ['Narrow perspective', 'Limited cross-domain innovation']
        : ['Less depth', 'Diffuse personal brand'],
      differentiation: i === 0
        ? `Your combination of ${skill} with ${parsed.skills.topSkills[1] || 'other skills'} creates a unique hybrid value proposition`
        : `Your ${parsed.summary.totalExperienceYears}+ years across ${parsed.experience.uniqueCompanies} organizations gives you unmatched breadth and depth`,
    }));
  }

  private computeBrandScore(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    contentDNA: any
  ): number {
    let score = 0;

    if (parsed.profile.headline) score += 10;
    if ((parsed.profile.about?.length || 0) > 100) score += 10;

    score += Math.min(parsed.skills.topSkills.length * 3, 15);

    score += Math.min(parsed.content.totalPosts * 2, 10);

    score += parsed.summary.totalCertifications > 0 ? 5 : 0;
    score += parsed.summary.totalProjects > 2 ? 5 : 0;
    score += parsed.experience.uniqueCompanies > 1 ? 5 : 0;

    score += Math.min(contentDNA.contentAuthorityScore * 0.3, 20);

    score += parsed.content.averageEngagement > 50 ? 5 : 0;

    score += report.scores?.profileCompleteness?.current ? Math.round(report.scores.profileCompleteness.current * 0.2) : 0;

    score += parsed.summary.totalExperienceYears > 5 ? 5 : parsed.summary.totalExperienceYears > 2 ? 3 : 1;

    return Math.min(score, 100);
  }

  private generateRecommendations(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    growth: any,
    contentDNA: any
  ): any[] {
    const recommendations: any[] = [];

    if (parsed.content.totalPosts < 10) {
      recommendations.push({
        category: 'content',
        priority: 'critical',
        title: 'Start Publishing Content',
        description: `With only ${parsed.content.totalPosts} posts, you're missing out on building authority.`,
        rationale: 'Content is the primary driver of personal brand growth on LinkedIn',
        actionItems: [
          'Publish 3-4 times per week',
          'Turn your projects into case studies',
          'Share lessons from your current role',
        ],
        expectedImpact: 'Increased visibility and authority',
        effort: 'medium',
        timeframe: 'Ongoing',
        metrics: { currentPosts: parsed.content.totalPosts, targetPosts: 50 },
      });
    }

    if (parsed.summary.totalCertifications < 2) {
      recommendations.push({
        category: 'skills',
        priority: 'high',
        title: 'Earn Relevant Certifications',
        description: 'Certifications validate your skills and improve profile credibility.',
        rationale: 'Profiles with certifications get 4x more profile views',
        actionItems: [
          'Identify the top 3 certifications in your field',
          'Create a study schedule',
          'Share your certification journey on LinkedIn',
        ],
        expectedImpact: 'Improved credibility and searchability',
        effort: 'medium',
        timeframe: '3-6 months',
        metrics: { currentCerts: parsed.summary.totalCertifications, targetCerts: 3 },
      });
    }

    const criticalGaps = (report.gaps || []).filter((g: any) => g.severity === 'critical');
    for (const gap of criticalGaps.slice(0, 2)) {
      recommendations.push({
        category: 'positioning',
        priority: 'critical',
        title: `Fix: ${gap.title}`,
        description: gap.recommendation,
        rationale: gap.impact,
        actionItems: [gap.recommendation],
        expectedImpact: gap.impact,
        effort: gap.effort,
        timeframe: 'Immediate',
        metrics: { severity: gap.severity },
      });
    }

    if (contentDNA.contentAuthorityScore < 50) {
      recommendations.push({
        category: 'positioning',
        priority: 'high',
        title: 'Strengthen Your Authority Signals',
        description: 'Your content authority score is lower than ideal. Build depth in your expertise areas.',
        rationale: 'Higher authority score leads to better content performance and opportunities',
        actionItems: [
          'Publish longer-form content on your primary expertise',
          'Share data and metrics from your work',
          'Engage with other thought leaders in your space',
        ],
        expectedImpact: 'Increased authority score',
        effort: 'medium',
        timeframe: '3 months',
        metrics: { currentScore: contentDNA.contentAuthorityScore, targetScore: 60 },
      });
    }

    const milestones = growth.milestones || [];
    for (const ms of milestones.slice(0, 2)) {
      recommendations.push({
        category: 'growth',
        priority: ms.priority === 'critical' ? 'critical' : 'high',
        title: ms.title,
        description: ms.description,
        rationale: 'Identified as key growth opportunity',
        actionItems: [ms.description],
        expectedImpact: ms.description,
        effort: 'medium',
        timeframe: ms.timeframe.replace('_', ' '),
        metrics: ms.metrics,
      });
    }

    return recommendations;
  }
}

export const brandDNAOrchestrator = new BrandDNAOrchestrator();
