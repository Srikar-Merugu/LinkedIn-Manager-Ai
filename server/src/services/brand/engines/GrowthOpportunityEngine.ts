import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';
import type { IGrowthMilestone, IBrandDNA } from '../../../models/brand/BrandDNA';

const logger = pino();

export interface GrowthOpportunityOutput {
  milestones: IGrowthMilestone[];
  overallPriority: string;
  focusAreas: string[];
  estimatedTimeline: string;
}

export class GrowthOpportunityEngine {

  analyze(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): GrowthOpportunityOutput {
    const milestones = this.buildMilestones(report, parsed);
    const focusAreas = this.identifyFocusAreas(report, parsed);
    const overallPriority = this.determineOverallPriority(milestones);

    return {
      milestones: milestones.sort((a, b) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] || 0) - (order[b.priority] || 0);
      }),
      overallPriority,
      focusAreas,
      estimatedTimeline: milestones.length > 0 ? 'Next 12 months' : 'No milestones defined yet',
    };
  }

  private buildMilestones(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IGrowthMilestone[] {
    const milestones: IGrowthMilestone[] = [];

    if (parsed.content.totalPosts < 10) {
      milestones.push({
        title: 'Start Building Content Presence',
        description: `Begin posting regularly to establish thought leadership. Currently at ${parsed.content.totalPosts} posts.`,
        timeframe: 'now',
        priority: 'critical',
        metrics: { currentPosts: parsed.content.totalPosts, targetPosts: 10 },
      });
    }

    if (parsed.skills.total < 20) {
      milestones.push({
        title: 'Expand Skill Set',
        description: `Grow from ${parsed.skills.total} to 30+ skills on your profile to improve searchability.`,
        timeframe: '90_days',
        priority: 'high',
        metrics: { currentSkills: parsed.skills.total, targetSkills: 30 },
      });
    }

    if (parsed.summary.totalCertifications < 2) {
      milestones.push({
        title: 'Earn Industry Certifications',
        description: 'Certifications validate expertise and improve credibility. Start with one relevant certification.',
        timeframe: '90_days',
        priority: 'high',
        metrics: { currentCerts: parsed.summary.totalCertifications, targetCerts: 2 },
      });
    }

    if (parsed.summary.totalProjects < 5) {
      milestones.push({
        title: 'Build More Projects',
        description: `Grow your project portfolio from ${parsed.summary.totalProjects} to 5+ projects.`,
        timeframe: '6_months',
        priority: 'high',
        metrics: { currentProjects: parsed.summary.totalProjects, targetProjects: 5 },
      });
    }

    const gaps = report.gaps || [];
    const criticalGaps = gaps.filter(g => g.severity === 'critical');
    for (const gap of criticalGaps.slice(0, 2)) {
      milestones.push({
        title: `Fix: ${gap.title}`,
        description: gap.recommendation,
        timeframe: 'now',
        priority: 'critical',
        metrics: { severity: gap.severity === 'critical' ? 1 : 0.5 },
      });
    }

    if (parsed.summary.careerStage === 'entry-level' || parsed.summary.careerStage === 'mid-level') {
      milestones.push({
        title: `Progress from ${parsed.summary.careerStage} to ${parsed.summary.careerStage === 'entry-level' ? 'mid' : 'senior'}-level roles`,
        description: 'Build the experience and credentials needed for the next career level.',
        timeframe: '1_year',
        priority: 'medium',
        metrics: { currentLevel: parsed.summary.careerStage === 'entry-level' ? 1 : 2, targetLevel: parsed.summary.careerStage === 'entry-level' ? 2 : 3 },
      });
    }

    if (parsed.content.averageEngagement < 50 && parsed.content.totalPosts > 0) {
      milestones.push({
        title: 'Improve Content Engagement',
        description: `Grow average engagement from ${parsed.content.averageEngagement} to 100+ per post.`,
        timeframe: '90_days',
        priority: 'medium',
        metrics: { currentEngagement: parsed.content.averageEngagement, targetEngagement: 100 },
      });
    }

    if (parsed.summary.totalExperienceYears > 3 && !parsed.experience.careerProgression.some(r => r.toLowerCase().includes('lead') || r.toLowerCase().includes('senior'))) {
      milestones.push({
        title: 'Move Into Leadership',
        description: 'With sufficient experience, pursue lead or senior roles to advance your career.',
        timeframe: '1_year',
        priority: 'medium',
        metrics: { currentRoleLevel: 1, targetRoleLevel: 2 },
      });
    }

    if (report.scores?.visibility?.current && report.scores.visibility.current < 40) {
      milestones.push({
        title: 'Boost Profile Visibility',
        description: 'Improve SEO keywords, post frequency, and network growth to increase visibility.',
        timeframe: '30_days',
        priority: 'high',
        metrics: { currentVisibility: report.scores.visibility.current, targetVisibility: 60 },
      });
    }

    if (parsed.content.totalPosts > 0 && parsed.content.totalPosts < 50) {
      milestones.push({
        title: `Reach ${parsed.content.totalPosts > 25 ? 50 : 25} Posts Published`,
        description: `Grow from ${parsed.content.totalPosts} to ${parsed.content.totalPosts > 25 ? 50 : 25} total posts for content consistency.`,
        timeframe: '6_months',
        priority: 'medium',
        metrics: { currentPosts: parsed.content.totalPosts, targetPosts: parsed.content.totalPosts > 25 ? 50 : 25 },
      });
    }

    if (parsed.summary.totalProjects >= 3 && parsed.content.totalPosts < 5) {
      milestones.push({
        title: 'Turn Projects Into Content',
        description: `You have ${parsed.summary.totalProjects} projects but only ${parsed.content.totalPosts} posts. Turn each project into a case study or tutorial.`,
        timeframe: '30_days',
        priority: 'high',
        metrics: { projects: parsed.summary.totalProjects, posts: parsed.content.totalPosts },
      });
    }

    return milestones;
  }

  private identifyFocusAreas(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): string[] {
    const areas: string[] = [];

    if (parsed.content.totalPosts < 10) areas.push('Content Creation');
    if (parsed.summary.totalSkills < 25) areas.push('Skill Development');
    if (parsed.summary.totalCertifications < 2) areas.push('Professional Certifications');
    if (parsed.summary.totalProjects < 5) areas.push('Project Building');

    const gaps = report.gaps || [];
    if (gaps.some(g => g.category === 'missing_section' || g.category === 'incomplete_experience')) {
      areas.push('Profile Optimization');
    }

    if (report.scores?.visibility?.current && report.scores.visibility.current < 50) {
      areas.push('Visibility & SEO');
    }

    if (parsed.content.totalPosts > 0 && parsed.content.averageEngagement < 50) {
      areas.push('Engagement Strategy');
    }

    if (areas.length === 0) {
      areas.push('Thought Leadership');
      areas.push('Network Expansion');
    }

    return areas;
  }

  private determineOverallPriority(milestones: IGrowthMilestone[]): string {
    if (milestones.some(m => m.priority === 'critical')) return 'Profile optimization and content creation';
    if (milestones.some(m => m.priority === 'high')) return 'Skill and content development';
    return 'Growth and scaling';
  }
}

export const growthOpportunityEngine = new GrowthOpportunityEngine();
