import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';

const logger = pino();

export interface AudiencePersona {
  name: string;
  description: string;
  relevanceScore: number;
  contentPreferences: string[];
  painPoints: string[];
  engagementStrategy: string;
}

export interface AudienceAnalysis {
  personas: AudiencePersona[];
  primaryAudience: string[];
  secondaryAudience: string[];
  demographicInsights: Record<string, string>;
  contentPreferences: string[];
  recommendedTone: string;
  confidence: number;
}

export class AudienceIntelligenceEngine {

  analyze(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): AudienceAnalysis {
    const personas = this.buildPersonas(report, parsed);
    const primary = this.getPrimaryAudience(personas);
    const secondary = this.getSecondaryAudience(personas);
    const demographicInsights = this.extractDemographics(report, parsed);
    const contentPrefs = this.inferContentPreferences(personas);
    const tone = this.recommendTone(report, parsed);

    return {
      personas,
      primaryAudience: primary,
      secondaryAudience: secondary,
      demographicInsights,
      contentPreferences: contentPrefs,
      recommendedTone: tone,
      confidence: Math.min(personas.length * 0.15 + 0.3, 1),
    };
  }

  private buildPersonas(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): AudiencePersona[] {
    const identity = report.identity;
    const personas: AudiencePersona[] = [];
    const about = (parsed.profile.about || '').toLowerCase();
    const headline = (parsed.profile.headline || '').toLowerCase();
    const industry = parsed.summary.industry || 'Technology';
    const profileType = parsed.summary.profileType;
    const careerStage = parsed.summary.careerStage;

    if (profileType === 'student' || careerStage === 'entry-level') {
      personas.push({
        name: 'Students & Early Career',
        description: `Students and early-career professionals looking to break into ${industry}`,
        relevanceScore: 0.85,
        contentPreferences: ['Career advice', 'Learning resources', 'Internship guides', 'Project tutorials'],
        painPoints: ['Finding first job', 'Building portfolio', 'Getting mentorship', 'Standing out'],
        engagementStrategy: 'Share personal learning journey with actionable tips',
      });
    }

    if (parsed.skills.topSkills.some(s => /developer|engineer|coder|programmer/i.test(s))) {
      personas.push({
        name: 'Software Developers',
        description: `Developers interested in ${parsed.skills.topSkills.slice(0, 2).join(', ')} and building real products`,
        relevanceScore: 0.8,
        contentPreferences: ['Technical tutorials', 'Architecture decisions', 'Code examples', 'Project walkthroughs'],
        painPoints: ['Keeping skills current', 'Building side projects', 'Technical interviews', 'Career progression'],
        engagementStrategy: 'Share technical insights with practical code examples',
      });
    }

    if (profileType === 'founder' || /founder|startup|entrepreneur/i.test(headline)) {
      personas.push({
        name: 'Founders & Startup Builders',
        description: 'Founders and entrepreneurs building products and companies',
        relevanceScore: 0.9,
        contentPreferences: ['Building in public', 'Startup lessons', 'Product decisions', 'Growth strategies'],
        painPoints: ['Customer acquisition', 'Fundraising', 'Team building', 'Product-market fit'],
        engagementStrategy: 'Share honest startup journey with real metrics and lessons',
      });
    }

    if (/ai|machine learning|data/i.test(about) || parsed.skills.topSkills.some(s => /ai|ml|data/i.test(s))) {
      personas.push({
        name: 'AI & Tech Enthusiasts',
        description: `Professionals interested in AI, ML, and the latest in ${industry}`,
        relevanceScore: 0.75,
        contentPreferences: ['AI tutorials', 'ML project walkthroughs', 'Tech trends', 'Tools & frameworks'],
        painPoints: ['Keeping up with AI advances', 'Practical AI applications', 'Building AI portfolio'],
        engagementStrategy: 'Break down complex AI concepts into practical tutorials',
      });
    }

    if (parsed.content.totalPosts > 5 || /content|write|blog|create/i.test(about)) {
      personas.push({
        name: 'Content Creators & Builders in Public',
        description: 'Professionals who create content and share their building journey',
        relevanceScore: 0.7,
        contentPreferences: ['Building in public stories', 'Content strategy tips', 'Growth tactics', 'Platform insights'],
        painPoints: ['Content consistency', 'Growing audience', 'Monetizing content', 'Finding time'],
        engagementStrategy: 'Share transparent building journey with actionable content tips',
      });
    }

    personas.push({
      name: `${industry} Professionals`,
      description: `Experienced professionals in ${industry} looking to stay ahead`,
      relevanceScore: 0.65,
      contentPreferences: ['Industry insights', 'Best practices', 'Career growth', 'Networking strategies'],
      painPoints: ['Industry disruption', 'Career stagnation', 'Skill obsolescence', 'Network growth'],
      engagementStrategy: 'Provide industry-specific insights and actionable career advice',
    });

    const pathAudience = identity.potentialCareerPaths || [];
    for (const path of pathAudience) {
      if (!personas.some(p => p.name.toLowerCase().includes(path.toLowerCase().split(' ')[0]?.toLowerCase()))) {
        personas.push({
          name: `Aspiring ${path}`,
          description: `Professionals working toward becoming a ${path}`,
          relevanceScore: 0.6,
          contentPreferences: ['Career guides', 'Skill roadmaps', 'Role insights', 'Preparation tips'],
          painPoints: ['Career transition', 'Skill gaps', 'Lack of guidance', 'Imposter syndrome'],
          engagementStrategy: `Share your journey and insights about becoming a ${path}`,
        });
      }
    }

    return personas.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private getPrimaryAudience(personas: AudiencePersona[]): string[] {
    return personas
      .filter(p => p.relevanceScore >= 0.75)
      .slice(0, 3)
      .map(p => p.name);
  }

  private getSecondaryAudience(personas: AudiencePersona[]): string[] {
    return personas
      .filter(p => p.relevanceScore < 0.75)
      .slice(0, 3)
      .map(p => p.name);
  }

  private extractDemographics(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): Record<string, string> {
    return {
      primary_industry: parsed.summary.industry || 'Technology',
      experience_level: parsed.summary.careerStage,
      career_stage: `${parsed.summary.totalExperienceYears}+ years`,
      education_level: parsed.education.highestDegree || 'Not specified',
      skill_count: `${parsed.skills.total} skills`,
      content_frequency: parsed.content.totalPosts > 0 ? `${Math.round(parsed.content.totalPosts / Math.max(parsed.summary.totalExperienceYears, 1))} posts/year` : 'No content yet',
    };
  }

  private inferContentPreferences(personas: AudiencePersona[]): string[] {
    const prefs = new Set<string>();
    for (const p of personas) {
      for (const c of p.contentPreferences) {
        prefs.add(c);
      }
    }
    return [...prefs].slice(0, 8);
  }

  private recommendTone(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): string {
    const about = (parsed.profile.about || '').toLowerCase();
    const profileType = parsed.summary.profileType;

    if (/passionate|love|excited|thrilled/i.test(about)) return 'Energetic and passionate';
    if (/professional|results|deliver|execute/i.test(about)) return 'Professional and authoritative';
    if (/help|support|guide|mentor|teach/i.test(about)) return 'Warm and educational';
    if (/innovate|disrupt|future|cutting/i.test(about)) return 'Bold and forward-thinking';
    if (profileType === 'student') return 'Relatable and growth-oriented';
    if (profileType === 'founder') return 'Authentic and transparent';

    return 'Professional and approachable';
  }
}

export const audienceIntelligenceEngine = new AudienceIntelligenceEngine();
