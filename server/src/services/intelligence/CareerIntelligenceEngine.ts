import pino from 'pino';
import { CareerIntelligence, CareerPath, CareerSkillGap, LinkedInUserProfile } from '../../types/linkedin';
import { ParsedProfile } from '../linkedin/ProfileParser';

const logger = pino();

const CAREER_PATH_PATTERNS: Record<string, Array<{ title: string; minYears: number; skills: string[]; content: string[] }>> = {
  'Software Engineer': [
    { title: 'Senior Software Engineer', minYears: 3, skills: ['System Design', 'Architecture', 'Mentoring'], content: ['Technical deep dives', 'Architecture decisions'] },
    { title: 'Staff Engineer', minYears: 6, skills: ['Technical Leadership', 'Cross-team Collaboration', 'Strategic Thinking'], content: ['Engineering culture', 'Technical strategy'] },
    { title: 'Engineering Manager', minYears: 5, skills: ['People Management', 'Project Management', 'Budgeting'], content: ['Management advice', 'Team building'] },
    { title: 'Principal Engineer', minYears: 8, skills: ['Org-wide Influence', 'Technical Vision', 'Mentoring at Scale'], content: ['Technical vision', 'Industry trends'] },
  ],
  'Data Scientist': [
    { title: 'Senior Data Scientist', minYears: 3, skills: ['Advanced Statistics', 'MLOps', 'Domain Expertise'], content: ['ML best practices', 'Data storytelling'] },
    { title: 'Lead Data Scientist', minYears: 5, skills: ['Team Leadership', 'Strategy', 'Stakeholder Management'], content: ['Data strategy', 'Team leadership'] },
    { title: 'Chief Data Officer', minYears: 10, skills: ['Data Strategy', 'Executive Leadership', 'Data Governance'], content: ['Data strategy', 'Industry vision'] },
  ],
  'Product Manager': [
    { title: 'Senior Product Manager', minYears: 3, skills: ['Strategic Thinking', 'Data Analysis', 'User Research'], content: ['Product strategy', 'User insights'] },
    { title: 'Director of Product', minYears: 6, skills: ['Team Leadership', 'Portfolio Management', 'Executive Communication'], content: ['Product leadership', 'Org building'] },
    { title: 'CPO', minYears: 10, skills: ['Vision', 'Board Management', 'Industry Influence'], content: ['Product vision', 'Industry trends'] },
  ],
};

const SKILL_GAP_DATABASE: Record<string, Array<{ skill: string; level: number }>> = {
  'senior': [
    { skill: 'System Design', level: 80 },
    { skill: 'Technical Leadership', level: 75 },
    { skill: 'Mentoring', level: 70 },
    { skill: 'Cross-functional Communication', level: 75 },
  ],
  'leadership': [
    { skill: 'Strategic Planning', level: 85 },
    { skill: 'Team Building', level: 80 },
    { skill: 'Budget Management', level: 75 },
    { skill: 'Executive Presence', level: 80 },
  ],
  'executive': [
    { skill: 'Vision Setting', level: 90 },
    { skill: 'Board Management', level: 85 },
    { skill: 'Industry Influence', level: 85 },
    { skill: 'Organizational Design', level: 80 },
  ],
};

export class CareerIntelligenceEngine {
  analyze(parsed: ParsedProfile, profile: LinkedInUserProfile): CareerIntelligence {
    const currentPosition = this.detectCurrentPosition(parsed, profile);
    const desiredPosition = this.inferDesiredPosition(parsed, currentPosition);
    const growthPaths = this.generateGrowthPaths(parsed, currentPosition);
    const skillGaps = this.identifySkillGaps(parsed, currentPosition);
    const opportunityGaps = this.identifyOpportunityGaps(parsed);
    const networkingOpps = this.identifyNetworkingOpportunities(parsed);

    return {
      currentPosition,
      desiredPosition,
      growthPaths,
      skillGaps,
      opportunityGaps,
      networkingOpportunities: networkingOpps,
      growthReport: this.generateGrowthReport(parsed, currentPosition, desiredPosition, growthPaths, skillGaps),
    };
  }

  private detectCurrentPosition(parsed: ParsedProfile, profile: LinkedInUserProfile): string {
    const currentRole = profile.experience?.find(e => e.currentlyWorking);
    if (currentRole) return currentRole.title;
    if (profile.experience && profile.experience.length > 0) return profile.experience[0].title;
    return 'Professional';
  }

  private inferDesiredPosition(parsed: ParsedProfile, currentPosition: string): string {
    const stage = parsed.summary.careerStage;
    const lower = currentPosition.toLowerCase();

    if (stage === 'senior') return currentPosition.replace(/senior/i, 'Lead').trim() || 'Lead ' + currentPosition;
    if (stage === 'mid-level') return 'Senior ' + currentPosition;
    if (stage === 'leadership') {
      if (/engineer|developer/i.test(lower)) return 'Director of Engineering';
      if (/manager/i.test(lower) && !/director/i.test(lower)) return 'Director of ' + currentPosition.replace(/manager/i, '').trim();
      return 'VP of ' + currentPosition.replace(/head of|director of|vp of/i, '').trim();
    }
    if (stage === 'executive') return 'Board Member / Advisor';

    const entryPaths = CAREER_PATH_PATTERNS[this.matchRole(currentPosition)] || [];
    return entryPaths[0]?.title || 'Senior ' + currentPosition;
  }

