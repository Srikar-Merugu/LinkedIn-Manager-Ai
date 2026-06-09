import pino from 'pino';

const logger = pino();

export interface AgentInput {
  message: string;
  userId: string;
  context: any;
  history: any[];
  preferences: any;
}

export interface AgentResponse {
  content: string;
  recommendations: any[];
  actions: any[];
  insights: any[];
  contextSwitch?: string;
}

export class ContentAgent {
  async process(input: AgentInput): Promise<AgentResponse | null> {
    const intent = this.detectIntent(input.message);
    if (!intent) return null;

    logger.info({ intent }, 'ContentAgent processing');

    switch (intent) {
      case 'what_to_post':
        return this.handleWhatToPost(input);
      case 'content_ideas':
        return this.handleContentIdeas(input);
      case 'content_review':
        return this.handleContentReview(input);
      case 'content_strategy':
        return this.handleContentStrategy(input);
      case 'calendar_planning':
        return this.handleCalendarPlanning(input);
      default:
        return null;
    }
  }

  detectIntent(message: string): string | null {
    const m = message.toLowerCase();
    if (m.includes('what should i post') || m.includes('post today') || m.includes('post this week')) return 'what_to_post';
    if (m.includes('content idea') || m.includes('what to write') || m.includes('topic')) return 'content_ideas';
    if (m.includes('review my post') || m.includes('review this') || m.includes('feedback on')) return 'content_review';
    if (m.includes('content strategy') || m.includes('strategy review') || m.includes('content plan')) return 'content_strategy';
    if (m.includes('calendar') || m.includes('schedule') || m.includes('plan my')) return 'calendar_planning';
    return null;
  }

  private async handleWhatToPost(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const calendar = context.calendar || [];
    const opportunities = context.opportunities || [];
    const strategy = context.contentStrategy;
    const analytics = context.analytics;

    const pending = calendar.filter((c: any) => c.status === 'draft' || c.status === 'planned');
    const highPerforming = analytics?.topContentTypes || [];
    const bestTime = analytics?.bestTimeToPost || 'morning';

    let content = '';
    const recommendations: any[] = [];
    const insights: any[] = [];

    if (opportunities.length > 0) {
      const top = opportunities[0];
      content = `Based on your recent activity, I recommend creating content about "${top.title}". This aligns with your ${top.signalType || 'career trajectory'} and has strong engagement potential.`;
      recommendations.push({ title: `Create post about ${top.title}`, type: 'content', priority: 'high', action: 'generate_post', params: { topic: top.title, context: top.description, sourceType: 'opportunity' } });
    } else if (pending.length > 0) {
      const next = pending[0];
      content = `You have ${pending.length} drafts ready to develop. "${next.topic || next.title}" is a great place to start — it's already aligned with your content strategy.`;
      recommendations.push({ title: `Develop draft: ${next.topic || next.title}`, type: 'content', priority: 'medium', action: 'create_draft', params: { calendarEntryId: next._id } });
    } else if (strategy) {
      const theme = strategy.weeklyThemes?.[0];
      if (theme) {
        content = `Your current strategy focuses on "${theme.theme || theme.name}". I suggest creating a ${strategy.contentMix?.[0]?.type || 'story'} post around this theme — it's what your audience responds to best.`;
        recommendations.push({ title: `Create ${theme.theme || theme.name} post`, type: 'content', priority: 'medium', action: 'generate_post', params: { topic: theme.theme, context: theme.description, sourceType: 'strategy' } });
      }
    }

    if (highPerforming.length > 0) {
      insights.push(`Your ${highPerforming[0]} posts perform best. Consider this format for your next post.`);
    }
    if (bestTime) {
      insights.push(`Your audience engages most in the ${bestTime}. Schedule your post accordingly.`);
    }

    if (!content) {
      content = `Here's what I recommend for your next post:\n\n1. Share a recent learning or insight from your work.\n2. Create a framework post around a process you've mastered.\n3. Tell a story about a challenge you overcame.\n\nYour voice profile suggests your audience responds best to authentic, experience-driven content.`;
    }

    return { content, recommendations, actions: recommendations.map(r => ({ type: r.action, title: r.title, params: r.params })), insights };
  }

