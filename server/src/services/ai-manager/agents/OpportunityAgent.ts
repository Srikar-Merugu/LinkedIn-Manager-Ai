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

export class OpportunityAgent {
  async process(input: AgentInput): Promise<AgentResponse | null> {
    const intent = this.detectIntent(input.message);
    if (!intent) return null;

    logger.info({ intent }, 'OpportunityAgent processing');

    switch (intent) {
      case 'find_opportunities':
        return this.handleFindOpportunities(input);
      case 'new_opportunities':
        return this.handleNewOpportunities(input);
      case 'opportunity_analysis':
        return this.handleOpportunityAnalysis(input);
      default:
        return null;
    }
  }

  detectIntent(message: string): string | null {
    const m = message.toLowerCase();
    if (m.includes('find opportunity') || m.includes('discover') || m.includes('what should i pursue')) return 'find_opportunities';
    if (m.includes('new opportunity') || m.includes('recent') || m.includes('latest') || m.includes('what came up')) return 'new_opportunities';
    if (m.includes('analyze opportunity') || m.includes('opportunity analysis') || m.includes('which opportunity')) return 'opportunity_analysis';
    return null;
  }

  private async handleFindOpportunities(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const opportunities = context.opportunities || [];

    if (opportunities.length === 0) {
      return {
        content: "I haven't detected any opportunities yet. To find opportunities, sync your LinkedIn, GitHub, and other professional profiles. I'll monitor them continuously for growth signals.",
        recommendations: [
          { title: 'Sync LinkedIn Profile', type: 'career', priority: 'high', action: 'sync_profile', params: {} },
          { title: 'Run Opportunity Detection', type: 'opportunity', priority: 'high', action: 'mine_opportunities', params: {} },
        ],
        actions: [], insights: [],
      };
    }

    const byPriority: Record<string, number> = {};
    opportunities.forEach((o: any) => { byPriority[o.priority || 'medium'] = (byPriority[o.priority || 'medium'] || 0) + 1; });

    const top = opportunities.filter((o: any) => o.priority === 'immediate' || o.priority === 'high').slice(0, 3);

    let content = `I found ${opportunities.length} content opportunities from your recent activity:\n\n`;
    content += `By priority: ${Object.entries(byPriority).map(([p, c]) => `${p}: ${c}`).join(', ')}\n\n`;

    if (top.length > 0) {
      content += `Top immediate opportunities:\n`;
      top.forEach((o: any, i: number) => {
        content += `${i + 1}. **${o.title}** — ${o.keyInsight || o.description?.substring(0, 80)}\n`;
      });
      content += `\nEach of these can be turned into high-performing LinkedIn content.`;
    } else {
      content += `All opportunities have been processed. Run a new scan to find fresh content ideas.`;
    }

    const recommendations = top.map((o: any) => ({
      title: `Create post: ${o.title}`, type: 'opportunity', priority: 'high', action: 'generate_post',
      params: { topic: o.title, context: o.description, keyInsight: o.keyInsight, sourceType: 'opportunity', sourceId: o._id },
    }));

    return { content, recommendations, actions: [], insights: [`${opportunities.length} opportunities available`] };
  }

  private async handleNewOpportunities(input: AgentInput): Promise<AgentResponse> {
    return {
      content: "Let me scan for new opportunities based on your recent activity. I'll check:\n• LinkedIn profile changes\n• GitHub activity\n• New certifications\n• Portfolio updates\n• Resume changes\n\nI'll let you know what I find and recommend the best content opportunities.",
      recommendations: [
        { title: 'Scan for New Opportunities', type: 'opportunity', priority: 'high', action: 'mine_opportunities', params: {} },
        { title: 'Review Latest Signals', type: 'opportunity', priority: 'medium', action: 'view_opportunities', params: {} },
      ],
      actions: [], insights: [],
    };
  }

  private async handleOpportunityAnalysis(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const opportunities = context.opportunities || [];

    if (opportunities.length === 0) {
      return {
        content: "No opportunities to analyze yet. Run an opportunity scan first, and I'll help you prioritize the best ones.",
        recommendations: [{ title: 'Run Opportunity Scan', type: 'opportunity', priority: 'high', action: 'mine_opportunities', params: {} }],
        actions: [], insights: [],
      };
    }

    const scored = opportunities
      .filter((o: any) => o.scores?.overall)
      .sort((a: any, b: any) => (b.scores?.overall || 0) - (a.scores?.overall || 0));

    const content = scored.length > 0
      ? `I've analyzed ${scored.length} scored opportunities. The highest potential opportunity is "${scored[0].title}" with a score of ${scored[0].scores.overall}/100.\n\n${scored.slice(0, 3).map((o: any, i: number) => `${i + 1}. **${o.title}** — Score: ${o.scores.overall}/100 — ${o.scores.authority ? `Authority: ${o.scores.authority}, Career: ${o.scores.career}` : ''}`).join('\n')}\n\nWould you like me to generate content for the top opportunity?`
      : "I found opportunities but they haven't been scored yet. Run the full mining pipeline to get prioritization scores.";

    return {
      content,
      recommendations: scored.length > 0 ? [{ title: `Create top opportunity: ${scored[0].title}`, type: 'content', priority: 'high', action: 'generate_post', params: { topic: scored[0].title, sourceType: 'opportunity', sourceId: scored[0]._id } }] : [{ title: 'Run Full Opportunity Mining', type: 'opportunity', priority: 'high', action: 'mine_opportunities', params: {} }],
      actions: [], insights: [],
    };
  }
}

export const opportunityAgent = new OpportunityAgent();
