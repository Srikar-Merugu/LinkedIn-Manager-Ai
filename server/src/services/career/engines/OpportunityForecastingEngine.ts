import pino from 'pino';
import type { IOpportunityForecast } from '../../../models/career/OpportunityForecast';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string; endorsements?: number }>;
  experience?: Array<{ title: string; company?: string }>;
  certifications?: Array<{ name: string }>;
  projects?: Array<{ title: string }>;
  targetRole?: string;
  targetIndustries?: string[];
  careerStage?: string;
}

export class OpportunityForecastingEngine {

  forecast(profile: ProfileInput): Pick<IOpportunityForecast, 'forecasts' | 'trends' | 'summary' | 'recommendations'> {
    const role = profile.targetRole || this.inferRole(profile);
    const stage = profile.careerStage || this.inferStage(profile);
    const skillsCount = profile.skills?.length || 0;
    const experienceCount = profile.experience?.length || 0;
    const hasProjects = (profile.projects?.length || 0) > 0;
    const hasCertifications = (profile.certifications?.length || 0) > 0;

    const threeMonthProb = this.calculateProbability(stage, skillsCount, experienceCount, hasProjects, '3_months');
    const sixMonthProb = this.calculateProbability(stage, skillsCount, experienceCount, hasProjects, '6_months');
    const twelveMonthProb = this.calculateProbability(stage, skillsCount, experienceCount, hasProjects, '12_months');

    const forecasts = this.generateForecasts(role, stage, threeMonthProb, sixMonthProb, twelveMonthProb, profile);
    const trends = this.generateTrends(role);

    const probabilities = forecasts.map(f => f.probability);
    const threeMonth = forecasts.filter(f => f.timeframe === '3_months');
    const sixMonth = forecasts.filter(f => f.timeframe === '6_months');
    const twelveMonth = forecasts.filter(f => f.timeframe === '12_months');

    const avgProb = probabilities.length > 0
      ? Math.round((probabilities.reduce((a, b) => a + b, 0) / probabilities.length) * 100) / 100
      : 0;

    logger.info({ role, stage, threeMonthCount: threeMonth.length, avgProbability: avgProb }, 'Opportunity forecast generated');

    return {
      forecasts,
      trends,
      summary: {
        threeMonthOpportunities: threeMonth.length,
        sixMonthOpportunities: sixMonth.length,
        twelveMonthOpportunities: twelveMonth.length,
        highestProbability: Math.round(Math.max(...probabilities, 0) * 100) / 100,
        lowestProbability: Math.round(Math.min(...probabilities, 0) * 100) / 100,
        averageProbability: avgProb,
        readinessScore: Math.round(avgProb * 100),
      },
      recommendations: [
        `Focus on closing top skill gaps to increase ${threeMonthProb < 0.5 ? '6-month' : '3-month'} opportunity probability`,
        hasProjects ? 'Continue building and shipping projects to demonstrate capability' : 'Start building portfolio projects to showcase your skills',
        hasCertifications ? 'Leverage certifications in your content strategy' : 'Consider certifications to validate skills and increase recruiter discovery',
        `Target content toward ${role} roles to attract relevant opportunities`,
      ],
    };
  }

