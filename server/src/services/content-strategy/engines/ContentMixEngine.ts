import pino from 'pino';

const logger = pino();

interface ProfileInput {
  careerGoal?: { targetRole?: string; primaryGoal?: string };
  experience?: Array<{ title: string }>;
  skills?: Array<{ name: string }>;
}

interface ContentTypeDistribution {
  type: string;
  percentage: number;
  reasoning: string;
}

interface ContentMixOutput {
  distributions: ContentTypeDistribution[];
  summary: string;
}

export class ContentMixEngine {
  distribute(profile: ProfileInput, phase: 'positioning' | 'authority' | 'opportunity'): ContentMixOutput {
    logger.info({ phase }, 'Calculating content mix distribution');
    const expLevel = (profile.experience?.length || 0) > 5 ? 'senior' : (profile.experience?.length || 0) > 2 ? 'mid' : 'junior';

    const phaseMixes: Record<string, ContentTypeDistribution[]> = {
      positioning: [
        { type: 'Story Posts', percentage: 30, reasoning: 'Personal stories build initial trust and human connection with new audience.' },
        { type: 'Journey Posts', percentage: 25, reasoning: 'Sharing professional journey establishes credibility through authentic experience show, not tell.' },
        { type: 'Project Posts', percentage: 25, reasoning: 'Concrete project showcases provide tangible proof of capability and expertise.' },
        { type: 'Lessons Learned', percentage: 20, reasoning: 'Transparent lessons build trust faster than perfect success stories.' },
      ],
      authority: [
        { type: 'Educational Posts', percentage: 30, reasoning: 'Educational content establishes domain expertise and provides lasting value that saves, shares, and references.' },
        { type: 'Framework Posts', percentage: 25, reasoning: 'Original frameworks differentiate your thinking and become signature content assets.' },
        { type: 'Case Studies', percentage: 25, reasoning: 'Detailed case studies prove real-world application and problem-solving capability.' },
        { type: 'Deep Dives', percentage: 20, reasoning: 'Technical depth signals mastery and attracts serious professionals in your field.' },
      ],
      opportunity: [
        { type: 'Opinion Posts', percentage: 25, reasoning: 'Strong opinions drive engagement, discussion, and profile visibility.' },
        { type: 'Contrarian Posts', percentage: 20, reasoning: 'Well-reasoned contrarian takes attract attention and demonstrate independent thinking.' },
        { type: 'Success Stories', percentage: 30, reasoning: 'Success stories are the highest-converting content for opportunity generation.' },
        { type: 'Industry Insights', percentage: 25, reasoning: 'Industry analysis positions you as forward-thinking and knowledgeable about trends.' },
      ],
    };

    const baseMix = phaseMixes[phase] || phaseMixes.positioning;

    const adjustedMix = baseMix.map(d => {
      let adjusted = { ...d };
      if (expLevel === 'junior' && adjusted.type === 'Deep Dives') {
        adjusted = { ...adjusted, percentage: 10, reasoning: adjusted.reasoning.replace(/[0-9]+%/, '10%').replace(/[0-9]+%/, '10%') };
      }
      if (expLevel === 'senior' && (adjusted.type === 'Story Posts' || adjusted.type === 'Journey Posts')) {
        adjusted = { ...adjusted, percentage: Math.round(d.percentage * 0.8), reasoning: `Senior professionals benefit more from insight-driven content. ${adjusted.reasoning}` };
      }
      return adjusted;
    });

    const total = adjustedMix.reduce((sum, d) => sum + d.percentage, 0);
    if (total !== 100) {
      const diff = 100 - total;
      adjustedMix[0].percentage += diff;
    }

    const summary = `${phase.charAt(0).toUpperCase() + phase.slice(1)} phase: ${adjustedMix.map(d => `${d.percentage}% ${d.type}`).join(', ')}. Optimized for ${expLevel === 'junior' ? 'building initial credibility through authentic storytelling' : expLevel === 'mid' ? 'balancing education with engagement to grow authority' : 'maximizing opportunity generation through differentiated thought leadership'}.`;

    return { distributions: adjustedMix, summary };
  }
}

export const contentMixEngine = new ContentMixEngine();
