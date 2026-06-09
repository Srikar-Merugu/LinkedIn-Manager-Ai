import pino from 'pino';
import type { ISkillGapEntry, ISkillGapReport } from '../../../models/career/SkillGapReport';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string; endorsements?: number; isTopSkill?: boolean }>;
  experience?: Array<{ title: string; description?: string }>;
  certifications?: Array<{ name: string }>;
  projects?: Array<{ title: string; description?: string }>;
  education?: Array<{ fieldOfStudy?: string }>;
  about?: string;
  targetRole?: string;
}

const ROLE_SKILL_SIGNATURES: Record<string, Array<{
  skill: string;
  category: ISkillGapEntry['category'];
  targetLevel: number;
  marketDemand: 'high' | 'medium' | 'low';
}>> = {
  'intern': [
    { skill: 'Communication', category: 'soft', targetLevel: 6, marketDemand: 'high' },
    { skill: 'Problem Solving', category: 'soft', targetLevel: 5, marketDemand: 'high' },
    { skill: 'Team Collaboration', category: 'soft', targetLevel: 5, marketDemand: 'high' },
  ],
  'junior_developer': [
    { skill: 'JavaScript/TypeScript', category: 'technical', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Git', category: 'tool', targetLevel: 7, marketDemand: 'high' },
    { skill: 'REST APIs', category: 'technical', targetLevel: 6, marketDemand: 'high' },
    { skill: 'Database Basics', category: 'technical', targetLevel: 5, marketDemand: 'high' },
    { skill: 'Testing', category: 'technical', targetLevel: 5, marketDemand: 'medium' },
    { skill: 'Agile/Scrum', category: 'soft', targetLevel: 5, marketDemand: 'medium' },
    { skill: 'Code Review', category: 'soft', targetLevel: 4, marketDemand: 'medium' },
  ],
  'mid_level_developer': [
    { skill: 'System Design', category: 'technical', targetLevel: 6, marketDemand: 'high' },
    { skill: 'Architecture Patterns', category: 'technical', targetLevel: 6, marketDemand: 'high' },
    { skill: 'Performance Optimization', category: 'technical', targetLevel: 6, marketDemand: 'medium' },
    { skill: 'CI/CD', category: 'tool', targetLevel: 6, marketDemand: 'high' },
    { skill: 'Cloud Services', category: 'technical', targetLevel: 6, marketDemand: 'high' },
    { skill: 'Mentoring', category: 'soft', targetLevel: 5, marketDemand: 'medium' },
    { skill: 'Technical Documentation', category: 'soft', targetLevel: 6, marketDemand: 'medium' },
    { skill: 'Project Estimation', category: 'soft', targetLevel: 5, marketDemand: 'medium' },
  ],
  'senior_developer': [
    { skill: 'System Architecture', category: 'technical', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Team Leadership', category: 'soft', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Technical Strategy', category: 'domain', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Cross-functional Communication', category: 'soft', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Mentoring & Coaching', category: 'soft', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Production Incident Management', category: 'technical', targetLevel: 7, marketDemand: 'medium' },
    { skill: 'Budget & Resource Planning', category: 'soft', targetLevel: 5, marketDemand: 'low' },
    { skill: 'Vendor Evaluation', category: 'soft', targetLevel: 5, marketDemand: 'low' },
  ],
  'product_manager': [
    { skill: 'Product Strategy', category: 'domain', targetLevel: 7, marketDemand: 'high' },
    { skill: 'User Research', category: 'domain', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Data Analysis', category: 'technical', targetLevel: 6, marketDemand: 'high' },
    { skill: 'Roadmapping', category: 'domain', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Stakeholder Management', category: 'soft', targetLevel: 7, marketDemand: 'high' },
    { skill: 'A/B Testing', category: 'technical', targetLevel: 6, marketDemand: 'medium' },
    { skill: 'Technical Literacy', category: 'domain', targetLevel: 5, marketDemand: 'medium' },
  ],
  'engineering_manager': [
    { skill: 'People Management', category: 'soft', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Technical Strategy', category: 'domain', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Resource Planning', category: 'soft', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Performance Management', category: 'soft', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Hiring & Interviewing', category: 'soft', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Team Building', category: 'soft', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Budget Management', category: 'soft', targetLevel: 6, marketDemand: 'medium' },
    { skill: 'Conflict Resolution', category: 'soft', targetLevel: 7, marketDemand: 'medium' },
  ],
  'founder': [
    { skill: 'Product Vision', category: 'domain', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Customer Development', category: 'domain', targetLevel: 8, marketDemand: 'high' },
    { skill: 'Fundraising', category: 'domain', targetLevel: 6, marketDemand: 'high' },
    { skill: 'Team Building', category: 'soft', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Sales & Pitching', category: 'soft', targetLevel: 7, marketDemand: 'high' },
    { skill: 'Financial Planning', category: 'domain', targetLevel: 6, marketDemand: 'medium' },
    { skill: 'Growth Marketing', category: 'domain', targetLevel: 6, marketDemand: 'medium' },
    { skill: 'Legal & Compliance', category: 'domain', targetLevel: 4, marketDemand: 'low' },
  ],
};

export class SkillGapEngine {

  analyze(
    profile: ProfileInput
  ): Pick<ISkillGapReport, 'skills' | 'summary' | 'recommendations'> {
    const targetRole = profile.targetRole || this.inferRole(profile);
    const signatures = ROLE_SKILL_SIGNATURES[targetRole] || ROLE_SKILL_SIGNATURES['mid_level_developer'];

    const currentSkills = new Map(
      (profile.skills || []).map(s => [s.name.toLowerCase(), s])
    );

    const existingNames = new Set(currentSkills.keys());

    const skills: ISkillGapEntry[] = signatures.map(sig => {
      const current = currentSkills.get(sig.skill.toLowerCase());
      const currentLevel = current
        ? Math.min(10, Math.max(1, Math.round((current.endorsements || 0) / 5 + 5)))
        : Math.floor(Math.random() * 3) + 1;

      const gap = Math.max(0, sig.targetLevel - currentLevel);

      return {
        skill: sig.skill,
        category: sig.category,
        currentLevel,
        targetLevel: sig.targetLevel,
        gap,
        priority: Math.round(gap * (sig.marketDemand === 'high' ? 20 : sig.marketDemand === 'medium' ? 10 : 5)),
        marketDemand: sig.marketDemand,
        effort: gap >= 4 ? 'high' : gap >= 2 ? 'medium' : 'low',
        learningResources: [],
      };
    });

    skills.sort((a, b) => b.priority - a.priority);

    const criticalGaps = skills.filter(s => s.gap >= 5).length;
    const highPriorityGaps = skills.filter(s => s.gap >= 3 && s.gap < 5).length;
    const avgGap = skills.reduce((sum, s) => sum + s.gap, 0) / skills.length;
    const totalHours = skills.filter(s => s.gap > 0).reduce((sum, s) => {
      const hoursPerLevel = { 'low': 10, 'medium': 30, 'high': 60 };
      return sum + (hoursPerLevel[s.effort] || 20) * s.gap;
    }, 0);
    const readinessScore = Math.round(Math.max(0, 100 - (avgGap / 10) * 100));

    const recommendations: string[] = [];
    if (skills.some(s => s.gap >= 5)) {
      recommendations.push(`Focus on closing critical gaps: ${skills.filter(s => s.gap >= 5).map(s => s.skill).join(', ')}`);
    }
    if (!existingNames.has('typescript') && targetRole === 'junior_developer') {
      recommendations.push('TypeScript/JavaScript is the highest-demand skill for your target role');
    }
    if (totalHours > 100) {
      recommendations.push(`Estimated ${totalHours}+ learning hours — break this into a 90-day plan with 1-2 hours daily`);
    }
    recommendations.push('Build portfolio projects that demonstrate your top gap skills');
    if (profile.certifications && profile.certifications.length === 0) {
      recommendations.push('Consider certifications to validate your skills and boost credibility');
    }

    logger.info({ targetRole, totalGaps: skills.length, readinessScore }, 'Skill gap analysis complete');

    return {
      skills,
      summary: {
        totalGaps: skills.length,
        criticalGaps,
        highPriorityGaps,
        mediumPriorityGaps: skills.filter(s => s.gap >= 1 && s.gap < 3).length,
        averageGap: Math.round(avgGap * 10) / 10,
        estimatedLearningHours: totalHours,
        readinessScore,
      },
      recommendations,
    };
  }

  private inferRole(profile: ProfileInput): string {
    const titles = (profile.experience || []).map(e => e.title.toLowerCase());
    for (const title of titles) {
      if (title.includes('founder') || title.includes('ceo')) return 'founder';
      if (title.includes('engineering manager') || title.includes('manager')) return 'engineering_manager';
      if (title.includes('product manager') || title.includes('pm')) return 'product_manager';
      if (title.includes('senior')) return 'senior_developer';
      if (title.includes('intern')) return 'intern';
      if (title.includes('junior')) return 'junior_developer';
    }
    return 'mid_level_developer';
  }
}

export const skillGapEngine = new SkillGapEngine();
