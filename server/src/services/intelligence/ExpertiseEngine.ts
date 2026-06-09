import pino from 'pino';
import {
  LinkedInUserProfile,
  ExpertiseAnalysis,
  ExpertiseArea,
} from '../../types/linkedin';
import { ParsedProfile } from '../linkedin/ProfileParser';

const logger = pino();

const EXPERTISE_DOMAINS: Record<string, { keywords: string[]; weight: number }> = {
  'Frontend Development': { keywords: ['react', 'angular', 'vue', 'typescript', 'javascript', 'css', 'html', 'frontend', 'ui'], weight: 0.9 },
  'Backend Development': { keywords: ['node.js', 'python', 'java', 'go', 'rust', 'backend', 'api', 'microservices', 'server'], weight: 0.9 },
  'Full Stack Development': { keywords: ['full stack', 'full-stack', 'mern', 'mean', 'web development'], weight: 0.85 },
  'Cloud Architecture': { keywords: ['aws', 'azure', 'gcp', 'cloud', 'kubernetes', 'docker', 'terraform', 'infrastructure'], weight: 0.9 },
  'Data Engineering': { keywords: ['data pipeline', 'etl', 'spark', 'kafka', 'data warehouse', 'big data', 'data engineering'], weight: 0.85 },
  'Data Science': { keywords: ['machine learning', 'deep learning', 'nlp', 'tensorflow', 'pytorch', 'data science', 'analytics'], weight: 0.9 },
  'AI/ML': { keywords: ['ai', 'artificial intelligence', 'llm', 'gpt', 'neural network', 'computer vision', 'nlp'], weight: 0.95 },
  'DevOps/SRE': { keywords: ['devops', 'ci/cd', 'jenkins', 'github actions', 'sre', 'reliability', 'observability'], weight: 0.85 },
  'Mobile Development': { keywords: ['ios', 'android', 'react native', 'flutter', 'swift', 'kotlin', 'mobile'], weight: 0.85 },
  'Product Management': { keywords: ['product', 'roadmap', 'strategy', 'stakeholder', 'agile', 'scrum', 'user research'], weight: 0.8 },
  'Cybersecurity': { keywords: ['security', 'cybersecurity', 'penetration', 'encryption', 'auth', 'compliance'], weight: 0.85 },
  'System Design': { keywords: ['architecture', 'distributed systems', 'scalability', 'system design', 'high-availability'], weight: 0.9 },
};

export class ExpertiseEngine {
  analyze(parsed: ParsedProfile, profile: LinkedInUserProfile): ExpertiseAnalysis {
    const allText = this.buildTextCorpus(parsed, profile);
    const domainScores = this.scoreDomains(allText, parsed);
    const sorted = Object.entries(domainScores)
      .filter(([, score]) => score.confidence > 0.1)
      .sort((a, b) => b[1].confidence - a[1].confidence);

    const primary: ExpertiseArea[] = [];
    const secondary: ExpertiseArea[] = [];
    const emerging: ExpertiseArea[] = [];
    const hidden: ExpertiseArea[] = [];

    for (const [name, score] of sorted) {
      const area: ExpertiseArea = {
        name,
        confidence: Math.round(score.confidence * 100),
        evidence: score.evidence.slice(0, 5),
        yearsExperience: score.yearsExperience,
        relatedSkills: score.relatedSkills,
        contentIdeas: this.generateContentIdeas(name, parsed),
      };

      if (score.confidence >= 0.7) primary.push(area);
      else if (score.confidence >= 0.5) secondary.push(area);
      else if (score.confidence >= 0.3) emerging.push(area);
      else hidden.push(area);
    }

    const overallConfidence = primary.length > 0
      ? Math.round(primary.reduce((s, a) => s + a.confidence, 0) / primary.length)
      : 0;

    return {
      primary: primary.slice(0, 5),
      secondary: secondary.slice(0, 5),
      emerging: emerging.slice(0, 5),
      hidden: hidden.slice(0, 5),
      confidence: overallConfidence,
      summary: this.generateSummary(primary, secondary, parsed),
    };
  }

