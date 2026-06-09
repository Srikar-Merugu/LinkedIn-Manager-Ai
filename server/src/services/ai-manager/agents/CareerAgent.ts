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

export class CareerAgent {
  async process(input: AgentInput): Promise<AgentResponse | null> {
    const intent = this.detectIntent(input.message);
    if (!intent) return null;

    logger.info({ intent }, 'CareerAgent processing');

    switch (intent) {
      case 'career_goals':
        return this.handleCareerGoals(input);
      case 'skill_gaps':
        return this.handleSkillGaps(input);
      case 'networking':
        return this.handleNetworking(input);
      case 'opportunities':
        return this.handleOpportunities(input);
      case 'recruiters':
        return this.handleRecruiters(input);
      case 'freelance':
        return this.handleFreelance(input);
      default:
        return null;
    }
  }

  detectIntent(message: string): string | null {
    const m = message.toLowerCase();
    if (m.includes('career goal') || m.includes('career path') || m.includes('next role') || m.includes('promotion')) return 'career_goals';
    if (m.includes('skill') || m.includes('learn') || m.includes('improve at') || m.includes('develop')) return 'skill_gaps';
    if (m.includes('network') || m.includes('connect with') || m.includes('reach out')) return 'networking';
    if (m.includes('opportunity') || m.includes('job') || m.includes('hire') || m.includes('position')) return 'opportunities';
    if (m.includes('recruiter') || m.includes('hire me') || m.includes('get noticed')) return 'recruiters';
    if (m.includes('freelance') || m.includes('client') || m.includes('consulting')) return 'freelance';
    return null;
  }

  private async handleCareerGoals(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const goals = context.careerGoals;
    const blueprint = context.careerBlueprint;

    const recommendations: any[] = [];
    const insights: any[] = [];

    if (!goals || goals.length === 0) {
      return {
        content: "You haven't set your career goals yet. Let's define them — knowing where you want to go helps me create the right content and networking strategy to get you there.",
        recommendations: [{ title: 'Define Career Goals', type: 'career', priority: 'critical', action: 'view_career', params: {} }],
        actions: [], insights: [],
      };
    }

    const primary = goals[0];
    let content = `Your primary career goal is **${primary.type}**: ${primary.target || primary.description}\n\nYour target role: **${context.targetRole || 'Not specified'}**\nTimeline: **${primary.timeline || 'Not specified'}**\n\nHere's how your content supports this goal:\n`;

    if (blueprint?.scores) {
      const score = blueprint.scores.overall || 70;
      content += `\nYour career blueprint score: **${score}/100**\n`;
      if (score < 70) {
        insights.push('Your career blueprint needs strengthening. Focus on creating content that demonstrates your target role skills.');
        recommendations.push({ title: 'Review Career Blueprint', type: 'career', priority: 'high', action: 'view_career', params: {} });
      }
    }

    if (blueprint?.opportunityMap) {
      const opportunities = blueprint.opportunityMap.filter((o: any) => o.priority === 'high' || o.priority === 'critical');
      if (opportunities.length > 0) {
        insights.push(`You have ${opportunities.length} high-priority career opportunities identified.`);
        recommendations.push({ title: 'Review Career Opportunities', type: 'career', priority: 'high', action: 'view_opportunities', params: {} });
      }
    }

    return { content, recommendations, actions: [], insights };
  }

  private async handleSkillGaps(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const blueprint = context.careerBlueprint;
    const gaps = blueprint?.skillGaps || [];

    if (gaps.length === 0) {
      return {
        content: "I haven't identified your skill gaps yet. Let's analyze your current skills against your target role to find opportunities for growth.",
        recommendations: [{ title: 'Analyze Skill Gaps', type: 'career', priority: 'medium', action: 'view_career', params: {} }],
        actions: [], insights: [],
      };
    }

    const topGaps = gaps.slice(0, 3);
    const content = `Based on your career goals, here are the skill gaps I've identified:\n\n${topGaps.map((g: any, i: number) => `${i + 1}. **${g.skill}** — ${g.importance || 'Important'} for your target role\n   ${g.recommendation || 'Focus on building this skill through projects and content.'}`).join('\n\n')}\n\nEach gap is also a content opportunity — create posts about your learning journey to demonstrate growth.`;

    const recommendations = topGaps.map((g: any) => ({
      title: `Create content about: ${g.skill}`,
      type: 'career', priority: 'medium', action: 'generate_post',
      params: { topic: `Learning ${g.skill}`, context: g.recommendation || g.skill, sourceType: 'strategy' },
    }));

    return { content, recommendations, actions: [], insights: [] };
  }

