import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';

const logger = pino();

export interface MappedExpertise {
  primary: Array<{ name: string; confidence: number; evidence: string[]; yearsExperience: number }>;
  secondary: Array<{ name: string; confidence: number; evidence: string[]; yearsExperience: number }>;
  emerging: Array<{ name: string; confidence: number; evidence: string[] }>;
  hidden: Array<{ name: string; confidence: number; evidence: string[] }>;
  confidence: number;
}

export class ExpertiseMappingEngine {

  analyze(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): MappedExpertise {
    const allSkills = parsed.skills.topSkills;
    const allCerts = parsed.profile.certifications || [];
    const about = (parsed.profile.about || '').toLowerCase();
    const experience = parsed.experience;

    const primary: MappedExpertise['primary'] = [];
    const secondary: MappedExpertise['secondary'] = [];
    const emerging: MappedExpertise['emerging'] = [];
    const hidden: MappedExpertise['hidden'] = [];

    const skillExperience = this.estimateYearsPerSkill(parsed);

    for (const skill of allSkills) {
      const years = skillExperience[skill] || 0;
      const inAbout = about.includes(skill.toLowerCase());
      const certMatch = allCerts.filter(c => c.name.toLowerCase().includes(skill.toLowerCase())).length;
      const isCurrentFocus = experience.careerProgression[0]?.toLowerCase().includes(skill.toLowerCase());

      let score = 0;
      if (years > 3) score += 0.3;
      if (years > 5) score += 0.2;
      if (inAbout) score += 0.2;
      if (certMatch > 0) score += 0.15;
      if (isCurrentFocus) score += 0.2;

      const evidence: string[] = [];
      if (years > 0) evidence.push(`${years}+ years of experience`);
      if (inAbout) evidence.push('Mentioned in About section');
      if (certMatch > 0) evidence.push(`${certMatch} related certification(s)`);
      if (isCurrentFocus) evidence.push('Part of current role');

      if (score >= 0.5) {
        primary.push({ name: skill, confidence: Math.min(score, 1), evidence, yearsExperience: years });
      } else if (score >= 0.3) {
        secondary.push({ name: skill, confidence: Math.min(score, 1), evidence, yearsExperience: years });
      } else if (score >= 0.15) {
        hidden.push({ name: skill, confidence: Math.min(score, 1), evidence });
      }
    }

    if (report.expertise?.primary) {
      for (const exp of report.expertise.primary) {
        if (!primary.find(p => p.name === exp.name)) {
          primary.push({
            name: exp.name,
            confidence: exp.confidence / 100,
            evidence: exp.evidence,
            yearsExperience: exp.yearsExperience,
          });
        }
      }
    }

    const emergingTopics = this.detectEmergingExpertise(report, parsed);
    for (const topic of emergingTopics) {
      if (!primary.find(p => p.name === topic.name) && !secondary.find(s => s.name === topic.name)) {
        emerging.push(topic);
      }
    }

    primary.sort((a, b) => b.confidence - a.confidence);
    secondary.sort((a, b) => b.confidence - a.confidence);
    emerging.sort((a, b) => b.confidence - a.confidence);
    hidden.sort((a, b) => b.confidence - a.confidence);

    const totalPrimaryScore = primary.reduce((s, p) => s + p.confidence, 0);
    const confidence = primary.length > 0 ? Math.min(totalPrimaryScore / primary.length + 0.2, 1) : 0.3;

    return {
      primary: primary.slice(0, 5),
      secondary: secondary.slice(0, 8),
      emerging: emerging.slice(0, 5),
      hidden: hidden.slice(0, 5),
      confidence,
    };
  }

  private estimateYearsPerSkill(parsed: ParsedProfile): Record<string, number> {
    const experience = parsed.experience;
    const skillYears: Record<string, number> = {};

    for (const skill of parsed.skills.topSkills) {
      const skillLower = skill.toLowerCase();
      let totalYears = 0;

      for (const role of parsed.profile.experience || []) {
        const desc = (role.description || '').toLowerCase();
        const title = (role.title || '').toLowerCase();

        if (desc.includes(skillLower) || title.includes(skillLower)) {
          if (role.startDate) {
            const end = role.endDate || { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
            const startYear = role.startDate.year + (role.startDate.month || 1) / 12;
            const endYear = end.year + (end.month || 12) / 12;
            totalYears += Math.max(0, endYear - startYear);
          }
        }
      }

      if (totalYears > 0) skillYears[skill] = Math.round(totalYears * 10) / 10;
    }

    return skillYears;
  }

  private detectEmergingExpertise(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): Array<{ name: string; confidence: number; evidence: string[] }> {
    const about = (parsed.profile.about || '').toLowerCase();
    const headline = (parsed.profile.headline || '').toLowerCase();
    const all = `${about} ${headline}`;
    const contentTopics = parsed.content.topTopics || [];
    const emerging: Array<{ name: string; confidence: number; evidence: string[] }> = [];

    const signals: Array<{ name: string; keywords: string[] }> = [
      { name: 'Generative AI', keywords: ['generative ai', 'gpt', 'llm', 'large language model', 'prompt engineering'] },
      { name: 'Machine Learning', keywords: ['machine learning', 'deep learning', 'neural network', 'ml'] },
      { name: 'Cloud Computing', keywords: ['cloud', 'aws', 'gcp', 'azure', 'serverless'] },
      { name: 'DevOps', keywords: ['devops', 'ci/cd', 'kubernetes', 'docker', 'terraform'] },
      { name: 'Product Management', keywords: ['product management', 'product strategy', 'roadmap'] },
      { name: 'Data Science', keywords: ['data science', 'analytics', 'data-driven', 'data analysis'] },
      { name: 'Technical Writing', keywords: ['technical writing', 'documentation', 'blog', 'tutorial'] },
      { name: 'Open Source', keywords: ['open source', 'contributor', 'maintainer', 'github'] },
      { name: 'System Design', keywords: ['system design', 'architecture', 'scalable', 'distributed'] },
      { name: 'Leadership', keywords: ['leadership', 'team lead', 'management', 'mentoring'] },
    ];

    for (const signal of signals) {
      const matches = signal.keywords.filter(k => all.includes(k));
      const contentMatch = contentTopics.filter(t => signal.keywords.some(k => t.toLowerCase().includes(k)));

      if (matches.length > 0 || contentMatch.length > 0) {
        emerging.push({
          name: signal.name,
          confidence: Math.min(matches.length * 0.15 + contentMatch.length * 0.1 + 0.1, 0.7),
          evidence: [
            ...matches.map(k => `Mentioned in profile: "${k}"`),
            ...contentMatch.map(t => `Content topic: ${t}`),
          ],
        });
      }
    }

    return emerging;
  }
}

export const expertiseMappingEngine = new ExpertiseMappingEngine();
