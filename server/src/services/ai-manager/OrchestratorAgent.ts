import mongoose from 'mongoose';
import pino from 'pino';
import { ConversationHistory } from '../../models/ai-manager/ConversationHistory';
import { ChatSession } from '../../models/ai-manager/ChatSession';
import { AIRecommendation } from '../../models/ai-manager/AIRecommendation';
import { contentAgent } from './agents/ContentAgent';
import { brandAgent } from './agents/BrandAgent';
import { careerAgent } from './agents/CareerAgent';
import { analyticsAgent } from './agents/AnalyticsAgent';
import { publishingAgent } from './agents/PublishingAgent';
import { opportunityAgent } from './agents/OpportunityAgent';
import { contextEngine, UserContext } from './ContextEngine';
import { memoryEngine } from './MemoryEngine';
import { actionEngine } from './ActionEngine';

const logger = pino();

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  userId: string;
  sessionId?: string;
  message: string;
}

interface ChatResponse {
  sessionId: string;
  response: string;
  recommendations: any[];
  actions: any[];
  insights: string[];
  contextSwitch?: string;
  suggestedQuestions?: string[];
}

const AGENTS = [contentAgent, brandAgent, careerAgent, analyticsAgent, publishingAgent, opportunityAgent];

const GREETING_RESPONSES = [
  "Hi! I'm your Personal Brand Copilot. I can help you with content strategy, brand positioning, career growth, and more. What would you like to explore?",
  "Welcome back! Your content strategy is ready and I've been monitoring your opportunities. How can I help you today?",
  "Ready to build your personal brand? I have insights from your profile, content strategy, and recent activity. What's on your mind?",
];

const FALLBACK_RESPONSES = [
  "I understand you're asking about something specific. To give you the best advice, could you tell me more about what you'd like to focus on? I can help with:\n\n• Content strategy and ideas\n• Brand positioning and authority\n• Career growth and opportunities\n• Performance analytics\n• Publishing and scheduling",
  "Great question! I'd love to help, but I want to make sure I give you the right guidance. Here's what I can assist with:\n\n**Content**: What to post, content ideas, strategy\n**Brand**: Positioning, authority, profile optimization\n**Career**: Goals, skills, networking, opportunities\n**Analytics**: Performance, engagement, what works\n**Publishing**: Schedule, queue, workflow",
  "I'm here to be your personal brand strategist. To help you best, could you clarify what you're looking for? Some areas I can help with:\n\n• Generate post ideas\n• Review your strategy\n• Find opportunities\n• Analyze performance\n• Plan your content calendar",
];

export class OrchestratorAgent {
  async processChat(request: ChatRequest): Promise<ChatResponse> {
    logger.info({ userId: request.userId, messageLength: request.message.length }, 'Processing chat message');

    const uid = new mongoose.Types.ObjectId(request.userId);

    // Get or create session
    let session: any;
    if (request.sessionId) {
      session = await ChatSession.findById(request.sessionId);
    }
    if (!session) {
      session = await ChatSession.create({
        userId: uid,
        title: this.generateSessionTitle(request.message),
        status: 'active',
        context: 'general',
        messageCount: 0,
        lastMessageAt: new Date(),
      });
    }

    // Load context
    const context = await contextEngine.load(request.userId);

    // Get recent history
    const recentHistory = await memoryEngine.getRecentHistory(session._id.toString(), 10);

    // Detect greeting
    const isGreeting = this.isGreeting(request.message);
    if (isGreeting) {
      const response = GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];

      await this.saveMessage(session._id, uid, 'user', request.message);
      await this.saveMessage(session._id, uid, 'assistant', response, 'text', { intent: 'greeting' });

      await ChatSession.findByIdAndUpdate(session._id, {
        $inc: { messageCount: 1 },
        lastMessageAt: new Date(),
      });

      return {
        sessionId: session._id.toString(),
        response,
        recommendations: [],
        actions: [],
        insights: [],
        suggestedQuestions: this.getSuggestedQuestions('general'),
      };
    }

    // Try each agent
    let agentResponse: any = null;
    let usedAgent = 'general';

