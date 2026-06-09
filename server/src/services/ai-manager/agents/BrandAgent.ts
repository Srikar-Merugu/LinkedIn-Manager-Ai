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

export class BrandAgent {
  async process(input: AgentInput): Promise<AgentResponse | null> {
    const intent = this.detectIntent(input.message);
    if (!intent) return null;

    logger.info({ intent }, 'BrandAgent processing');

    switch (intent) {
      case 'profile_review':
        return this.handleProfileReview(input);
      case 'positioning':
        return this.handlePositioning(input);
      case 'authority':
        return this.handleAuthority(input);
      case 'brand_growth':
        return this.handleBrandGrowth(input);
      default:
        return null;
    }
  }

  detectIntent(message: string): string | null {
    const m = message.toLowerCase();
    if (m.includes('review my profile') || m.includes('linkedin profile') || m.includes('optimize my profile')) return 'profile_review';
    if (m.includes('positioning') || m.includes('how should i present') || m.includes('brand identity')) return 'positioning';
    if (m.includes('build authority') || m.includes('become an authority') || m.includes('thought leader')) return 'authority';
    if (m.includes('grow my brand') || m.includes('brand growth') || m.includes('personal brand')) return 'brand_growth';
    return null;
  }

  private async handleProfileReview(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const brand = context.brandDNA;
    const voice = context.voiceProfile;
    const profile = context.linkedinProfile;

    const recommendations: any[] = [];
    const insights: any[] = [];

    let content = '';

    if (!brand) {
      content = "You haven't set up your Brand DNA yet. This is the foundation of your personal brand. I recommend generating your Brand DNA first — it will analyze your LinkedIn profile and create a comprehensive brand identity.";
      recommendations.push({ title: 'Generate Brand DNA', type: 'brand', priority: 'critical', action: 'generate_brand', params: {} });
    } else if (!voice) {
      content = `Your Brand DNA is ready (${brand.archetype || brand.positioning} positioning). To take it further, let's analyze your Writing DNA so every post matches your voice perfectly.`;
      recommendations.push({ title: 'Analyze Writing DNA', type: 'brand', priority: 'high', action: 'generate_voice', params: {} });
    } else {
      const profileCompleteness = brand.scores?.overall || 70;
      content = `Your brand is well-defined:\n\n**Positioning**: ${brand.positioning || 'Professional'}\n**Archetype**: ${brand.archetype || 'Custom'}\n**Brand Score**: ${profileCompleteness}/100\n\nYour LinkedIn profile ${profile ? 'is synced and ready' : 'hasn\'t been synced yet — connect your LinkedIn for personalized recommendations.'}`;

      if (profileCompleteness < 80) {
        insights.push('Your brand score can be improved. Consider refining your positioning and expertise areas.');
        recommendations.push({ title: 'Refine Brand Identity', type: 'brand', priority: 'medium', action: 'update_brand', params: {} });
      }
    }

    return { content, recommendations, actions: [], insights };
  }

  private async handlePositioning(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const brand = context.brandDNA;

    if (!brand) {
      return {
        content: "Your brand positioning hasn't been defined yet. Let's start by generating your Brand DNA — I'll analyze your profile to determine your optimal positioning.",
        recommendations: [{ title: 'Generate Brand DNA', type: 'brand', priority: 'critical', action: 'generate_brand', params: {} }],
        actions: [], insights: [],
      };
    }

    return {
      content: `Your current positioning is **${brand.positioning || 'not yet defined'}**.\n\nYour brand archetype: **${brand.archetype || 'Custom'}**\nTarget audience: ${(brand.audience || []).join(', ') || 'Not yet defined'}\nExpertise areas: ${(brand.expertise || []).join(', ') || 'Not yet defined'}\n\nWould you like to refine your positioning or explore how it affects your content strategy?`,
      recommendations: [
        { title: 'Review Brand Strategy', type: 'brand', priority: 'medium', action: 'view_brand', params: {} },
        { title: 'Explore Authority Building', type: 'brand', priority: 'medium', action: 'switch_context', params: { context: 'authority' } },
      ],
      actions: [], insights: [],
    };
  }

  private async handleAuthority(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const strategy = context.contentStrategy;
    const pillars = context.contentPillars || [];

    const recommendations: any[] = [];
    const insights: any[] = [];

    let content = '';
    if (pillars.length > 0) {
      const topPillar = pillars[0];
      content = `Building authority starts with consistency. You have ${pillars.length} content pillars — "${topPillar.name}" is your strongest. To build authority:\n\n1. **Create deep content** in your core expertise areas\n2. **Share proof** of your results and outcomes\n3. **Engage** with other voices in your space\n4. **Teach** what you know through frameworks and tutorials`;
      insights.push(`Your "${topPillar.name}" pillar has the highest authority potential. Focus here first.`);
      recommendations.push({ title: `Create authority content for ${topPillar.name}`, type: 'content', priority: 'high', action: 'generate_post', params: { topic: topPillar.name, contentType: 'thought_leadership', sourceType: 'strategy' } });
    } else {
      content = "Building authority starts with defining your expertise areas. Let's set up your content pillars first — they'll form the foundation of your authority-building strategy.";
      recommendations.push({ title: 'Define Content Pillars', type: 'strategy', priority: 'high', action: 'generate_pillars', params: {} });
    }

    if (strategy?.authorityRoadmap) {
      insights.push(`Your authority roadmap targets ${strategy.authorityRoadmap.targetLevel || 'intermediate'} within ${strategy.authorityRoadmap.timeline || '90 days'}.`);
    }

    return { content, recommendations, actions: [], insights };
  }

  private async handleBrandGrowth(input: AgentInput): Promise<AgentResponse> {
    return {
      content: "Let me analyze your brand growth opportunities.\n\nTo grow your personal brand, focus on:\n1. **Consistent content** — post 3-5 times per week\n2. **Strategic networking** — engage with target audience\n3. **Value-first approach** — teach, don't sell\n4. **Community building** — create discussion, not monologues\n\nI can help you create a brand growth plan based on your current position.",
      recommendations: [
        { title: 'Analyze Brand Growth Opportunities', type: 'brand', priority: 'medium', action: 'view_analytics', params: {} },
        { title: 'Review Content Strategy', type: 'strategy', priority: 'medium', action: 'switch_context', params: { context: 'content' } },
      ],
      actions: [], insights: [],
    };
  }
}

export const brandAgent = new BrandAgent();
