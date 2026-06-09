import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';
import type { IPillarMetrics } from '../../../models/brand/BrandPillar';

const logger = pino();

export interface PillarOutput {
  name: string;
  description: string;
  topics: string[];
  audience: string[];
  contentFormats: string[];
  postingCadence: string;
  metrics: IPillarMetrics;
  evidence: string[];
}

export class BrandContentPillarEngine {

  generate(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): PillarOutput[] {
    const pillars: PillarOutput[] = [];
    const id = report.identity;

    if (parsed.summary.profileType === 'student' || parsed.summary.careerStage === 'entry-level' || id.detectedRole?.toLowerCase().includes('student')) {
      pillars.push(this.buildStudentJourneyPillar(report, parsed));
    }

    const topSkills = parsed.skills.topSkills;
    if (topSkills.length >= 2) {
      pillars.push(this.buildTechnicalPillar(report, parsed, topSkills.slice(0, 3)));
    }

    if (parsed.content.totalPosts > 2 || /content|write|blog|create|build.?in.?public/i.test(parsed.profile.about || '')) {
      pillars.push(this.buildBuildingInPublicPillar(report, parsed));
    }

    if (parsed.summary.profileType === 'founder' || /founder|startup|co.?founder/i.test(parsed.profile.headline || '')) {
      pillars.push(this.buildFounderPillar(report, parsed));
    }

    if (parsed.summary.totalProjects > 2) {
      pillars.push(this.buildProjectShowcasePillar(report, parsed));
    }

    if (parsed.summary.totalCertifications > 2 || parsed.experience.hasGaps || parsed.summary.careerStage === 'career-transition') {
      pillars.push(this.buildCareerGrowthPillar(report, parsed));
    }

    if (/ai|machine learning|data/i.test(parsed.profile.headline || '') || parsed.skills.topSkills.some(s => /ai|ml|data|analytics/i.test(s))) {
      pillars.push(this.buildAIPillar(report, parsed));
    }

    const emerging = report.expertise?.emerging || [];
    if (emerging.length > 0) {
      pillars.push({
        name: `Exploring ${emerging[0].name}`,
        description: `Documenting the journey of learning and experimenting with ${emerging[0].name}`,
        topics: [emerging[0].name, 'Learning journey', 'Experiments', 'Resources'],
        audience: ['Self-learners', 'Curious professionals'],
        contentFormats: ['Tutorials', 'Progress updates', 'Resource reviews'],
        postingCadence: 'Weekly',
        metrics: {
          authorityScore: Math.round(emerging[0].confidence),
          opportunityScore: 85,
          engagementPotential: 75,
          careerAlignment: 80,
          overallScore: Math.round((emerging[0].confidence + 85 + 75 + 80) / 4),
        },
        evidence: [`Emerging expertise in ${emerging[0].name}`],
      });
    }

    while (pillars.length < 3) {
      const fallbacks = [
        this.buildCareerGrowthPillar(report, parsed),
        this.buildTechnicalPillar(report, parsed, parsed.skills.topSkills.slice(0, 3)),
        this.buildBuildingInPublicPillar(report, parsed),
      ];
      for (const fb of fallbacks) {
        if (!pillars.find(p => p.name === fb.name)) {
          pillars.push(fb);
          if (pillars.length >= 3) break;
        }
      }
      break;
    }

    return pillars.slice(0, 7);
  }

  private buildStudentJourneyPillar(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): PillarOutput {
    return {
      name: 'Student Journey',
      description: 'Documenting the path from student to professional — projects, internships, interviews, and growth',
      topics: [
        'Internship preparation',
        'Interview experiences',
        'Side projects',
        'Learning resources',
        'Career decisions',
      ],
      audience: ['Students', 'Junior developers', 'Career switchers'],
      contentFormats: ['Personal stories', 'How-to guides', 'Lessons learned', 'Progress updates'],
      postingCadence: '3-4 times per week',
      metrics: {
        authorityScore: 45,
        opportunityScore: 90,
        engagementPotential: 85,
        careerAlignment: 95,
        overallScore: Math.round((45 + 90 + 85 + 95) / 4),
      },
      evidence: [
        'Currently in student phase',
        `${parsed.experience.totalRoles} internships or roles`,
        `${parsed.summary.totalProjects} projects built`,
      ],
    };
  }

  private buildTechnicalPillar(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    skills: string[]
  ): PillarOutput {
    const skillText = skills.join(', ');
    return {
      name: `${skills[0] || 'Technical'} Deep Dive`,
      description: `Practical tutorials, architecture decisions, and best practices in ${skillText}`,
      topics: skills,
      audience: ['Developers', 'Engineers', 'Technical leads'],
      contentFormats: ['Tutorials', 'Code walkthroughs', 'Architecture breakdowns', 'Tool comparisons'],
      postingCadence: '2-3 times per week',
      metrics: {
        authorityScore: Math.min(parsed.summary.totalExperienceYears * 8 + 30, 85),
        opportunityScore: 80,
        engagementPotential: 75,
        careerAlignment: 85,
        overallScore: Math.round((Math.min(parsed.summary.totalExperienceYears * 8 + 30, 85) + 80 + 75 + 85) / 4),
      },
      evidence: [
        `${parsed.skills.total} skills in profile`,
        `${parsed.summary.totalExperienceYears}+ years experience`,
        `Top skills: ${skillText}`,
      ],
    };
  }