    for (const agent of AGENTS) {
      try {
        const result = await agent.process({
          message: request.message,
          userId: request.userId,
          context,
          history: recentHistory,
          preferences: {},
        });
        if (result) {
          agentResponse = result;
          usedAgent = agent.constructor.name.replace('Agent', '').toLowerCase();
          break;
        }
      } catch (error: any) {
        logger.error({ agent: agent.constructor.name, error: error.message }, 'Agent error');
      }
    }

    // Fallback if no agent matched
    if (!agentResponse) {
      const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
      const fallbackResponse = `${fallback}\n\nOr feel free to ask me anything about your personal brand!`;

      await this.saveMessage(session._id, uid, 'user', request.message);
      await this.saveMessage(session._id, uid, 'assistant', fallbackResponse, 'text', { intent: 'fallback' });

      await ChatSession.findByIdAndUpdate(session._id, {
        $inc: { messageCount: 1 },
        lastMessageAt: new Date(),
        context: 'general',
      });

      return {
        sessionId: session._id.toString(),
        response: fallbackResponse,
        recommendations: [],
        actions: [],
        insights: [],
        suggestedQuestions: this.getSuggestedQuestions('general'),
      };
    }

    // Save action proposals
    const proposedActions: any[] = [];
    if (agentResponse.actions?.length > 0) {
      for (const action of agentResponse.actions) {
        const proposed = await actionEngine.propose({
          userId: request.userId,
          sessionId: session._id.toString(),
          type: action.type || 'generate_post',
          title: action.title,
          description: action.title,
          reasoning: agentResponse.content?.substring(0, 200) || 'Recommended by AI agent',
          params: action.params || {},
          requiresApproval: true,
        });
        proposedActions.push(proposed);
      }
    }

    // Save recommendations
    if (agentResponse.recommendations?.length > 0) {
      for (const rec of agentResponse.recommendations) {
        await AIRecommendation.create({
          userId: uid,
          sessionId: session._id,
          category: rec.type || 'content',
          title: rec.title,
          description: rec.title,
          reasoning: agentResponse.content?.substring(0, 200) || '',
          priority: rec.priority || 'medium',
          status: 'active',
          suggestedAction: rec.action ? { type: rec.action, label: rec.title, params: rec.params } : undefined,
          sourceData: {
            trigger: request.message.substring(0, 100),
            dataPoints: [],
            confidence: 0.7,
          },
        });
      }
    }

    // Save to memory
    await memoryEngine.trackMessage(request.userId, session._id.toString(), 'user', request.message, usedAgent);

    // Save conversation
    await this.saveMessage(session._id, uid, 'user', request.message);
    await this.saveMessage(session._id, uid, 'assistant', agentResponse.content, 'text', { intent: usedAgent, agentUsed: usedAgent });

    // Update session
    await ChatSession.findByIdAndUpdate(session._id, {
      $inc: { messageCount: 1 },
      lastMessageAt: new Date(),
      context: agentResponse.contextSwitch || usedAgent,
      $push: { 'metadata.intentHistory': { $each: [usedAgent], $slice: -20 } },
    });

