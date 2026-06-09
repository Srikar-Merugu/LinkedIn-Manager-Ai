import pino from 'pino';

const logger = pino();

export interface PillarCandidate {
  name: string;
  description: string;
  rationale: string;
  category: 'core' | 'growth' | 'experimental';
  sourceTopics: string[];
  confidence: number;
}

interface ProfileInput {
  skills?: Array<{ name: string }>;
  experience?: Array<{ title: string }>;
  projects?: Array<{ title: string }>;
  certifications?: Array<{ name: string }>;
  brandDNA?: {
    archetype?: string;
    values?: string[];
    brandTerritory?: { owned?: string[] };
    contentDNA?: { topics?: Array<{ name: string }> };
  };
  writingDNA?: {
    formatPreferences?: Array<{ format: string }>;
  };
  careerBlueprint?: {
    targetPosition?: string;
    currentPosition?: string;
  };
  discoveryInput?: any;
}

const PILLAR_TEMPLATES: Array<{
  name: string;
  description: string;
  matchConditions: Array<{ field: string; pattern: string; weight: number }>;
  category: 'core' | 'growth' | 'experimental';
}> = [
  {
    name: 'Building AI Products',
    description: 'Document your journey building AI-powered applications, from ideation to deployment',
    matchConditions: [
      { field: 'skills', pattern: 'ai|machine learning|llm|gpt|neural|deep learning|nlp', weight: 40 },
      { field: 'projects', pattern: 'ai|gpt|llm|agent|rag|langchain|vector|embedding', weight: 40 },
      { field: 'experience', pattern: 'ai|machine learning|data science', weight: 30 },
    ],
    category: 'core',
  },
  {
    name: 'Full Stack Development',
    description: 'Share your full stack expertise — architecture, patterns, and production lessons',
    matchConditions: [
      { field: 'skills', pattern: 'react|node|typescript|javascript|full.stack|backend|frontend', weight: 35 },
      { field: 'experience', pattern: 'developer|engineer|full.stack|software', weight: 30 },
      { field: 'projects', pattern: 'app|web|api|full.stack|frontend|backend', weight: 30 },
    ],
    category: 'core',
  },
  {
    name: 'Career Growth & Lessons',
    description: 'Share career reflections, lessons learned, and professional development insights',
    matchConditions: [
      { field: 'skills', pattern: 'leadership|management|mentoring|communication', weight: 25 },
      { field: 'experience', pattern: 'manager|lead|senior|director|head', weight: 35 },
      { field: 'brandDNA', pattern: 'mentor|leader|teacher|guide', weight: 20 },
    ],
    category: 'core',
  },
  {
    name: 'Building In Public',
    description: 'Transparently document your building journey — wins, failures, and metrics',
    matchConditions: [
      { field: 'projects', pattern: '.', weight: 30 },
      { field: 'experience', pattern: 'founder|builder|creator|maker', weight: 30 },
      { field: 'brandDNA', pattern: 'creator|innovator|founder|builder', weight: 25 },
    ],
    category: 'growth',
  },
  {
    name: 'Technical Deep Dives',
    description: 'Explore complex technical topics with detailed analysis and practical examples',
    matchConditions: [
      { field: 'skills', pattern: 'architecture|system.design|distributed|scalability|performance', weight: 40 },
      { field: 'experience', pattern: 'senior|architect|principal|staff|lead', weight: 35 },
      { field: 'projects', pattern: 'scale|architecture|distributed|pipeline', weight: 30 },
    ],
    category: 'core',
  },
  {
    name: 'Startup Building',
    description: 'Document your startup journey — product, growth, funding, and operations',
    matchConditions: [
      { field: 'experience', pattern: 'founder|co-founder|startup|ceo', weight: 45 },
      { field: 'projects', pattern: 'startup|venture|product.launch', weight: 30 },
      { field: 'brandDNA', pattern: 'founder|entrepreneur|innovator', weight: 30 },
    ],
    category: 'core',
  },
  {
    name: 'Design & Product Thinking',
    description: 'Share your approach to design, user experience, and product strategy',
    matchConditions: [
      { field: 'skills', pattern: 'design|ux|product|figma|prototyping|user.research', weight: 40 },
      { field: 'experience', pattern: 'designer|product|ux|creative', weight: 35 },
      { field: 'projects', pattern: 'design|product|interface|user', weight: 25 },
    ],
    category: 'core',
  },
  {
    name: 'DevOps & Infrastructure',
    description: 'Share expertise in cloud infrastructure, CI/CD, and platform engineering',
    matchConditions: [
      { field: 'skills', pattern: 'devops|kubernetes|docker|aws|gcp|azure|terraform|ci/cd', weight: 40 },
      { field: 'experience', pattern: 'devops|sre|infrastructure|platform|cloud', weight: 35 },
      { field: 'projects', pattern: 'infrastructure|deployment|automation|pipeline', weight: 25 },
    ],
    category: 'core',
  },
  {
    name: 'Data Science & Analytics',
    description: 'Share data-driven insights, ML models, and analytical approaches',
    matchConditions: [
      { field: 'skills', pattern: 'data|analytics|python|sql|statistics|visualization', weight: 40 },
      { field: 'experience', pattern: 'data|analyst|scientist|analytics', weight: 35 },
      { field: 'certifications', pattern: 'data|analytics|google|aws.data', weight: 20 },
    ],
    category: 'core',
  },
  {
    name: 'Open Source & Community',
    description: 'Share your open source contributions and community building experiences',
    matchConditions: [
      { field: 'projects', pattern: 'open.source|oss|contribut', weight: 40 },
      { field: 'skills', pattern: 'git|open.source|community', weight: 25 },
      { field: 'experience', pattern: 'open.source|community|maintainer', weight: 25 },
    ],
    category: 'growth',
  },
  {
    name: 'Internship & Job Search',
    description: 'Document your journey finding internships or jobs — strategies and lessons',
    matchConditions: [
      { field: 'experience', pattern: 'intern', weight: 40 },
      { field: 'brandDNA', pattern: 'student|learner|growing', weight: 25 },
      { field: 'careerBlueprint', pattern: 'intern|job|opportunit', weight: 35 },
    ],
    category: 'growth',
  },
  {
    name: 'Productivity & Systems',
    description: 'Share your personal systems, workflows, and productivity frameworks',
    matchConditions: [
      { field: 'skills', pattern: 'productivity|agile|scrum|project.management|organization', weight: 25 },
      { field: 'experience', pattern: 'manager|lead|coordinator', weight: 20 },
      { field: 'brandDNA', pattern: 'efficient|systematic|organized|strategic', weight: 20 },
    ],
    category: 'experimental',
  },
  {
    name: 'Industry Analysis',
    description: 'Share your perspective on industry trends, market shifts, and future predictions',
    matchConditions: [
      { field: 'skills', pattern: 'strategy|research|analysis|consulting', weight: 25 },
      { field: 'experience', pattern: 'consultant|analyst|strategist|advisor', weight: 30 },
      { field: 'brandDNA', pattern: 'analyst|strategist|thought leader', weight: 25 },
    ],
    category: 'growth',
  },
  {
    name: 'Mentorship & Teaching',
    description: 'Share educational content that helps others grow in their careers',
    matchConditions: [
      { field: 'experience', pattern: 'mentor|teacher|professor|instructor|coach', weight: 40 },
      { field: 'skills', pattern: 'teaching|mentoring|training|coaching', weight: 30 },
      { field: 'certifications', pattern: 'teaching|training|education', weight: 20 },
    ],
    category: 'core',
  },
];

