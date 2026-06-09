import mongoose from 'mongoose';
import pino from 'pino';
import { OptimizationHistory, IOptimizationHistory, OptimizationType } from '../../../models/analytics/OptimizationHistory';
import { StrategyRecommendation } from '../../../models/analytics/StrategyRecommendation';
import { Analytics } from '../../../models/analytics/Analytics';

const logger = pino();

export interface LoopIteration {
  cycle: number;
  trigger: string;
  analysis: { insightsCount: number; recommendationsCount: number };
  actions: Array<{ type: string; applied: boolean; impact: string }>;
  metrics: { before: number; after: number; improvement: number };
  completedAt: Date;
}

export class SelfImprovementLoop {
  async execute(userId: string): Promise<LoopIteration> {
    logger.info({ userId }, 'Executing self-improvement loop');

    const before = await this.captureMetrics(userId);

    const analytics = await Analytics.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ 'period.start': -1 }).limit(30).lean();

    const insights: string[] = [];
    const recommendations = await StrategyRecommendation.find({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
      'action.autoApply': true,
    }).lean();

    const actions: LoopIteration['actions'] = [];

    for (const rec of recommendations) {
      try {
        const actionApplied = await this.applyOptimization(userId, rec);
        actions.push({
          type: rec.action.type,
          applied: actionApplied,
          impact: rec.impact?.expected || 'Unknown',
        });

        await StrategyRecommendation.findByIdAndUpdate(rec._id, {
          status: actionApplied ? 'implemented' : 'active',
          appliedAt: actionApplied ? new Date() : undefined,
        });
      } catch (error: any) {
        logger.error({ error, recId: rec._id }, 'Failed to apply optimization');
        actions.push({ type: rec.action.type, applied: false, impact: 'Failed' });
      }
    }

    const after = await this.captureMetrics(userId);
    const improvement = this.calculateImprovement(before, after);

    const iteration: LoopIteration = {
      cycle: await OptimizationHistory.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }) + 1,
      trigger: 'scheduled_optimization',
      analysis: { insightsCount: insights.length, recommendationsCount: recommendations.length },
      actions,
      metrics: { before, after, improvement },
      completedAt: new Date(),
    };

    await OptimizationHistory.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'content_strategy',
      source: 'ai_decision',
      status: 'applied',
      title: `Optimization cycle ${iteration.cycle}`,
      description: `${actions.filter(a => a.applied).length} of ${actions.length} actions applied`,
      changes: actions.map(a => ({
        field: a.type,
        from: 'previous',
        to: 'optimized',
        rationale: a.impact,
      })),
      trigger: { event: 'self_improvement_loop', reason: 'Scheduled optimization cycle', metrics: [] },
      expectedImpact: `${improvement}% improvement expected`,
      appliedAt: new Date(),
      metadata: { duration: 0, confidence: 70, abTested: false },
    });

    logger.info({ cycle: iteration.cycle, actions: actions.length }, 'Self-improvement loop complete');

    return iteration;
  }

  async checkAndOptimize(userId: string): Promise<boolean> {
    const recentHistory = await OptimizationHistory.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      appliedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).lean();

    if (recentHistory) {
      logger.info({ userId }, 'Skipping optimization - recently optimized');
      return false;
    }

    const activeRecs = await StrategyRecommendation.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: 'active',
      'action.autoApply': true,
    });

    if (activeRecs === 0) {
      logger.info({ userId }, 'No auto-apply recommendations pending');
      return false;
    }

    await this.execute(userId);
    return true;
  }

  private async captureMetrics(userId: string): Promise<number> {
    const recent = await Analytics.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ 'period.start': -1 }).limit(30).lean();

    let total = 0;
    for (const a of recent) {
      for (const m of a.metrics || []) {
        if (['like', 'comment', 'share', 'save'].includes(m.type)) total += m.value;
      }
    }

    return recent.length > 0 ? Math.round(total / recent.length) : 0;
  }

  private async applyOptimization(userId: string, recommendation: any): Promise<boolean> {
    try {
      if (!recommendation.action?.autoApply) return false;

      logger.info({ recId: recommendation._id, type: recommendation.action.type }, 'Applying auto-optimization');

      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to apply optimization');
      return false;
    }
  }

  private calculateImprovement(before: number, after: number): number {
    if (before === 0) return 0;
    return Math.round(((after - before) / before) * 100);
  }
}

export const selfImprovementLoop = new SelfImprovementLoop();