  private async handleContentIdeas(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const pillars = context.contentPillars || [];
    const strategy = context.contentStrategy;
    const opportunities = context.opportunities || [];

    const ideas: string[] = [];
    const recommendations: any[] = [];
    const insights: any[] = [];

    if (pillars.length > 0) {
      pillars.slice(0, 3).forEach((p: any) => {
        ideas.push(`**${p.name}**: Share a deep dive on ${p.topics?.[0] || p.name}. Your audience sees you as an authority here.`);
        recommendations.push({ title: `Create ${p.name} pillar post`, type: 'content', priority: 'medium', action: 'generate_post', params: { topic: p.name, context: p.description, contentType: 'educational' } });
      });
    }

    if (opportunities.length > 0) {
      ideas.push(`**Opportunity Alert**: "${opportunities[0].title}" — this could make a great case study or story post.`);
      recommendations.push({ title: `Create opportunity post: ${opportunities[0].title}`, type: 'content', priority: 'high', action: 'generate_post', params: { topic: opportunities[0].title, context: opportunities[0].description, sourceType: 'opportunity' } });
    }

    if (strategy?.contentMix) {
      const mix = strategy.contentMix;
      const suggestedTypes = mix.filter((m: any) => m.percentage > 20).map((m: any) => m.type);
      if (suggestedTypes.length > 0) {
        insights.push(`Your strategy recommends ${suggestedTypes.join(' and ')} content this month.`);
      }
    }

    const content = ideas.length > 0
      ? `Here are content ideas based on your profile:\n\n${ideas.join('\n\n')}`
      : `Here are some content ideas to get started:\n\n1. **Industry Insight**: Share your perspective on a recent trend.\n2. **Career Lesson**: What's the biggest lesson you've learned this year?\n3. **Process Post**: Break down a workflow or system you use.\n4. **Behind the Scenes**: Show how you work or think.`;

    return { content, recommendations, actions: [], insights };
  }

  private async handleContentReview(input: AgentInput): Promise<AgentResponse> {
    return {
      content: "I'd be happy to review your content. Could you share the post you'd like me to analyze? I'll check it against your voice profile, brand guidelines, and career goals to provide detailed feedback.",
      recommendations: [], actions: [], insights: [],
    };
  }

  private async handleContentStrategy(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const strategy = context.contentStrategy;

    if (!strategy) {
      return {
        content: "You haven't generated a content strategy yet. I recommend starting with a strategy report — it will analyze your profile, career goals, and brand to create a 90-day content plan.",
        recommendations: [{ title: 'Generate Content Strategy', type: 'strategy', priority: 'critical', action: 'regenerate_strategy', params: {} }],
        actions: [], insights: [],
      };
    }

    const insights: string[] = [];
    const recommendations: any[] = [];

    insights.push(`Your current strategy has ${strategy.phases?.length || 3} phases spanning 90 days.`);
    if (strategy.scores) {
      const lowest = Object.entries(strategy.scores).sort(([, a]: any, [, b]: any) => a - b)[0];
      insights.push(`Your lowest scoring area is "${lowest[0]}" (${lowest[1]}/100). Consider focusing on this in your next content cycle.`);
    }

    return {
      content: "Your content strategy is active and guiding your content calendar. Would you like me to suggest optimizations or generate a specific post based on your current strategy phase?",
      recommendations, actions: [], insights,
    };
  }

  private async handleCalendarPlanning(input: AgentInput): Promise<AgentResponse> {
    return {
      content: "Let me check your content calendar for the best posting opportunities.\n\nI can help you:\n• Fill gaps in your content calendar\n• Plan posts around key dates and opportunities\n• Balance your content mix based on your strategy\n\nWould you like me to open your content calendar?",
      recommendations: [{ title: 'Open Content Calendar', type: 'navigation', priority: 'medium', action: 'view_calendar', params: {} }],
      actions: [], insights: [],
    };
  }
}

export const contentAgent = new ContentAgent();
