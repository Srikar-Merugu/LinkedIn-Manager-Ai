import mongoose from 'mongoose';
import pino from 'pino';
import { BrandDNA, IBrandDNA } from '../../models/brand/BrandDNA';
import { VoiceProfile, IVoiceProfile } from '../../models/brand/VoiceProfile';
import { VoiceSample } from '../../models/onboarding/VoiceSample';
import { LinkedInActivity } from '../../models/LinkedInActivity';
import { LinkedInProfile } from '../../models/LinkedInProfile';
import type { ExpandedIntelligenceReport, ProfessionalIdentity, LinkedInUserProfile } from '../../types/linkedin';
import type { ParsedProfile } from '../linkedin/ProfileParser';

const logger = pino();

type ArchetypeData = {
  name: string;
  confidence: number;
  description: string;
};

type ValueData = {
  name: string;
  weight: number;
  evidence: string[];
  category: 'core' | 'secondary' | 'aspirational';
};

export class BrandDNAService {

  async getBrandDNA(userId: string, profileId?: string): Promise<IBrandDNA | null> {
    const query: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId), isActive: true };
    if (profileId) query.profileId = new mongoose.Types.ObjectId(profileId);
    return BrandDNA.findOne(query).sort({ version: -1 });
  }

  async generateBrandDNA(
    userId: string,
    profileId: string,
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    linkedinProfile: LinkedInUserProfile
  ): Promise<IBrandDNA> {
    const archetype = this.detectArchetype(report, parsed);
    const values = this.extractValues(report, parsed);
    const uvp = this.generateUVP(report, parsed, archetype);
    const mission = this.generateMission(report, archetype);
    const originStory = this.generateOriginStory(report, parsed, linkedinProfile);
    const audience = this.defineAudience(report, parsed);
    const territory = this.defineBrandTerritory(report, parsed);
    const visualDirection = this.suggestVisualDirection(archetype);
    const competitors = this.analyzeCompetitors(report, parsed);

    const existing = await BrandDNA.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      profileId: new mongoose.Types.ObjectId(profileId),
      isActive: true,
    });

    const dnaData = {
      userId: new mongoose.Types.ObjectId(userId),
      profileId: new mongoose.Types.ObjectId(profileId),
      archetype: archetype.name,
      archetypeConfidence: archetype.confidence,
      archetypeDescription: archetype.description,
      values,
      uniqueValueProposition: uvp,
      missionStatement: mission,
      originStory,
      targetAudience: audience,
      brandTerritory: territory,
      visualDirection,
      competitorAnalysis: competitors,
      confidence: Math.min(archetype.confidence + 0.1, 1),
      status: 'draft' as const,
      version: 1,
      versions: [],
      isActive: true,
    };

    if (existing) {
      existing.archetype = archetype.name;
      existing.archetypeConfidence = archetype.confidence;
      existing.archetypeDescription = archetype.description;
      existing.values = values;
      existing.uniqueValueProposition = uvp;
      existing.missionStatement = mission;
      existing.originStory = originStory;
      existing.targetAudience = audience;
      existing.brandTerritory = territory;
      existing.visualDirection = visualDirection;
      existing.competitorAnalysis = competitors;
      existing.confidence = Math.min(archetype.confidence + 0.1, 1);
      existing.status = 'draft';
      existing.regeneratedAt = new Date();
      await existing.save();
      return existing;
    }

    return BrandDNA.create(dnaData);
  }

  private detectArchetype(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): ArchetypeData {
    const identity = report.identity;
    const headline = parsed.profile.headline || '';
    const about = parsed.profile.about || '';
    const all = `${headline} ${about} ${identity.summary}`.toLowerCase();
    const expertiseNames = [
      ...(report.expertise?.primary || []),
      ...(report.expertise?.secondary || []),
    ].map(e => e.name.toLowerCase());

    const archetypeRules: Array<{
      name: string;
      score: () => number;
      description: string;
    }> = [
      {
        name: 'The Innovator',
        score: () => {
          let s = 0;
          if (/innovate|disrupt|transform|cutting.edge|breakthrough|next.gen|future/.test(all)) s += 0.35;
          if (/startup|building|created|launched|founded/.test(all)) s += 0.2;
          if (identity.growthDirection?.toLowerCase().includes('innovation')) s += 0.2;
          if (/patent|novel|pioneer/.test(all)) s += 0.2;
          return s;
        },
        description: 'A forward-thinking professional who drives change through innovation and novel approaches.',
      },
      {
        name: 'The Authority',
        score: () => {
          let s = 0;
          if (/authority|thought.leader|industry expert|leading|top|recognized/.test(all)) s += 0.3;
          if (report.scores?.authority?.current && report.scores.authority.current > 60) s += 0.25;
          if (/speaker|keynote|panelist|moderator/.test(all)) s += 0.2;
          if (parsed.summary.totalExperienceYears > 10) s += 0.15;
          return s;
        },
        description: 'A recognized industry expert who sets standards and influences through deep knowledge.',
      },
      {
        name: 'The Educator',
        score: () => {
          let s = 0;
          if (/teach|mentor|coach|educat|train|guide|help|learn/.test(all)) s += 0.3;
          if (/professor|instructor|teacher|faculty/.test(all)) s += 0.25;
          if (parsed.content.totalPosts > 10 && parsed.content.averageEngagement > 50) s += 0.2;
          if (expertiseNames.some(n => /teach|educat|learn|coach/.test(n))) s += 0.15;
          return s;
        },
        description: 'A natural teacher who empowers others through knowledge sharing and mentorship.',
      },
      {
        name: 'The Builder',
        score: () => {
          let s = 0;
          if (/built|created|developed|architect|engineer|designed/.test(all)) s += 0.3;
          if (/founder|co-founder|cto|vp.engineering/.test(all)) s += 0.25;
          if (parsed.summary.profileType === 'founder') s += 0.2;
          if (parsed.experience.totalRoles >= 3) s += 0.1;
          return s;
        },
        description: 'A hands-on creator who builds products, teams, and organizations from the ground up.',
      },
      {
        name: 'The Connector',
        score: () => {
          let s = 0;
          if (/connect|network|community|relation|partner|collaborat/.test(all)) s += 0.3;
          if (/recruiter|talent|hr|people|community.manager/.test(all)) s += 0.25;
          if (parsed.content.totalEngagements > 50) s += 0.15;
          if (/ecosystem|alliance|partnership/.test(all)) s += 0.2;
          return s;
        },
        description: 'A relationship-builder who thrives on creating meaningful connections and communities.',
      },
      {
        name: 'The Storyteller',
        score: () => {
          let s = 0;
          if (/story|narrative|content|write|blog|article|author/.test(all)) s += 0.3;
          if (parsed.content.totalPosts > 20) s += 0.2;
          if (/storytelling|content.creator|writer|journalist/.test(all)) s += 0.2;
          if (parsed.content.averageEngagement > 100) s += 0.2;
          return s;
        },
        description: 'A compelling communicator who uses narrative to inspire, inform, and influence.',
      },
      {
        name: 'The Expert',
        score: () => {
          let s = 0;
          if (report.expertise?.primary?.length >= 2) s += 0.25;
          if (parsed.summary.totalSkills > 30) s += 0.15;
          if (parsed.summary.totalCertifications > 3) s += 0.15;
          if (parsed.summary.totalExperienceYears > 8) s += 0.15;
          if (/specialist|expert|senior|principal|staff/.test(all)) s += 0.2;
          return s;
        },
        description: 'A deep specialist with unparalleled expertise in their chosen domain.',
      },
      {
        name: 'The Visionary',
        score: () => {
          let s = 0;
          if (/vision|future|trend|predict|movement|purpose|mission/.test(all)) s += 0.35;
          if (/ceo|founder|director|head/.test(all)) s += 0.2;
          if (identity.growthDirection?.toLowerCase().includes('leadership')) s += 0.2;
          if (/strategic|roadmap|long.term|transform/.test(all)) s += 0.2;
          return s;
        },
        description: 'A strategic leader who paints a compelling picture of what could be and inspires others to join.',
      },
    ];

    const scored = archetypeRules
      .map(rule => ({
        name: rule.name,
        confidence: Math.min(rule.score(), 1),
        description: rule.description,
      }))
      .filter(a => a.confidence > 0);

    if (scored.length === 0) {
      return {
        name: 'The Professional',
        confidence: 0.5,
        description: 'A dedicated professional committed to excellence and continuous growth.',
      };
    }

    scored.sort((a, b) => b.confidence - a.confidence);
    return scored[0];
  }

  private extractValues(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): ValueData[] {
    const all = `${parsed.profile.headline || ''} ${parsed.profile.about || ''} ${report.identity.summary}`.toLowerCase();
    const values: ValueData[] = [];

    const valuePatterns: Array<{ name: string; keywords: string[]; category: 'core' | 'secondary' | 'aspirational' }> = [
      { name: 'Innovation', keywords: ['innovate', 'innovation', 'creative', 'novel', 'new'], category: 'core' },
      { name: 'Excellence', keywords: ['excellence', 'quality', 'best', 'premium', 'top'], category: 'core' },
      { name: 'Integrity', keywords: ['integrity', 'honest', 'ethic', 'trust', 'transparent'], category: 'core' },
      { name: 'Impact', keywords: ['impact', 'change', 'difference', 'transform', 'result'], category: 'core' },
      { name: 'Growth', keywords: ['growth', 'learn', 'develop', 'progress', 'advance'], category: 'core' },
      { name: 'Collaboration', keywords: ['collaborat', 'team', 'together', 'partner', 'community'], category: 'core' },
      { name: 'Empowerment', keywords: ['empower', 'enable', 'support', 'help', 'uplift'], category: 'core' },
      { name: 'Knowledge', keywords: ['knowledge', 'expertise', 'learn', 'educat', 'skill'], category: 'secondary' },
      { name: 'Authenticity', keywords: ['authentic', 'real', 'genuine', 'true', 'honest'], category: 'secondary' },
      { name: 'Leadership', keywords: ['leader', 'lead', 'guide', 'direct', 'mentor'], category: 'secondary' },
      { name: 'Diversity', keywords: ['divers', 'inclus', 'equal', 'belong', 'equity'], category: 'secondary' },
      { name: 'Sustainability', keywords: ['sustain', 'green', 'environment', 'eco', 'responsib'], category: 'aspirational' },
      { name: 'Simplicity', keywords: ['simple', 'clean', 'elegant', 'minimal', 'clear'], category: 'aspirational' },
      { name: 'Global Thinking', keywords: ['global', 'world', 'international', 'universal', 'planet'], category: 'aspirational' },
    ];

    for (const pattern of valuePatterns) {
      const matches = pattern.keywords.filter(k => all.includes(k));
      if (matches.length > 0) {
        values.push({
          name: pattern.name,
          weight: Math.min(matches.length / pattern.keywords.length + 0.2, 1),
          evidence: matches.map(k => `Found in profile: "${k}"`),
          category: pattern.category,
        });
      }
    }

    if (values.length < 3) {
      const defaults = [
        { name: 'Professionalism', weight: 0.6, category: 'core' as const },
        { name: 'Continuous Learning', weight: 0.5, category: 'secondary' as const },
        { name: 'Results-Driven', weight: 0.5, category: 'core' as const },
      ];
      for (const d of defaults) {
        if (!values.find(v => v.name === d.name)) {
          values.push({ ...d, evidence: ['Inferred from professional background'] });
        }
      }
    }

    return values;
  }

  private generateUVP(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    archetype: ArchetypeData
  ): string {
    const identity = report.identity;
    const expertise = report.expertise;
    const topSkills = parsed.skills.topSkills.slice(0, 3);
    const primaryArea = expertise?.primary?.[0]?.name || topSkills[0] || 'professional expertise';

    const templates = [
      `I help ${identity.audienceType || 'professionals'} achieve ${identity.growthDirection || 'career growth'} through ${primaryArea.toLowerCase()}.`,
      `Combining deep expertise in ${primaryArea.toLowerCase()} with a passion for ${identity.growthDirection || 'driving results'}, I empower ${identity.audienceType || 'organizations'} to ${identity.potentialCareerPaths?.[0]?.toLowerCase() || 'reach their full potential'}.`,
      `As a ${archetype.name.toLowerCase()}, I leverage ${parsed.summary.totalExperienceYears}+ years of experience in ${primaryArea.toLowerCase()} to deliver ${identity.growthDirection?.toLowerCase() || 'exceptional results'} for ${identity.audienceType || 'my clients and partners'}.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateMission(
    report: ExpandedIntelligenceReport,
    archetype: ArchetypeData
  ): string {
    const identity = report.identity;
    const templates = [
      `To ${identity.growthDirection?.toLowerCase() || 'drive meaningful impact'} by leveraging ${archetype.name.toLowerCase()} thinking and deep expertise.`,
      `Empowering ${identity.audienceType || 'professionals'} to achieve their full potential through ${identity.growthDirection?.toLowerCase() || 'strategic innovation and growth'}.`,
      `Building a legacy of ${archetype.name.toLowerCase()} excellence — one ${identity.growthDirection?.toLowerCase() || 'meaningful connection'} at a time.`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
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

  private defineAudience(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IBrandDNA['targetAudience'] {
    const identity = report.identity;
    const primaryAudience = identity.audienceType || 'Professionals';
    const industry = parsed.summary.industry || 'Technology';

    const primary = [primaryAudience];
    const secondary = [
      `${industry} Leaders`,
      'Aspiring Professionals',
    ];

    const painPoints = [
      `Navigating ${industry.toLowerCase()} career growth`,
      `Building a recognizable personal brand in ${industry.toLowerCase()}`,
      `Staying ahead of industry trends and innovations`,
    ];

    const aspirations = [
      `Become a recognized ${industry.toLowerCase()} authority`,
      `Scale professional impact and influence`,
      `Build meaningful ${industry.toLowerCase()} community connections`,
    ];

    return {
      primary,
      secondary,
      demographics: { industry, experience_level: parsed.summary.careerStage },
      painPoints,
      aspirations,
    };
  }

  private defineBrandTerritory(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
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

    return {
      owned: [...new Set(owned)],
      adjacent: [...new Set(adjacent)],
      avoid: ['Spam', 'Over-promotion', 'Generic content'],
      keywords: [...new Set(keywords)],
      hashtags: keywords.map(k => `#${k.replace(/\s+/g, '')}`).filter(Boolean),
    };
  }

  private suggestVisualDirection(archetype: ArchetypeData): IBrandDNA['visualDirection'] {
    const palettes: Record<string, string[]> = {
      'The Innovator': ['#6C5CE7', '#00CEC9', '#2D3436', '#FDCB6E'],
      'The Authority': ['#2C3E50', '#3498DB', '#ECF0F1', '#E74C3C'],
      'The Educator': ['#00B894', '#0984E3', '#DFE6E9', '#FAB1A0'],
      'The Builder': ['#E17055', '#00B894', '#2D3436', '#FDCB6E'],
      'The Connector': ['#E84393', '#6C5CE7', '#DFE6E9', '#00CEC9'],
      'The Storyteller': ['#FDCB6E', '#E17055', '#2D3436', '#00CEC9'],
      'The Expert': ['#0984E3', '#2D3436', '#DFE6E9', '#00B894'],
      'The Visionary': ['#6C5CE7', '#FDCB6E', '#2D3436', '#E17055'],
    };

    const palette = palettes[archetype.name] || palettes['The Professional'];
    const styleMap: Record<string, string> = {
      'The Innovator': 'Bold, modern, gradient-forward design with geometric elements',
      'The Authority': 'Clean, professional, minimal design with strong typography',
      'The Educator': 'Warm, approachable, clean design with friendly visuals',
      'The Builder': 'Bold, energetic, action-oriented design with dynamic elements',
      'The Connector': 'Vibrant, warm, community-focused design with organic shapes',
      'The Storyteller': 'Rich, narrative-driven design with visual storytelling elements',
      'The Expert': 'Precise, structured, detail-oriented design with information hierarchy',
      'The Visionary': 'Bold, aspirational, future-forward design with abstract elements',
    };

    const themeMap: Record<string, string[]> = {
      'The Innovator': ['Technology', 'Abstract patterns', 'Gradients', 'Futuristic elements'],
      'The Authority': ['Professional portraits', 'Clean backgrounds', 'Industry imagery', 'Data visualizations'],
      'The Educator': ['Learning environments', 'People connecting', 'Growth imagery', 'Natural light'],
      'The Builder': ['Product shots', 'Team collaboration', 'Workspace culture', 'Process visuals'],
      'The Connector': ['Community events', 'Diverse groups', 'Network visualization', 'Conversation moments'],
      'The Storyteller': ['Personal moments', 'Behind-the-scenes', 'Journey documentation', 'Authentic shots'],
      'The Expert': ['Technical diagrams', 'Industry tools', 'Workspace focus', 'Certification imagery'],
      'The Visionary': ['Abstract concepts', 'Future technology', 'Nature + tech fusion', 'Panoramic views'],
    };

    return {
      colorPalette: palette,
      style: styleMap[archetype.name] || 'Clean, modern, professional design',
      imageryThemes: themeMap[archetype.name] || ['Professional imagery', 'Clean backgrounds'],
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
}

export const brandDNAService = new BrandDNAService();