export class PillarGenerationEngine {

  generate(profile: ProfileInput): PillarCandidate[] {
    const scored = PILLAR_TEMPLATES.map(template => {
      let totalScore = 0;
      const matchedTopics: string[] = [];

      for (const condition of template.matchConditions) {
        const matchScore = this.matchCondition(condition, profile);
        if (matchScore > 0) {
          totalScore += matchScore;
        }
      }

      totalScore = Math.min(totalScore, 100);

      return {
        name: template.name,
        description: template.description,
        rationale: this.generateRationale(template.name, matchedTopics, profile),
        category: template.category,
        sourceTopics: matchedTopics,
        confidence: Math.round(totalScore) / 100,
      };
    });

    const valid = scored.filter(p => p.confidence >= 0.15);
    valid.sort((a, b) => b.confidence - a.confidence);

    const selected = this.selectPillars(valid, profile);
    const deduped = this.deduplicateByName(selected);

    logger.info({ totalCandidates: deduped.length }, 'Pillars generated');

    return deduped;
  }

  private matchCondition(condition: { field: string; pattern: string; weight: number }, profile: ProfileInput): number {
    const pattern = new RegExp(condition.pattern, 'i');
    const field = condition.field;
    let score = 0;

    if (field === 'skills' && profile.skills) {
      score = profile.skills.filter(s => pattern.test(s.name)).length * condition.weight;
    } else if (field === 'experience' && profile.experience) {
      score = profile.experience.filter(e => pattern.test(e.title)).length * condition.weight;
    } else if (field === 'projects' && profile.projects) {
      score = profile.projects.filter(p => pattern.test(p.title)).length * condition.weight;
    } else if (field === 'certifications' && profile.certifications) {
      score = profile.certifications.filter(c => pattern.test(c.name)).length * condition.weight;
    } else if (field === 'brandDNA' && profile.brandDNA) {
      const dnaStr = JSON.stringify(profile.brandDNA);
      score = pattern.test(dnaStr) ? condition.weight : 0;
    } else if (field === 'careerBlueprint' && profile.careerBlueprint) {
      const bpStr = JSON.stringify(profile.careerBlueprint);
      score = pattern.test(bpStr) ? condition.weight : 0;
    }

    return Math.min(score, condition.weight * 3);
  }