  private generateForecasts(
    role: string,
    stage: string,
    threeMonthProb: number,
    sixMonthProb: number,
    twelveMonthProb: number,
    profile: ProfileInput
  ): IOpportunityForecast['forecasts'] {
    const forecasts: IOpportunityForecast['forecasts'] = [];

    if (stage === 'student' || stage === 'entry') {
      forecasts.push({
        opportunity: `Internship at target company`,
        type: 'internship',
        probability: threeMonthProb,
        timeframe: '3_months',
        prerequisites: ['Complete portfolio project', 'Apply to 10+ positions', 'Network with employees'],
        triggerEvents: ['Application submitted', 'Referral from connection', 'Career fair attendance'],
        estimatedValue: 'Experience + potential full-time offer',
        confidence: Math.min(threeMonthProb + 0.1, 1),
      });
      forecasts.push({
        opportunity: `Full-time graduate role`,
        type: 'job',
        probability: sixMonthProb,
        timeframe: '6_months',
        prerequisites: ['Graduate', 'Complete internship', 'Build project portfolio'],
        triggerEvents: ['Graduation', 'Internship completion', 'Network referral'],
        estimatedValue: 'Entry-level salary + benefits',
        confidence: Math.min(sixMonthProb + 0.1, 1),
      });
    }

    if (stage === 'mid' || stage === 'entry') {
      forecasts.push({
        opportunity: `Recruiter discovery on LinkedIn`,
        type: 'recruiter_discovery',
        probability: threeMonthProb + 0.1,
        timeframe: '3_months',
        prerequisites: ['Optimized LinkedIn profile', 'Published 5+ relevant posts', 'Active engagement in communities'],
        triggerEvents: ['Content goes viral', 'Industry event participation', 'Skill endorsement increase'],
        estimatedValue: 'Interview opportunities',
        confidence: Math.min(threeMonthProb + 0.15, 1),
      });
      forecasts.push({
        opportunity: `Mid-level ${role} position`,
        type: 'job',
        probability: sixMonthProb + 0.05,
        timeframe: '6_months',
        prerequisites: ['Build domain expertise', 'Complete certification', 'Expand network'],
        triggerEvents: ['Current role promotion', 'Industry recognition', 'Network referral'],
        estimatedValue: 'Mid-level compensation package',
        confidence: Math.min(sixMonthProb + 0.1, 1),
      });
    }

    if (stage === 'senior' || stage === 'executive') {
      forecasts.push({
        opportunity: `Senior/Lead ${role} opportunity`,
        type: 'job',
        probability: threeMonthProb + 0.15,
        timeframe: '3_months',
        prerequisites: ['Demonstrated leadership', 'Published thought leadership', 'Strong network'],
        triggerEvents: ['Content recognition', 'Speaking engagement', 'Executive search outreach'],
        estimatedValue: 'Senior-level compensation + equity',
        confidence: Math.min(threeMonthProb + 0.2, 1),
      });
      forecasts.push({
        opportunity: `Speaking engagement at industry conference`,
        type: 'speaking',
        probability: sixMonthProb + 0.2,
        timeframe: '6_months',
        prerequisites: ['Published thought leadership', 'Active community presence', 'Unique expertise'],
        triggerEvents: ['CFP acceptance', 'Community nomination', 'Direct invitation'],
        estimatedValue: 'Industry visibility + network expansion',
        confidence: Math.min(sixMonthProb + 0.15, 1),
      });
    }

    forecasts.push({
      opportunity: `Collaboration with industry peer`,
      type: 'collaboration',
      probability: Math.min(twelveMonthProb + 0.1, 0.95),
      timeframe: '12_months',
      prerequisites: ['Built audience', 'Published consistently', 'Engaged with community'],
      triggerEvents: ['Mutual content engagement', 'Conference meeting', 'Direct outreach'],
      estimatedValue: 'Joint content, project, or business opportunity',
      confidence: Math.min(twelveMonthProb + 0.1, 1),
    });

    forecasts.push({
      opportunity: `Client or consulting engagement`,
      type: 'client',
      probability: Math.min(twelveMonthProb + 0.05, 0.9),
      timeframe: '12_months',
      prerequisites: ['Demonstrated expertise', 'Published case studies', 'Visible portfolio'],
      triggerEvents: ['Content leads to inbound inquiry', 'Network referral', 'Speaking engagement'],
      estimatedValue: 'Variable — project-based or retainer',
      confidence: Math.min(twelveMonthProb + 0.05, 1),
    });

    return forecasts;
  }

  private generateTrends(role: string): IOpportunityForecast['trends'] {
    return [
      {
        trend: `Increasing demand for ${this.displayRole(role)} with AI/ML integration skills`,
        impact: 'high',
        relevance: 0.85,
        actionItems: ['Learn AI/ML fundamentals', 'Build projects combining your domain with AI', 'Follow AI trends in your industry'],
      },
      {
        trend: 'Remote and hybrid opportunities expanding talent pools',
        impact: 'high',
        relevance: 0.9,
        actionItems: ['Optimize for remote collaboration', 'Build async communication skills', 'Expand job search beyond geography'],
      },
      {
        trend: `${this.displayRole(role)} roles increasingly require content creation and personal branding`,
        impact: 'medium',
        relevance: 0.75,
        actionItems: ['Start publishing regularly', 'Build your professional narrative', 'Engage with content from leaders in your space'],
      },
    ];
  }

  private calculateProbability(
    stage: string,
    skillsCount: number,
    experienceCount: number,
    hasProjects: boolean,
    timeframe: '3_months' | '6_months' | '12_months'
  ): number {
    const baseProb: Record<string, number> = {
      'entry': 0.3,
      'mid': 0.4,
      'senior': 0.5,
      'executive': 0.35,
      'student': 0.2,
    };

    const base = baseProb[stage] || 0.3;
    const skillBonus = Math.min(skillsCount / 30, 1) * 0.15;
    const experienceBonus = Math.min(experienceCount / 5, 1) * 0.1;
    const projectBonus = hasProjects ? 0.1 : -0.1;
    const timeMultiplier = timeframe === '6_months' ? 1.3 : timeframe === '12_months' ? 1.6 : 1;

    return Math.max(0.05, Math.min(0.95, (base + skillBonus + experienceBonus + projectBonus) * timeMultiplier));
  }

  private inferRole(profile: ProfileInput): string {
    const title = profile.experience?.[0]?.title?.toLowerCase() || '';
    if (title.includes('engineer') || title.includes('developer') || title.includes('architect')) return 'Software Engineer';
    if (title.includes('product') || title.includes('pm')) return 'Product Manager';
    if (title.includes('design')) return 'Designer';
    if (title.includes('data') || title.includes('scientist')) return 'Data Scientist';
    if (title.includes('manager') || title.includes('lead')) return 'Engineering Manager';
    return 'Software Engineer';
  }

  private inferStage(profile: ProfileInput): string {
    const exp = (profile.experience?.length || 0);
    if (exp <= 1) return 'entry';
    if (exp <= 3) return 'mid';
    if (exp <= 7) return 'senior';
    return 'executive';
  }

  private displayRole(role: string): string {
    return role;
  }
}

export const opportunityForecastingEngine = new OpportunityForecastingEngine();
