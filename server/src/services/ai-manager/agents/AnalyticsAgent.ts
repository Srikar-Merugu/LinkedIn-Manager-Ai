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

export class AnalyticsAgent {
  async process(input: AgentInput): Promise<AgentResponse | null> {
    const intent = this.detectIntent(input.message);
    if (!intent) return null;

    logger.info({ intent }, 'AnalyticsAgent processing');

    switch (intent) {
      case 'engagement_drop':
        return this.handleEngagementDrop(input);
      case 'performance':
        return this.handlePerformance(input);
      case 'what_works':
        return this.handleWhatWorks(input);
      case 'next_month':
        return this.handleNextMonth(input);
      default:
        return null;
    }
  }

  detectIntent(message: string): string | null {
    const m = message.toLowerCase();
    if (m.includes('engagement drop') || m.includes('engagement down') || m.includes('not performing') || m.includes('low engagement')) return 'engagement_drop';
    if (m.includes('how am i') || m.includes('my performance') || m.includes('content doing')) return 'performance';
    if (m.includes('what works') || m.includes('best content') || m.includes('what type') || m.includes('top posts')) return 'what_works';
    if (m.includes('next month') || m.includes('focus on') || m.includes('what should i focus')) return 'next_month';
    return null;
  }

  private async handleEngagementDrop(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const analytics = context.analytics;

    const recommendations: any[] = [];
    const insights: any[] = [];

    let content = '';

    if (!analytics) {
      content = "I don't have enough analytics data yet. Connect your LinkedIn profile and create a few posts so I can analyze your performance patterns.";
      recommendations.push({ title: 'Sync LinkedIn Analytics', type: 'analytics', priority: 'medium', action: 'sync_profile', params: {} });
    } else {
      content = "Let me analyze your recent engagement trends.\n\nCommon reasons for engagement drops:\n1. **Content fatigue** — your audience might need variety in content types\n2. **Timing** — you might be posting at suboptimal times\n3. **Hook strength** — weak hooks lead to fewer stops and reads\n4. **Value density** — ensure every post provides clear value\n\nHere's what your data suggests:";

      if (analytics.bestContentTypes?.length > 0) {
        insights.push(`Your ${analytics.bestContentTypes[0]} posts get the most engagement. Try returning to this format.`);
        recommendations.push({ title: `Create ${analytics.bestContentTypes[0]} post`, type: 'content', priority: 'high', action: 'generate_post', params: { contentType: analytics.bestContentTypes[0], sourceType: 'strategy' } });
      }

      if (analytics.bestTimeToPost) {
        insights.push(`Your audience engages most in the ${analytics.bestTimeToPost}. Try posting during this window.`);
      }

      if (analytics.averageEngagement && analytics.averageEngagement < 0.03) {
        insights.push('Your engagement rate is below average. Focus on creating more interactive content — ask questions, run polls, share controversial opinions.');
      }
    }

    if (insights.length === 0) {
      insights.push('Create more varied content types to test what resonates with your audience.');
      recommendations.push({ title: 'Review Content Strategy', type: 'strategy', priority: 'medium', action: 'view_strategy', params: {} });
    }

    return { content, recommendations, actions: [], insights };
  }

  private async handlePerformance(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const analytics = context.analytics;
    const posts = context.recentPosts || [];

    const insights: any[] = [];

    if (!analytics || analytics.totalPosts === 0) {
      return {
        content: "You haven't published enough content for meaningful analytics yet. Create at least 10 posts before analyzing performance trends. I can help you get started with your first post!",
        recommendations: [{ title: 'Create Your First Post', type: 'content', priority: 'high', action: 'generate_post', params: { contentType: 'story', sourceType: 'manual' } }],
        actions: [], insights: [],
      };
    }

    if (analytics.bestContentTypes?.length > 0) {
      insights.push(`Top performing content type: ${analytics.bestContentTypes[0]}`);
    }
    if (analytics.bestTimeToPost) {
      insights.push(`Best time to post: ${analytics.bestTimeToPost}`);
    }
    if (analytics.averageEngagement) {
      insights.push(`Average engagement rate: ${(analytics.averageEngagement * 100).toFixed(1)}%`);
    }

    const content = `Here's your content performance overview:\n\n**Total posts**: ${analytics.totalPosts || posts.length}\n${analytics.averageEngagement ? `**Avg engagement**: ${(analytics.averageEngagement * 100).toFixed(1)}%\n` : ''}${analytics.bestTimeToPost ? `**Best time**: ${analytics.bestTimeToPost}\n` : ''}${analytics.bestDayToPost ? `**Best day**: ${analytics.bestDayToPost}\n` : ''}\n${insights.length > 0 ? `**Key insights**:\n${insights.map(i => `• ${i}`).join('\n')}` : ''}\n\nWould you like specific recommendations to improve your performance?`;

    return { content, recommendations: [], actions: [], insights };
  }

  private async handleWhatWorks(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const analytics = context.analytics;
    const posts = context.recentPosts || [];

    if (!analytics || posts.length < 3) {
      return {
        content: "I need at least 3 published posts to analyze what works. Once you have more content, I can tell you exactly what resonates with your audience.",
        recommendations: [{ title: 'Create More Content', type: 'content', priority: 'medium', action: 'generate_post', params: { sourceType: 'manual' } }],
        actions: [], insights: [],
      };
    }

    const insights: any[] = [];
    if (analytics.bestContentTypes?.length > 0) insights.push(`**${analytics.bestContentTypes[0].charAt(0).toUpperCase() + analytics.bestContentTypes[0].slice(1)}** posts drive the most engagement.`);
    if (analytics.bestTimeToPost) insights.push(`Posting in the **${analytics.bestTimeToPost}** gets the best results.`);
    if (analytics.topPillars?.length > 0) insights.push(`Your **${analytics.topPillars[0]}** pillar outperforms others.`);

    return {
      content: `Based on your analytics, here's what works best:\n\n${insights.join('\n')}\n\nI recommend creating more ${analytics.bestContentTypes?.[0] || 'educational'} content aligned with your top pillar.`,
      recommendations: analytics.bestContentTypes?.[0] ? [{ title: `Create ${analytics.bestContentTypes[0]} post`, type: 'content', priority: 'high', action: 'generate_post', params: { contentType: analytics.bestContentTypes[0], sourceType: 'strategy' } }] : [],
      actions: [], insights,
    };
  }

  private async handleNextMonth(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const strategy = context.contentStrategy;
    const analytics = context.analytics;

    const insights: any[] = [];
    const recommendations: any[] = [];

    if (strategy) {
      const nextPhase = strategy.phases?.[1] || strategy.phases?.[0];
      if (nextPhase) {
        insights.push(`Your next strategy phase: ${nextPhase.name || nextPhase.focus}`);
        recommendations.push({ title: 'Review Next Strategy Phase', type: 'strategy', priority: 'medium', action: 'view_strategy', params: {} });
      }
    }

    if (analytics?.bestContentTypes?.length > 0) {
      insights.push(`Double down on ${analytics.bestContentTypes[0]} content — it's your top performer.`);
    }

    const content = insights.length > 0
      ? `Here's what I recommend focusing on next month:\n\n${insights.map(i => `• ${i}`).join('\n')}\n\nI can help you create a detailed monthly plan based on these insights.`
      : "Let's plan your next month. I recommend:\n1. Review your content strategy for the upcoming phase\n2. Analyze what's working and double down\n3. Plan content around key dates and opportunities\n\nWould you like me to help you build a monthly content plan?";

    return { content, recommendations, actions: [], insights };
  }
}

export const analyticsAgent = new AnalyticsAgent();