  private buildBuildingInPublicPillar(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): PillarOutput {
    return {
      name: 'Building In Public',
      description: 'Transparent documentation of projects, products, and professional growth in real-time',
      topics: [
        'Project progress',
        'Challenges & solutions',
        'Technical decisions',
        'Metrics & results',
      ],
      audience: ['Builders', 'Founders', 'Content creators', 'Developers'],
      contentFormats: ['Progress threads', 'Behind-the-scenes', 'Post-mortems', 'Metrics breakdowns'],
      postingCadence: 'Daily updates + Weekly deep dives',
      metrics: {
        authorityScore: 50,
        opportunityScore: 85,
        engagementPotential: 90,
        careerAlignment: 80,
        overallScore: Math.round((50 + 85 + 90 + 80) / 4),
      },
      evidence: [
        `${parsed.content.totalPosts} posts published`,
        'Building journey content',
        parsed.profile.about ? 'About section mentions building' : '',
      ].filter(Boolean),
    };
  }

  private buildFounderPillar(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): PillarOutput {
    return {
      name: 'Startup Building',
      description: 'Honest stories about building a startup — product, team, fundraising, and growth',
      topics: [
        'Product development',
        'Founder lessons',
        'Team building',
        'Fundraising insights',
        'Market strategy',
      ],
      audience: ['Founders', 'Aspiring founders', 'Investors', 'Startup employees'],
      contentFormats: ['Founder stories', 'Strategy breakdowns', 'Metrics', 'Lessons learned'],
      postingCadence: '2-3 times per week',
      metrics: {
        authorityScore: 70,
        opportunityScore: 85,
        engagementPotential: 80,
        careerAlignment: 90,
        overallScore: Math.round((70 + 85 + 80 + 90) / 4),
      },
      evidence: [
        'Profile type: founder',
        parsed.profile.headline || '',
        parsed.profile.about || '',
      ].filter(Boolean),
    };
  }

  private buildProjectShowcasePillar(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): PillarOutput {
    return {
      name: 'Project Showcase',
      description: 'Deep dives into projects — architecture decisions, challenges, and what was learned',
      topics: [
        'Project architecture',
        'Technical challenges',
        'Lessons learned',
        'Impact & results',
      ],
      audience: ['Developers', 'Hiring managers', 'Tech enthusiasts'],
      contentFormats: ['Case studies', 'Technical deep dives', 'Architecture reviews', 'Demo videos'],
      postingCadence: '1-2 times per week',
      metrics: {
        authorityScore: Math.min(parsed.summary.totalProjects * 12 + 30, 80),
        opportunityScore: 75,
        engagementPotential: 70,
        careerAlignment: 85,
        overallScore: Math.round((Math.min(parsed.summary.totalProjects * 12 + 30, 80) + 75 + 70 + 85) / 4),
      },
      evidence: [
        `${parsed.summary.totalProjects} projects in profile`,
        'Demonstrated project-building capability',
      ],
    };
  }

  private buildCareerGrowthPillar(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): PillarOutput {
    return {
      name: 'Career Growth & Learning',
      description: 'Strategies and insights for professional development, skill building, and career navigation',
      topics: [
        'Skill development',
        'Certification prep',
        'Interview preparation',
        'Career transitions',
        'Networking strategies',
      ],
      audience: ['Career changers', 'Early professionals', 'Skill builders'],
      contentFormats: ['Guides', 'Personal stories', 'Resource lists', 'Strategy posts'],
      postingCadence: '1-2 times per week',
      metrics: {
        authorityScore: Math.min(parsed.summary.totalCertifications * 15 + 30, 75),
        opportunityScore: 80,
        engagementPotential: 85,
        careerAlignment: 90,
        overallScore: Math.round((Math.min(parsed.summary.totalCertifications * 15 + 30, 75) + 80 + 85 + 90) / 4),
      },
      evidence: [
        `${parsed.summary.totalCertifications} certifications`,
        parsed.summary.totalExperienceYears > 0 ? `${parsed.summary.totalExperienceYears} years of career experience` : '',
      ].filter(Boolean),
    };
  }

  private buildAIPillar(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): PillarOutput {
    const aiSkills = parsed.skills.topSkills.filter(s => /ai|ml|data|analytics/i.test(s));
    return {
      name: 'AI & Technology',
      description: 'Exploring and building with AI — from practical applications to future possibilities',
      topics: [
        'AI project tutorials',
        'Tool reviews',
        'Technical insights',
        'Industry trends',
      ],
      audience: ['AI enthusiasts', 'Developers', 'Tech leaders', 'Innovators'],
      contentFormats: ['Tutorials', 'Project walkthroughs', 'Trend analysis', 'Opinion pieces'],
      postingCadence: '2-3 times per week',
      metrics: {
        authorityScore: Math.min(aiSkills.length * 15 + 35, 80),
        opportunityScore: 95,
        engagementPotential: 85,
        careerAlignment: 90,
        overallScore: Math.round((Math.min(aiSkills.length * 15 + 35, 80) + 95 + 85 + 90) / 4),
      },
      evidence: [
        ...aiSkills.map(s => `AI/ML skill: ${s}`),
        'AI-related profile content',
      ],
    };
  }
}

export const brandContentPillarEngine = new BrandContentPillarEngine();
