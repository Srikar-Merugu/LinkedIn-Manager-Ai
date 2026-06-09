import pino from 'pino';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string; endorsements?: number }>;
  experience?: Array<{ title: string; company?: string; years?: number }>;
  projects?: Array<{ title: string; technologies?: string[] }>;
  contentPillars?: Array<{ name: string; authorityScore?: number }>;
  careerGoal?: { targetRole?: string };
}

interface AuthorityTopic {
  name: string;
  category: 'dominate' | 'expand' | 'explore' | 'avoid';
  currentAuthority: number;
  targetAuthority: number;
  milestones: Array<{ description: string; timeframe: string }>;
  contentSuggestions: string[];
}

interface MonthlyPriority {
  month: number;
  focus: string;
  topics: string[];
  targetOutcome: string;
}

interface CompetitiveGap {
  topic: string;
  currentStanding: string;
  targetStanding: string;
  strategy: string;
}

interface AuthorityRoadmapOutput {
  topics: AuthorityTopic[];
  growthPath: string[];
  monthlyPriorities: MonthlyPriority[];
  competitiveGap: CompetitiveGap[];
  overallAuthorityProjection: number;
}

export class AuthorityBuildingEngine {
  analyze(profile: ProfileInput): AuthorityRoadmapOutput {
    logger.info('Analyzing authority building opportunities');
    const topics: AuthorityTopic[] = [];
    const skills = profile.skills || [];
    const pillars = profile.contentPillars || [];
    const targetRole = profile.careerGoal?.targetRole || '';

    for (const skill of skills) {
      const endorsementLevel = skill.endorsements || 0;
      if (endorsementLevel > 20) {
        topics.push(this.buildTopic(skill.name, 'dominate', 75, 95, skill.name));
      } else if (endorsementLevel > 10) {
        topics.push(this.buildTopic(skill.name, 'expand', 50, 80, skill.name));
      } else {
        topics.push(this.buildTopic(skill.name, 'explore', 25, 60, skill.name));
      }
    }

    for (const pillar of pillars) {
      if (!topics.find(t => t.name === pillar.name)) {
        const baseScore = pillar.authorityScore || 40;
        topics.push(this.buildTopic(pillar.name, baseScore > 60 ? 'dominate' : 'expand', baseScore, Math.min(100, baseScore + 30), pillar.name));
      }
    }

    if (targetRole) {
      const existing = topics.find(t => t.name.toLowerCase().includes(targetRole.toLowerCase().split(' ')[0]));
      if (!existing) {
        topics.push({
          name: `${targetRole} Expertise`,
          category: 'dominate',
          currentAuthority: 30,
          targetAuthority: 85,
          milestones: [
            { description: `Publish 10 posts about ${targetRole}`, timeframe: 'Month 1' },
            { description: 'Get featured in industry discussions', timeframe: 'Month 2' },
            { description: 'Establish as go-to expert in niche', timeframe: 'Month 3' },
          ],
          contentSuggestions: [
            `Your unique approach to ${targetRole}`,
            `Lessons from your ${targetRole} journey`,
            `${targetRole} frameworks you built`,
            `Industry insights on ${targetRole} trends`,
          ],
        });
      }
    }

    const unrelated = ['general motivation', 'personal life', 'non-work hobbies', 'politics'];
    for (const u of unrelated) {
      if (!topics.find(t => t.name.toLowerCase() === u)) {
        topics.push({
          name: u,
          category: 'avoid',
          currentAuthority: 0,
          targetAuthority: 0,
          milestones: [],
          contentSuggestions: [],
        });
      }
    }

    const growthPath = [
      'Establish foundational expertise through educational content',
      'Demonstrate practical application via case studies and projects',
      'Differentiate through unique frameworks and perspectives',
      'Expand into adjacent domains that complement core expertise',
      'Achieve recognized authority through industry conversations',
    ];

    const monthlyPriorities = [
      { month: 1, focus: 'Foundation', topics: topics.filter(t => t.category === 'dominate').slice(0, 3).map(t => t.name), targetOutcome: 'Establish baseline authority in core topics' },
      { month: 2, focus: 'Expansion', topics: topics.filter(t => t.category === 'expand').slice(0, 3).map(t => t.name), targetOutcome: 'Expand reach into adjacent authority areas' },
      { month: 3, focus: 'Differentiation', topics: [topics.find(t => t.category === 'dominate')?.name || ''].filter(Boolean), targetOutcome: 'Differentiate through unique perspectives and frameworks' },
    ];

    const competitiveGap = topics
      .filter(t => t.category !== 'avoid' && t.currentAuthority < t.targetAuthority)
      .map(t => ({
        topic: t.name,
        currentStanding: `${t.currentAuthority}/100`,
        targetStanding: `${t.targetAuthority}/100`,
        strategy: `Bridge ${t.targetAuthority - t.currentAuthority} point gap through ${t.category === 'dominate' ? 'authoritative thought leadership' : t.category === 'expand' ? 'consistent educational content' : 'targeted learning and content'} over 90 days`,
      }));

    const overallAuthorityProjection = Math.round(
      topics
        .filter(t => t.category !== 'avoid')
        .reduce((sum, t) => sum + (t.currentAuthority + (t.targetAuthority - t.currentAuthority) * 0.6), 0) /
      Math.max(topics.filter(t => t.category !== 'avoid').length, 1)
    );

    return { topics, growthPath, monthlyPriorities, competitiveGap, overallAuthorityProjection };
  }

  private buildTopic(name: string, category: 'dominate' | 'expand' | 'explore' | 'avoid', current: number, target: number, skillName: string): AuthorityTopic {
    return {
      name,
      category,
      currentAuthority: current,
      targetAuthority: target,
      milestones: [
        { description: `Publish 5 posts about ${name}`, timeframe: 'Weeks 1-4' },
        { description: `Engage with top ${name} content`, timeframe: 'Weeks 5-8' },
        { description: `Establish ${name} thought leadership`, timeframe: 'Weeks 9-12' },
      ],
      contentSuggestions: [
        `Core concepts in ${name}`,
        `Real-world ${name} applications from your experience`,
        `Common ${name} mistakes and solutions`,
        `Future trends in ${name}`,
        `Your unique ${name} framework`,
      ],
    };
  }
}

export const authorityBuildingEngine = new AuthorityBuildingEngine();