  private async handleNetworking(input: AgentInput): Promise<AgentResponse> {
    return {
      content: "Networking is a key driver of career growth. Here's my advice:\n\n1. **Engage strategically** — comment on posts from people in your target industry\n2. **Share your expertise** — create content that attracts the right connections\n3. **Be generous** — offer help and introductions without expecting returns\n4. **Follow up** — turn one-time interactions into lasting connections\n\nWould you like me to help you create a networking plan based on your career goals?",
      recommendations: [
        { title: 'Create Networking Strategy', type: 'career', priority: 'medium', action: 'view_career', params: {} },
        { title: 'Review Connection Opportunities', type: 'career', priority: 'low', action: 'view_opportunities', params: {} },
      ],
      actions: [], insights: [],
    };
  }

  private async handleOpportunities(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const opportunities = context.opportunities || [];

    if (opportunities.length === 0) {
      return {
        content: "I haven't detected any new career opportunities yet. Make sure your LinkedIn profile is synced so I can identify opportunities based on your activity.",
        recommendations: [{ title: 'Sync LinkedIn Profile', type: 'career', priority: 'medium', action: 'sync_profile', params: {} }],
        actions: [], insights: [],
      };
    }

    const top = opportunities.slice(0, 3);
    const content = `I've detected ${opportunities.length} opportunities from your recent activity:\n\n${top.map((o: any, i: number) => `${i + 1}. **${o.title}** — ${o.description.substring(0, 100)}`).join('\n\n')}\n\nEach of these can be turned into content that attracts the right career opportunities.`;

    return { content, recommendations: top.map((o: any) => ({ title: `Create opportunity post: ${o.title}`, type: 'career', priority: 'high', action: 'generate_post', params: { topic: o.title, context: o.description, sourceType: 'opportunity' } })), actions: [], insights: [] };
  }

  private async handleRecruiters(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const profile = context.linkedinProfile;

    const content = profile
      ? `To attract recruiters, focus on:\n\n1. **Optimize your headline** — it should clearly state what you do and who you help\n2. **Showcase results** — your experience section should highlight outcomes, not responsibilities\n3. **Create career-focused content** — share insights about your industry and role\n4. **Build authority** — become the go-to person in your niche\n\nYour LinkedIn profile is synced. Would you like me to suggest specific improvements?`
      : "To attract recruiters, first connect your LinkedIn profile so I can analyze it and provide personalized recommendations.";

    return {
      content,
      recommendations: [
        { title: profile ? 'Optimize LinkedIn Profile' : 'Sync LinkedIn Profile', type: 'career', priority: 'high', action: profile ? 'update_profile' : 'sync_profile', params: {} },
        { title: 'Create Recruiter-Focused Content', type: 'career', priority: 'medium', action: 'generate_post', params: { topic: 'Career insights', contentType: 'career_lesson', sourceType: 'strategy' } },
      ],
      actions: [], insights: [],
    };
  }

  private async handleFreelance(input: AgentInput): Promise<AgentResponse> {
    return {
      content: "To attract freelance clients through LinkedIn:\n\n1. **Define your offer** — be clear about what problems you solve\n2. **Share case studies** — demonstrate results with past client work\n3. **Educate your audience** — create content that showcases your expertise\n4. **Engage with potential clients** — comment on their posts, offer value\n5. **Use your headline** — include what you do and who you serve\n\nWould you like me to help you create a freelance-focused content strategy?",
      recommendations: [
        { title: 'Create Freelance Case Study Post', type: 'career', priority: 'high', action: 'generate_post', params: { topic: 'Client success story', contentType: 'case_study', sourceType: 'strategy' } },
        { title: 'Review Profile for Freelance Appeal', type: 'career', priority: 'medium', action: 'update_profile', params: {} },
      ],
      actions: [], insights: [],
    };
  }
}

export const careerAgent = new CareerAgent();