  private buildTextCorpus(parsed: ParsedProfile, profile: LinkedInUserProfile): string {
    const parts: string[] = [
      profile.headline || '',
      profile.about || '',
      ...(profile.experience?.map(e => `${e.title} ${e.description || ''} ${e.industry || ''}`) || []),
      ...parsed.skills.topSkills,
      ...(profile.experience?.map(e => e.title) || []),
    ];
    return parts.join(' ').toLowerCase();
  }

  private scoreDomains(
    text: string,
    parsed: ParsedProfile
  ): Record<string, { confidence: number; evidence: string[]; yearsExperience: number; relatedSkills: string[] }> {
    const results: Record<string, any> = {};

    for (const [domain, config] of Object.entries(EXPERTISE_DOMAINS)) {
      const matches = config.keywords.filter(k => text.includes(k));
      const matchedSkills = parsed.skills.topSkills.filter(s => {
        const lower = s.toLowerCase();
        return config.keywords.some(k => lower.includes(k));
      });

      const experienceYears = this.estimateDomainExperience(domain, parsed);
      let confidence = 0;

      if (matches.length > 0) {
        const matchRatio = matches.length / config.keywords.length;
        const skillBoost = matchedSkills.length * 0.1;
        const experienceBoost = Math.min(experienceYears / 10, 0.3);
        const weight = config.weight;

        confidence = Math.min((matchRatio * 0.5 + skillBoost + experienceBoost) * weight, 1.0);
      }

      const matchedEvidence = config.keywords
        .filter(k => text.includes(k))
        .map(k => `Proficiency in ${k}`);

      if (matchedEvidence.length > 0 || confidence > 0) {
        results[domain] = {
          confidence,
          evidence: matchedEvidence,
          yearsExperience: experienceYears,
          relatedSkills: matchedSkills,
        };
      }
    }

    return results;
  }

  private estimateDomainExperience(domain: string, parsed: ParsedProfile): number {
    const domainKeywords = EXPERTISE_DOMAINS[domain]?.keywords || [];
    const titles = parsed.profile.experience?.map(e => (e.title || '').toLowerCase()) || [];
    const descriptions = parsed.profile.experience?.map(e => (e.description || '').toLowerCase()) || [];

    let domainRoles = 0;
    let totalMonths = 0;

    for (let i = 0; i < (parsed.profile.experience?.length || 0); i++) {
      const title = titles[i] || '';
      const desc = descriptions[i] || '';
      const isRelevant = domainKeywords.some(k => title.includes(k) || desc.includes(k));

      if (isRelevant) {
        domainRoles++;
        const exp = parsed.profile.experience![i];
        if (exp.startDate) {
          const end = exp.endDate || { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
          const months = ((end.year - exp.startDate.year) * 12) + ((end.month || 1) - (exp.startDate.month || 1));
          totalMonths += Math.max(0, months);
        }
      }
    }

    return Math.round((totalMonths / 12) * 10) / 10;
  }

  private generateContentIdeas(domain: string, parsed: ParsedProfile): string[] {
    const ideas: string[] = [];
    const stage = parsed.summary.careerStage;

    ideas.push(`Best practices in ${domain}`);
    if (stage === 'senior' || stage === 'leadership') {
      ideas.push(`Lessons learned leading ${domain} teams`);
    }
    ideas.push(`Common mistakes in ${domain} and how to avoid them`);
    ideas.push(`The future of ${domain}: trends and predictions`);

    return ideas.slice(0, 5);
  }

  private generateSummary(primary: ExpertiseArea[], secondary: ExpertiseArea[], parsed: ParsedProfile): string {
    if (primary.length === 0) return 'No clear expertise areas identified yet.';

    const primaryNames = primary.slice(0, 3).map(e => e.name).join(', ');
    const secondaryNames = secondary.slice(0, 2).map(e => e.name).join(', ');
    const yearsTotal = parsed.summary.totalExperienceYears;

    let summary = `Primary expertise in ${primaryNames}`;
    if (secondaryNames) summary += ` with secondary strengths in ${secondaryNames}`;
    summary += `. Based on ${yearsTotal} years of professional experience across ${parsed.experience.totalRoles} roles.`;

    return summary;
  }
}

export const expertiseEngine = new ExpertiseEngine();
