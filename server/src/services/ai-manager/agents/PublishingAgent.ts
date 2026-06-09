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

export class PublishingAgent {
  async process(input: AgentInput): Promise<AgentResponse | null> {
    const intent = this.detectIntent(input.message);
    if (!intent) return null;

    logger.info({ intent }, 'PublishingAgent processing');

    switch (intent) {
      case 'schedule':
        return this.handleSchedule(input);
      case 'queue':
        return this.handleQueue(input);
      case 'workflow':
        return this.handleWorkflow(input);
      case 'publishing':
        return this.handlePublishing(input);
      default:
        return null;
    }
  }

  detectIntent(message: string): string | null {
    const m = message.toLowerCase();
    if (m.includes('schedule') || m.includes('when to post') || m.includes('posting schedule')) return 'schedule';
    if (m.includes('queue') || m.includes('pending') || m.includes('waiting to')) return 'queue';
    if (m.includes('workflow') || m.includes('process') || m.includes('automation')) return 'workflow';
    if (m.includes('publish') || m.includes('post now') || m.includes('go live')) return 'publishing';
    return null;
  }

  private async handleSchedule(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const calendar = context.calendar || [];
    const analytics = context.analytics;

    const recommendations: any[] = [];
    const insights: any[] = [];

    const scheduled = calendar.filter((c: any) => c.status === 'scheduled');
    const drafts = calendar.filter((c: any) => c.status === 'draft' || c.status === 'planned');

    let content = '';
    if (scheduled.length > 0) {
      content = `You have ${scheduled.length} posts scheduled. Your next scheduled post is "${scheduled[0].topic || scheduled[0].title}" on ${new Date(scheduled[0].date || scheduled[0].scheduledDate).toLocaleDateString()}.`;
    } else {
      content = `You have ${drafts.length} drafts ready to schedule. Would you like me to help you plan the optimal posting schedule for the coming week?`;
      if (drafts.length > 0) {
        recommendations.push({ title: 'Schedule Drafts for This Week', type: 'publishing', priority: 'medium', action: 'update_calendar', params: { entries: drafts.slice(0, 3).map((d: any) => d._id) } });
      }
    }

    if (analytics?.bestDayToPost) {
      insights.push(`Your best posting day is ${analytics.bestDayToPost}.`);
    }
    if (analytics?.bestTimeToPost) {
      insights.push(`Optimal posting time: ${analytics.bestTimeToPost}.`);
    }

    if (!content) {
      content = "Let me check your publishing schedule. I can help you plan the optimal posting cadence based on your content strategy and audience behavior.";
    }

    return { content, recommendations, actions: [], insights };
  }

  private async handleQueue(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const queue = context.publishingQueue || [];

    if (queue.length === 0) {
      return {
        content: "Your publishing queue is empty. Generate some content first, and I'll help you manage the queue from ideation to publication.",
        recommendations: [{ title: 'Generate New Content', type: 'content', priority: 'medium', action: 'generate_post', params: { sourceType: 'manual' } }],
        actions: [], insights: [],
      };
    }

    const byStage: Record<string, number> = {};
    queue.forEach((q: any) => { byStage[q.stage] = (byStage[q.stage] || 0) + 1; });

    const stageSummary = Object.entries(byStage).map(([stage, count]) => `• ${stage.replace(/_/g, ' ')}: ${count}`).join('\n');

    const content = `Your publishing queue has ${queue.length} items:\n\n${stageSummary}\n\nYour automation mode: **${context.automationMode || 'manual'}**\n\nI can help you advance items through the workflow or adjust your automation settings.`;

    const ready = queue.filter((q: any) => q.stage === 'ready' || q.stage === 'approved');
    const recommendations: any[] = [];
    if (ready.length > 0) {
      recommendations.push({ title: `Schedule ${ready.length} Ready Posts`, type: 'publishing', priority: 'high', action: 'update_queue', params: { entryIds: ready.map((q: any) => q._id), action: 'schedule' } });
    }

    return { content, recommendations, actions: [], insights: [] };
  }

  private async handleWorkflow(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const mode = context.automationMode || 'manual';

    const modeDescriptions: Record<string, string> = {
      manual: '**Manual Mode**: You review and publish each post manually. Full control.',
      approval: '**Approval Mode**: Content generates automatically, you review before publishing.',
      autonomous: '**Autonomous Mode**: Full automation — content generates, schedules, and publishes automatically.',
    };

    return {
      content: `Your current automation mode: ${modeDescriptions[mode] || modeDescriptions.manual}\n\nYour content workflow:\nIdea → Planned → Draft Generated → Ready → Approved → Scheduled → Published → Analyzed\n\nYou currently have ${(context.publishingQueue || []).length} items in your workflow.\n\nWould you like to adjust your automation mode or review items in your workflow?`,
      recommendations: [
        { title: 'Review Workflow Queue', type: 'publishing', priority: 'medium', action: 'view_queue', params: {} },
        { title: context.automationMode === 'manual' ? 'Try Approval Mode' : 'Adjust Automation Settings', type: 'publishing', priority: 'low', action: 'update_mode', params: { mode: context.automationMode === 'manual' ? 'approval' : 'manual' } },
      ],
      actions: [], insights: [],
    };
  }

  private async handlePublishing(input: AgentInput): Promise<AgentResponse> {
    const { context } = input;
    const queue = context.publishingQueue || [];
    const ready = queue.filter((q: any) => q.stage === 'ready' || q.stage === 'approved');

    if (ready.length === 0) {
      return {
        content: "There are no posts ready to publish. To publish something, first generate a post, review it, and approve it through the workflow.",
        recommendations: [{ title: 'Generate Post to Publish', type: 'content', priority: 'high', action: 'generate_post', params: { sourceType: 'manual' } }],
        actions: [], insights: [],
      };
    }

    return {
      content: `You have ${ready.length} posts ready to publish:\n\n${ready.slice(0, 3).map((r: any, i: number) => `${i + 1}. "${r.topic || r.title}"`).join('\n')}\n\nWould you like me to publish these now or schedule them for optimal times?`,
      recommendations: [
        { title: 'Publish Now', type: 'publishing', priority: 'high', action: 'schedule_post', params: { entryId: ready[0]._id, immediate: true } },
        { title: 'Schedule for Best Time', type: 'publishing', priority: 'medium', action: 'update_queue', params: { entryIds: ready.map((r: any) => r._id), action: 'schedule' } },
      ],
      actions: [], insights: [],
    };
  }
}

export const publishingAgent = new PublishingAgent();