  private matchRole(position: string): string {
    const lower = position.toLowerCase();
    if (/engineer|developer|software/i.test(lower)) return 'Software Engineer';
    if (/data\s*(scientist|analyst)|analytics/i.test(lower)) return 'Data Scientist';
    if (/product\s*manager/i.test(lower)) return 'Product Manager';
    return 'Software Engineer';
  }

  private generateGrowthPaths(parsed: ParsedProfile, currentPosition: string): CareerPath[] {
    const roleKey = this.matchRole(currentPosition);
    const paths = CAREER_PATH_PATTERNS[roleKey] || CAREER_PATH_PATTERNS['Software Engineer'];
    const yearsExp = parsed.summary.totalExperienceYears;

    return paths
      .filter(p => yearsExp >= p.minYears - 2)
      .map((p, i) => ({
        title: p.title,
        probability: Math.max(0, Math.min(0.95, 0.5 + (yearsExp - p.minYears) * 0.1 - i * 0.15)),
        timeframe: p.minYears <= yearsExp ? '1-2 years' : `${p.minYears - yearsExp}-${p.minYears - yearsExp + 2} years`,
        requiredSkills: p.skills,
        recommendedContent: p.content,
      }));
  }

  private identifySkillGaps(parsed: ParsedProfile, currentPosition: string): CareerSkillGap[] {
    const stage = parsed.summary.careerStage;
    const stageGaps = SKILL_GAP_DATABASE[stage] || SKILL_GAP_DATABASE['senior'];
    const currentSkills = new Set(parsed.skills.topSkills.map(s => s.toLowerCase()));
    const allExperiencedSkills = new Set(
      (parsed.profile.experience || [])
        .flatMap(e => (e.description || '').toLowerCase().split(/\s+/))
        .filter(w => w.length > 3)
    );

    return stageGaps.map(gap => {
      const hasSkill = currentSkills.has(gap.skill.toLowerCase()) || allExperiencedSkills.has(gap.skill.toLowerCase());
      return {
        skill: gap.skill,
        currentLevel: hasSkill ? Math.round(gap.level * 0.4) : Math.round(gap.level * 0.15),
        targetLevel: gap.level,
        importance: stage === 'senior' || stage === 'mid-level' ? 'critical' : 'recommended',
        learningResources: [
          `LinkedIn Learning: ${gap.skill} Foundations`,
          `Coursera: Advanced ${gap.skill}`,
          `Book: ${gap.skill} by Industry Experts`,
        ],
      };
    });
  }

  private identifyOpportunityGaps(parsed: ParsedProfile): string[] {
    const gaps: string[] = [];

    if (parsed.content.totalPosts === 0) {
      gaps.push('No content creation history — start building thought leadership');
    }

    if (parsed.summary.totalCertifications === 0 && parsed.summary.totalExperienceYears > 3) {
      gaps.push('No certifications to validate your skills');
    }

    if (parsed.experience.uniqueCompanies < 2 && parsed.summary.totalExperienceYears > 3) {
      gaps.push('Limited company diversity — consider expanding experience breadth');
    }

    if (parsed.content.contentConsistency < 0.3 && parsed.summary.totalExperienceYears > 2) {
      gaps.push('Inconsistent content activity — regular posting builds authority');
    }

    return gaps;
  }

  private identifyNetworkingOpportunities(parsed: ParsedProfile): string[] {
    const opportunities: string[] = [];
    const industries = parsed.experience.industries;

    if (industries.length > 0) {
      opportunities.push(`Connect with leaders in ${industries[0]}`);
    }
    opportunities.push('Join relevant LinkedIn groups in your industry');
    opportunities.push('Engage with content from industry thought leaders');
    opportunities.push('Attend virtual and in-person industry events');

    return opportunities;
  }

  private generateGrowthReport(
    parsed: ParsedProfile,
    currentPosition: string,
    desiredPosition: string,
    paths: CareerPath[],
    skillGaps: CareerSkillGap[]
  ): string {
    const yearsExp = parsed.summary.totalExperienceYears;
    const topPath = paths[0];
    const criticalGaps = skillGaps.filter(g => g.importance === 'critical');

    let report = `# Career Growth Report\n\n`;
    report += `## Current Position\n${currentPosition}\n\n`;
    report += `## Target Position\n${desiredPosition}\n\n`;
    report += `## Experience\n${yearsExp} years of professional experience\n\n`;

    if (topPath) {
      report += `## Recommended Path\n${topPath.title} (${Math.round(topPath.probability * 100)}% probability)\n\n`;
    }

    if (criticalGaps.length > 0) {
      report += `## Critical Skill Gaps to Address\n`;
      for (const gap of criticalGaps) {
        report += `- ${gap.skill}: Current level ${gap.currentLevel}/100, Target ${gap.targetLevel}/100\n`;
      }
    }

    return report;
  }
}

export const careerIntelligenceEngine = new CareerIntelligenceEngine();
