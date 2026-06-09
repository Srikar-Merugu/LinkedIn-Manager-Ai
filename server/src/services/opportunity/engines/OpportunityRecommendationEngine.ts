import mongoose from 'mongoose';
import pino from 'pino';
import { OpportunityRecommendation, IOpportunityRecommendation } from '../../../models/opportunity/OpportunityRecommendation';

const logger = pino();

interface RecommendationInput {
  userId: mongoose.Types.ObjectId;
  opportunityId?: mongoose.Types.ObjectId;
  signalId?: mongoose.Types.ObjectId;
  signalType: string;
  title: string;
  description: string;
  overallScore: number;
  anglesCount: number;
  relevantPillars: string[];
}

export class OpportunityRecommendationEngine {
  async generate(input: RecommendationInput): Promise<IOpportunityRecommendation> {
    logger.info({ title: input.title }, 'Generating opportunity recommendation');

    const recommendations = this.getRecommendationText(input);
    const suggestedActions = this.getSuggestedActions(input);

    const doc = await OpportunityRecommendation.create({
      userId: input.userId,
      opportunityId: input.opportunityId,
      signalId: input.signalId,
      type: input.signalType,
      title: recommendations.title,
      message: recommendations.message,
      suggestedActions,
      priority: input.overallScore >= 70 ? 'high' : input.overallScore >= 45 ? 'medium' : 'low',
      status: 'pending',
      confidence: Math.min(0.95, input.overallScore / 100 + 0.1),
      reasoning: recommendations.reasoning,
      metadata: { signalType: input.signalType, anglesCount: input.anglesCount, relevantPillars: input.relevantPillars },
    });

    logger.info({ recommendationId: doc._id, priority: doc.priority }, 'Recommendation generated');
    return doc;
  }

  private getRecommendationText(input: RecommendationInput): { title: string; message: string; reasoning: string } {
    const base = {
      certification: {
        title: 'Turn your certification into content',
        message: `You recently earned a certification. This is a high-value content opportunity that demonstrates your commitment to growth. Create a post sharing your study journey, key takeaways, and how it's already impacting your work.`,
        reasoning: `Certification content builds authority (${input.overallScore}/100 score) and attracts recruiter attention. Best posted within the first week of earning.`,
      },
      project: {
        title: 'Share your project journey',
        message: `You completed a project worth sharing. Break down the problem, your approach, and the key learnings. Project deep-dives are among the highest-engagement content types on LinkedIn.`,
        reasoning: `Project content demonstrates practical skills and problem-solving ability. High engagement and networking potential.`,
      },
      career_change: {
        title: 'Announce your career move strategically',
        message: `A career change is one of the most powerful content opportunities. Share your journey — not just the announcement. The story of how you got here resonates more than the title itself.`,
        reasoning: `Career change content has the highest engagement potential and attracts the widest audience. Should be published as soon as possible.`,
      },
      open_source: {
        title: 'Your open source work deserves attention',
        message: `Open source contributions build credibility with developers and technical leaders. Share what you built, why it matters, and how others can contribute or use it.`,
        reasoning: `Open source content positions you as a community contributor and technical expert. Strong networking potential.`,
      },
      milestone: {
        title: 'Celebrate and share your milestone',
        message: `Milestones are content gold. Your network wants to celebrate with you, and your story can inspire others. Share the journey, not just the destination.`,
        reasoning: `Milestone content has high story potential and builds authentic connections with your audience.`,
      },
    };

    const key = input.signalType as keyof typeof base;
    const template = base[key] || {
      title: 'Share your professional activity',
      message: `Your recent ${input.signalType} is worth sharing with your network. Create content that highlights what you learned and how it impacts your professional journey.`,
      reasoning: `Professional activity content maintains visibility and demonstrates active career development.`,
    };

    return template;
  }

  private getSuggestedActions(input: RecommendationInput): Array<'create_post' | 'add_to_calendar' | 'update_strategy' | 'notify_user' | 'generate_draft'> {
    const actions: Array<'create_post' | 'add_to_calendar' | 'update_strategy' | 'notify_user' | 'generate_draft'> = ['notify_user', 'add_to_calendar'];

    if (input.overallScore >= 65) actions.push('create_post');
    if (input.overallScore >= 80) actions.push('generate_draft');
    if (input.anglesCount >= 3) actions.push('update_strategy');

    return actions;
  }
}

export const opportunityRecommendationEngine = new OpportunityRecommendationEngine();