  private generateRationale(pillarName: string, topics: string[], profile: ProfileInput): string {
    const skillCount = profile.skills?.length || 0;
    const expCount = profile.experience?.length || 0;
    const projectCount = profile.projects?.length || 0;

    if (pillarName.includes('AI') && (skillCount > 5 || projectCount > 2)) {
      return `Strong technical background with ${skillCount}+ relevant skills and ${projectCount}+ projects — ideal for establishing AI expertise`;
    }
    if (pillarName.includes('Career') && expCount > 2) {
      return `${expCount} years of professional experience provides rich material for career insights and lessons`;
    }
    if (pillarName.includes('Startup') && expCount > 0) {
      return `Entrepreneurial experience combined with technical skills creates authentic startup content`;
    }
    if (pillarName.includes('Full Stack') && skillCount > 5) {
      return `Broad technical skill set across frontend and backend enables comprehensive full stack content`;
    }
    return `Your background in ${topics.slice(0, 2).join(', ')} makes this a natural content pillar`;
  }

  private selectPillars(candidates: PillarCandidate[], profile: ProfileInput): PillarCandidate[] {
    const core = candidates.filter(c => c.category === 'core');
    const growth = candidates.filter(c => c.category === 'growth');
    const experimental = candidates.filter(c => c.category === 'experimental');

    const selected: PillarCandidate[] = [];
    const maxTotal = 7;

    for (const pillar of core.slice(0, 4)) {
      if (selected.length < maxTotal) selected.push(pillar);
    }

    for (const pillar of growth.slice(0, 2)) {
      if (selected.length < maxTotal) selected.push(pillar);
    }

    for (const pillar of experimental.slice(0, 1)) {
      if (selected.length < maxTotal) selected.push(pillar);
    }

    return selected;
  }

  private deduplicateByName(pillars: PillarCandidate[]): PillarCandidate[] {
    const seen = new Set<string>();
    return pillars.filter(p => {
      const key = p.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

export const pillarGenerationEngine = new PillarGenerationEngine();