    return {
      sessionId: session._id.toString(),
      response: agentResponse.content,
      recommendations: agentResponse.recommendations || [],
      actions: proposedActions,
      insights: agentResponse.insights || [],
      contextSwitch: agentResponse.contextSwitch,
      suggestedQuestions: this.getSuggestedQuestions(usedAgent),
    };
  }

  async getProactiveRecommendations(userId: string): Promise<any[]> {
    const context = await contextEngine.load(userId);
    const recommendations: any[] = [];
    const uid = new mongoose.Types.ObjectId(userId);

    if (!context.contentStrategy) {
      recommendations.push({
        title: 'Generate Your Content Strategy',
        description: 'You haven\'t created a content strategy yet. This is the foundation for everything.',
        priority: 'critical',
        category: 'strategy',
        action: 'regenerate_strategy',
      });
    }

    if (context.opportunities.length > 0) {
      const pending = context.opportunities.filter(o => o.status !== 'processed');
      if (pending.length > 0) {
        recommendations.push({
          title: `${pending.length} Opportunities Ready`,
          description: `You have ${pending.length} unprocessed opportunities that can become great content.`,
          priority: 'high',
          category: 'opportunity',
          action: 'mine_opportunities',
        });
      }
    }

    const draftCount = context.calendar.filter(c => c.status === 'draft').length;
    if (draftCount > 0) {
      recommendations.push({
        title: `${draftCount} Drafts Ready to Develop`,
        description: 'You have drafts waiting to be turned into published posts.',
        priority: 'medium',
        category: 'content',
        action: 'view_calendar',
      });
    }

    return recommendations;
  }

  async generateSuggestedTasks(userId: string): Promise<any[]> {
    const context = await contextEngine.load(userId);
    const tasks: any[] = [];

    if (!context.contentStrategy) {
      tasks.push({ title: 'Generate Content Strategy', description: 'Create your 90-day content plan', priority: 'critical', category: 'strategy', action: 'regenerate_strategy' });
    }
    if (context.opportunities.length > 0) {
      tasks.push({ title: 'Create Content from Opportunities', description: 'Turn opportunities into posts', priority: 'high', category: 'content', action: 'generate_post' });
    }
    if (context.calendar.filter(c => c.status === 'draft').length > 0) {
      tasks.push({ title: 'Develop Drafts', description: 'Review and publish pending drafts', priority: 'medium', category: 'content', action: 'update_calendar' });
    }
    if (context.analytics === null && context.recentPosts.length > 0) {
      tasks.push({ title: 'Analyze Performance', description: 'Get insights on your content performance', priority: 'low', category: 'analytics', action: 'review_analytics' });
    }

    tasks.push({ title: 'Generate a New Post', description: 'Create LinkedIn content', priority: 'medium', category: 'content', action: 'generate_post' });
    tasks.push({ title: 'Review Your Brand Identity', description: 'Optimize your personal brand', priority: 'low', category: 'brand', action: 'view_brand' });

    return tasks;
  }

  private async saveMessage(sessionId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId, role: string, content: string, type: string = 'text', metadata: any = {}): Promise<void> {
    await ConversationHistory.create({
      sessionId, userId, role, type, content,
      metadata,
      tokenCount: content.split(/\s+/).filter(Boolean).length,
    });
  }

  private isGreeting(message: string): boolean {
    const m = message.toLowerCase().trim();
    const greetings = ['hi', 'hello', 'hey', 'sup', 'yo', 'good morning', 'good afternoon', 'good evening', 'what\'s up', 'howdy', 'start', 'begin'];
    return greetings.some(g => m === g || m.startsWith(g + ' ') || m.startsWith(g + ',') || m.startsWith(g + '!'));
  }

  private generateSessionTitle(message: string): string {
    const words = message.split(' ').slice(0, 6);
    return words.join(' ').substring(0, 60) + (words.length > 6 ? '...' : '');
  }

  private getSuggestedQuestions(context: string): string[] {
    const questions: Record<string, string[]> = {
      general: [
        'What should I post today?',
        'Review my LinkedIn profile',
        'Find new opportunities',
        'Analyze my content strategy',
        'How can I build authority?',
      ],
      content: [
        'What content type works best?',
        'Generate a post about my project',
        'Review my content calendar',
        'Plan my next month of content',
      ],
      brand: [
        'How should I position myself?',
        'How do I attract recruiters?',
        'How can I grow my brand?',
        'Review my brand identity',
      ],
      career: [
        'What skills should I develop?',
        'How do I network effectively?',
        'Find career opportunities',
        'How do I get freelance clients?',
      ],
      analytics: [
        'Why is my engagement dropping?',
        'What content performs best?',
        'How can I improve my reach?',
        'What should I focus on next?',
      ],
      publishing: [
        'What\'s in my publishing queue?',
        'Schedule my next post',
        'Review my workflow',
        'Change automation mode',
      ],
      opportunity: [
        'What opportunities did you find?',
        'Which opportunity is best?',
        'Create content from an opportunity',
        'Scan for new opportunities',
      ],
    };

    return questions[context] || questions.general;
  }
}

export const orchestratorAgent = new OrchestratorAgent();
