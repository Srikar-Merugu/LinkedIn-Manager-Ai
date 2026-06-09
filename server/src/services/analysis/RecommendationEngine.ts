import pino from 'pino';
import {
  IntelligenceReport,
  Recommendation,
  ContentOpportunity,
  MissingOpportunity,
  ProfileType,
  CareerStage,
} from '../../types/linkedin';
import { ParsedProfile } from '../linkedin/ProfileParser';

const logger = pino();

export interface RecommendationSet {
  priority: Recommendation[];
  profile: Recommendation[];
  content: Recommendation[];
  networking: Recommendation[];
  skills: Recommendation[];
  branding: Recommendation[];
  quickWins: Recommendation[];
  opportunities: ContentOpportunity[];
  gaps: MissingOpportunity[];
}

export class RecommendationEngine {
  prioritize(report: IntelligenceReport, parsed: ParsedProfile): RecommendationSet {
    const all = report.recommendations;

    const priority = [...all].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    const byType = {
      profile: all.filter(r => r.type === 'profile'),
      content: all.filter(r => r.type === 'content'),
      networking: all.filter(r => r.type === 'networking'),
      skills: all.filter(r => r.type === 'skills'),
      branding: all.filter(r => r.type === 'branding'),
    };

    const quickWins = all
      .filter(r => r.effort === 'low' && (r.priority === 'critical' || r.priority === 'high'))
      .sort((a, b) => {
        const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return impactOrder[a.priority] - impactOrder[b.priority];
      });

    return {
      priority,
      ...byType,
      quickWins,
      opportunities: report.contentOpportunities,
      gaps: report.missingOpportunities,
    };
  }

  generateActionPlan(report: IntelligenceReport, parsed: ParsedProfile): {
    week1: string[];
    week2: string[];
    month1: string[];
    month3: string[];
    quarter: string[];
  } {
    const critical = report.recommendations.filter(r => r.priority === 'critical');
    const high = report.recommendations.filter(r => r.priority === 'high');
    const medium = report.recommendations.filter(r => r.priority === 'medium');
    const low = report.recommendations.filter(r => r.priority === 'low');

    return {
      week1: critical.slice(0, 3).map(r => r.title),
      week2: critical.slice(3).map(r => r.title).concat(high.slice(0, 2).map(r => r.title)),
      month1: high.slice(2).map(r => r.title).concat(medium.slice(0, 3).map(r => r.title)),
      month3: medium.slice(3).map(r => r.title).concat(low.slice(0, 2).map(r => r.title)),
      quarter: low.slice(2).map(r => r.title),
    };
  }

  getProfileTypeSpecificRecommendations(profileType: ProfileType): Recommendation[] {
    const recommendations: Recommendation[] = [];

    switch (profileType) {
      case 'student':
        recommendations.push({
          id: 'student-1',
          type: 'profile',
          priority: 'high',
          title: 'Build Your Professional Foundation',
          description: 'As a student, focus on building credibility through projects and coursework.',
          actions: [
            'Add relevant coursework and projects',
            'Include GPA if above 3.5',
            'List leadership roles in student organizations',
            'Add volunteer experience',
            'Connect with alumni in your field',
          ],
          expectedImpact: 'Stand out to recruiters and hiring managers',
          effort: 'medium',
          timeframe: 'short-term',
          metrics: { current: 0, target: 1 },
        });
        break;

      case 'founder':
        recommendations.push({
          id: 'founder-1',
          type: 'branding',
          priority: 'high',
          title: 'Position as an Industry Thought Leader',
          description: 'As a founder, your personal brand is your company\'s brand. Lead with vision.',
          actions: [
            'Share your founder story and mission',
            'Post about industry insights and trends',
            'Highlight company milestones and metrics',
            'Showcase team culture and values',
            'Engage with your target customer base',
          ],
          expectedImpact: 'Attract talent, customers, and investors',
          effort: 'high',
          timeframe: 'long-term',
          metrics: { current: 0, target: 100 },
        });
        break;

      case 'freelancer':
        recommendations.push({
          id: 'freelancer-1',
          type: 'profile',
          priority: 'high',
          title: 'Optimize for Client Acquisition',
          description: 'Your LinkedIn should function as a lead generation engine for your freelance business.',
          actions: [
            'Feature your best work in the featured section',
            'Add client testimonials and results',
            'Specify services offered in headline',
            'Include portfolio links and case studies',
            'Post about client success stories',
          ],
          expectedImpact: 'Increase inbound client inquiries',
          effort: 'medium',
          timeframe: 'short-term',
          metrics: { current: 0, target: 5 },
        });
        break;
    }

    return recommendations;
  }

  getCareerStageRecommendations(careerStage: CareerStage): Recommendation[] {
    const recommendations: Recommendation[] = [];

    switch (careerStage) {
      case 'entry-level':
        recommendations.push({
          id: 'entry-1',
          type: 'content',
          priority: 'high',
          title: 'Build Your Learning Narrative',
          description: 'Share your learning journey to attract mentors and opportunities.',
          actions: [
            'Post about what you are learning weekly',
            'Share project outcomes and key takeaways',
            'Engage with industry leaders\' content',
            'Write about your job search experience',
            'Ask thoughtful questions in your feed',
          ],
          expectedImpact: 'Attract mentors and accelerate career growth',
          effort: 'medium',
          timeframe: 'short-term',
          metrics: { current: 0, target: 10 },
        });
        break;

      case 'mid-level':
        recommendations.push({
          id: 'mid-1',
          type: 'branding',
          priority: 'high',
          title: 'Establish Domain Expertise',
          description: 'Position yourself as a go-to person in your specific domain.',
          actions: [
            'Share deep-dive technical content',
            'Comment on industry developments',
            'Write thought leadership articles',
            'Speak at virtual events and share recordings',
            'Mentor junior professionals publicly',
          ],
          expectedImpact: 'Career advancement and speaking opportunities',
          effort: 'high',
          timeframe: 'long-term',
          metrics: { current: 0, target: 20 },
        });
        break;

      case 'senior':
      case 'leadership':
        recommendations.push({
          id: 'senior-1',
          type: 'networking',
          priority: 'high',
          title: 'Build Your Executive Network',
          description: 'At your level, your network is your net worth. Focus on quality connections.',
          actions: [
            'Connect with C-level executives in your industry',
            'Join and participate in industry groups',
            'Share strategic insights and industry analysis',
            'Offer mentorship to rising talent',
            'Publish long-form thought leadership',
          ],
          expectedImpact: 'Executive opportunities and board positions',
          effort: 'medium',
          timeframe: 'long-term',
          metrics: { current: 0, target: 50 },
        });
        break;
    }

    return recommendations;
  }
}
