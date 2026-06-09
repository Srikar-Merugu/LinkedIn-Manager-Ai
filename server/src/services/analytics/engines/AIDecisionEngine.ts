import mongoose from 'mongoose';
import pino from 'pino';
import { StrategyRecommendation } from '../../../models/analytics/StrategyRecommendation';
import { OptimizationHistory, OptimizationType } from '../../../models/analytics/OptimizationHistory';

const logger = pino();

export interface DecisionInput {
  userId: string;
  context: {
    strategy?: any;
    forecast?: any;
    recommendations?: any[];
    pillarPerformances?: any[];
    failures?: any[];
    opportunities?: any;
  };
  scope: 'calendar' | 'strategy' | 'content_mix' | 'publishing_schedule' | 'pillar_priorities';
  autoApplyThreshold: number;
}

export interface Decision {
  made: boolean;
  type: OptimizationType;
  changes: Array<{
    field: string;
    from: any;
    to: any;
    rationale: string;
    confidence: number;
  }>;
  explanation: string;
  requiresApproval: boolean;
}

export class AIDecisionEngine {
  async decide(input: DecisionInput): Promise<Decision> {
    logger.info({ userId: input.userId, scope: input.scope }, 'Making AI decision');

    switch (input.scope) {
      case 'content_mix':
        return this.decideContentMix(input);
      case 'publishing_schedule':
        return this.decidePublishingSchedule(input);
      case 'pillar_priorities':
        return this.decidePillarPriorities(input);
      case 'strategy':
        return this.decideStrategyUpdate(input);
      case 'calendar':
        return this.decideCalendarUpdate(input);
      default:
        return { made: false, type: 'content_strategy', changes: [], explanation: 'No decision scope matched', requiresApproval: false };
    }
  }

  async applyDecision(userId: string, decision: Decision): Promise<any> {
    if (!decision.made) return { applied: false, reason: 'No decision made' };

    const history = await OptimizationHistory.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: decision.type,
      source: 'ai_decision',
      status: decision.requiresApproval ? 'proposed' : 'applied',
      title: `AI Decision: ${decision.type.replace(/_/g, ' ')}`,
      description: decision.explanation,
      changes: decision.changes.map(c => ({
        field: c.field,
        from: c.from,
        to: c.to,
        rationale: c.rationale,
      })),
      trigger: { event: 'ai_decision_engine', reason: decision.explanation, metrics: [] },
      expectedImpact: decision.explanation,
      appliedAt: new Date(),
      metadata: { duration: 0, confidence: 60, abTested: false },
    });

    return { applied: true, historyId: history._id, requiresApproval: decision.requiresApproval };
  }

  private decideContentMix(input: DecisionInput): Decision {
    const { context } = input;
    const recommendations = context.recommendations?.filter(r => r.category === 'content_mix') || [];

    if (recommendations.length === 0) {
      return { made: false, type: 'content_mix', changes: [], explanation: 'No content mix changes needed', requiresApproval: false };
    }

    const changes = recommendations.map(r => ({
      field: r.title || 'content_mix',
      from: 'current_distribution',
      to: r.suggestedAction?.params?.change || 'adjust',
      rationale: r.description || r.reasoning,
      confidence: r.impact?.confidence || 50,
    }));

    const avgConfidence = changes.reduce((s, c) => s + c.confidence, 0) / changes.length;

    return {
      made: true,
      type: 'content_mix',
      changes,
      explanation: `${changes.length} content mix adjustments recommended`,
      requiresApproval: avgConfidence < input.autoApplyThreshold,
    };
  }

  private decidePublishingSchedule(input: DecisionInput): Decision {
    const changes: Decision['changes'] = [];
    const context = input.context;

    if (context.strategy?.changes) {
      const publishingChanges = context.strategy.changes.filter((c: any) => c.category === 'publishing');
      for (const pc of publishingChanges) {
        changes.push({
          field: 'publishing_schedule',
          from: pc.currentState,
          to: pc.recommendedState,
          rationale: pc.rationale,
          confidence: pc.confidence || 60,
        });
      }
    }

    if (changes.length === 0) {
      return { made: false, type: 'publishing_schedule', changes: [], explanation: 'Publishing schedule is optimal', requiresApproval: false };
    }

    return {
      made: true,
      type: 'publishing_schedule',
      changes,
      explanation: `Adjust publishing schedule: ${changes.map(c => c.rationale).join('; ')}`,
      requiresApproval: changes.some(c => c.confidence < input.autoApplyThreshold),
    };
  }

  private decidePillarPriorities(input: DecisionInput): Decision {
    const context = input.context;
    const changes: Decision['changes'] = [];

    if (context.pillarPerformances) {
      for (const pillar of context.pillarPerformances) {
        if (pillar.recommendation?.action === 'increase') {
          changes.push({
            field: `pillar_${pillar.pillar}`,
            from: 'current_priority',
            to: 'high_priority',
            rationale: `${pillar.pillar} scores ${pillar.score}/100 - recommended to increase`,
            confidence: 65,
          });
        }
      }
    }

    if (changes.length === 0) {
      return { made: false, type: 'pillar_priority' as OptimizationType, changes: [], explanation: 'Pillar priorities are well-balanced', requiresApproval: true };
    }

    return {
      made: true,
      type: 'pillar_priority' as OptimizationType,
      changes,
      explanation: `Adjust priorities for ${changes.length} pillars`,
      requiresApproval: true,
    };
  }

  private decideStrategyUpdate(input: DecisionInput): Decision {
    const context = input.context;
    const changes: Decision['changes'] = [];

    if (context.failures && context.failures.length > 3) {
      changes.push({
        field: 'content_strategy',
        from: 'current_approach',
        to: 'revised_approach',
        rationale: `${context.failures.length} underperforming posts indicate strategy gaps`,
        confidence: 70,
      });
    }

    if (context.forecast?.risks) {
      for (const risk of context.forecast.risks) {
        if (risk.probability > 60 && risk.impact > 70) {
          changes.push({
            field: 'risk_mitigation',
            from: 'unaddressed',
            to: `mitigate_${risk.risk.substring(0, 30)}`,
            rationale: risk.mitigation,
            confidence: 55,
          });
        }
      }
    }

    if (changes.length === 0) {
      return { made: false, type: 'content_strategy', changes: [], explanation: 'Strategy is performing well', requiresApproval: false };
    }

    return {
      made: true,
      type: 'content_strategy',
      changes,
      explanation: `Strategy update recommended based on ${changes.length} signals`,
      requiresApproval: true,
    };
  }

  private decideCalendarUpdate(input: DecisionInput): Decision {
    return { made: false, type: 'content_strategy', changes: [], explanation: 'Calendar updates handled by Content Ops', requiresApproval: false };
  }
}

export const aiDecisionEngine = new AIDecisionEngine();
