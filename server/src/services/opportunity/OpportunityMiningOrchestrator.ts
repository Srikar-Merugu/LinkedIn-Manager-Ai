import mongoose from 'mongoose';
import pino from 'pino';
import { OpportunitySignal } from '../../models/opportunity/OpportunitySignal';
import { ContentOpportunity } from '../../models/opportunity/ContentOpportunity';
import { OpportunityRecommendation } from '../../models/opportunity/OpportunityRecommendation';

import { signalDetectionEngine } from './engines/SignalDetectionEngine';
import { signalClassificationEngine } from './engines/SignalClassificationEngine';
import { opportunityExtractionEngine } from './engines/OpportunityExtractionEngine';
import { projectOpportunityEngine } from './engines/ProjectOpportunityEngine';
import { gitHubIntelligenceEngine } from './engines/GitHubIntelligenceEngine';
import { linkedInChangeDetectionEngine } from './engines/LinkedInChangeDetectionEngine';
import { portfolioIntelligenceEngine } from './engines/PortfolioIntelligenceEngine';
import { resumeChangeDetectionEngine } from './engines/ResumeChangeDetectionEngine';
import { opportunityScoringEngine } from './engines/OpportunityScoringEngine';
import { opportunityPrioritizationEngine, PrioritizationResult } from './engines/OpportunityPrioritizationEngine';
import { contentAngleEngine } from './engines/ContentAngleEngine';
import { opportunityRecommendationEngine } from './engines/OpportunityRecommendationEngine';
import { calendarIntegrationEngine } from './engines/CalendarIntegrationEngine';

const logger = pino();

export interface MiningReport {
  signalsDetected: number;
  opportunitiesCreated: number;
  recommendationsGenerated: number;
  calendarEntriesCreated: number;
  summary: string;
}

export class OpportunityMiningOrchestrator {

  async mine(userId: string, sourceData: any): Promise<MiningReport> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    logger.info({ userId }, 'Running full opportunity mining pipeline');

    const signals = await signalDetectionEngine.detectFromAll(userObjectId, sourceData);
    const classifiedSignals = signals.map(s => ({
      ...s,
      classification: signalClassificationEngine.classify({
        source: s.source, type: s.type, title: s.title,
        description: s.description, metadata: s.metadata || {},
      }),
    }));

    for (const sig of classifiedSignals) {
      const cat = sig.classification?.category;
      if (cat) {
        await OpportunitySignal.findByIdAndUpdate(sig._id, { $set: { category: cat, status: 'classified' as const } });
      }
    }

    const allOpportunities: any[] = [];
    for (const signal of classifiedSignals) {
      const extracted = opportunityExtractionEngine.extract({
        source: signal.source, type: signal.type, title: signal.title,
        description: signal.description, metadata: signal.metadata || {},
        category: signal.classification?.category,
      });

      for (const opp of extracted) {
        const scored = opportunityScoringEngine.score({
          title: opp.title, description: opp.description, signalType: opp.signalType,
          source: signal.source, angles: opp.angles, relevantPillars: opp.relevantPillars,
        });

        const saved = await ContentOpportunity.create({
          userId: userObjectId,
          signalId: signal._id,
          source: signal.source,
          type: opp.signalType,
          title: opp.title,
          description: opp.description,
          keyInsight: opp.keyInsight,
          status: 'scored',
          scores: scored.dimensions,
          angles: opp.angles,
          reasoning: scored.reasoning,
          relevantPillars: opp.relevantPillars,
          tags: opp.tags,
          isProcessed: false,
        });

        allOpportunities.push(saved);
      }
    }

    const prioritized = opportunityPrioritizationEngine.prioritize(
      allOpportunities.map(o => ({
        title: o.title, overallScore: o.scores.overall || 50, signalType: o.type,
        source: o.source, dimensions: o.scores, reasoning: o.reasoning,
      }))
    );

    for (const pr of prioritized) {
      const update: any = { priority: pr.priority, priorityRank: pr.rank, status: 'prioritized' as const };
      if (pr.priority === 'immediate' || pr.priority === 'this_week') {
        update.isProcessed = true;
      }
      await ContentOpportunity.findOneAndUpdate(
        { userId: userObjectId, title: pr.opportunity.title },
        { $set: update }
      );
    }

    const immediate = prioritized.filter(p => p.priority === 'immediate' || p.priority === 'this_week') as PrioritizationResult[];
    const calendarResults: any[] = [];
    for (const pr of immediate.slice(0, 5)) {
      const result = await calendarIntegrationEngine.insert(userObjectId, {
        userId: userObjectId,
        title: pr.opportunity.title,
        hook: pr.opportunity.title,
        pillarName: 'Opportunity',
        pillarTopic: pr.opportunity.signalType,
        contentType: 'educational',
        priority: pr.priority as 'immediate' | 'this_week' | 'this_month',
      });
      calendarResults.push(result);
    }

    const recommendations = [];
    for (const opp of allOpportunities.slice(0, 10)) {
      const rec = await opportunityRecommendationEngine.generate({
        userId: userObjectId,
        opportunityId: opp._id,
        signalId: opp.signalId,
        signalType: opp.type,
        title: opp.title,
        description: opp.description,
        overallScore: opp.scores.overall || 50,
        anglesCount: opp.angles?.length || 0,
        relevantPillars: opp.relevantPillars,
      });
      recommendations.push(rec);
    }

    logger.info({
      signals: signals.length, opportunities: allOpportunities.length,
      recommendations: recommendations.length, calendarEntries: calendarResults.length,
    }, 'Mining pipeline complete');

    return {
      signalsDetected: signals.length,
      opportunitiesCreated: allOpportunities.length,
      recommendationsGenerated: recommendations.length,
      calendarEntriesCreated: calendarResults.length,
      summary: `Detected ${signals.length} signals, extracted ${allOpportunities.length} opportunities, generated ${recommendations.length} recommendations, and added ${calendarResults.length} entries to calendar.`,
    };
  }
}

export const opportunityMiningOrchestrator = new OpportunityMiningOrchestrator();
