import mongoose from 'mongoose';
import pino from 'pino';
import { ContentPillar } from '../../models/strategy/ContentPillar';
import { PillarScore } from '../../models/content-pillars/PillarScore';
import { TopicCluster } from '../../models/content-pillars/TopicCluster';
import { AuthorityMap } from '../../models/content-pillars/AuthorityMap';
import { ContentDistribution } from '../../models/content-pillars/ContentDistribution';
import { PillarSnapshot } from '../../models/content-pillars/PillarSnapshot';

import { contentDiscoveryEngine } from './engines/ContentDiscoveryEngine';
import { pillarGenerationEngine } from './engines/PillarGenerationEngine';
import { authorityScoringEngine } from './engines/AuthorityScoringEngine';
import { engagementPotentialEngine } from './engines/EngagementPotentialEngine';
import { careerAlignmentEngine } from './engines/CareerAlignmentEngine';
import { pillarPrioritizationEngine } from './engines/PillarPrioritizationEngine';
import { contentMixEngine } from './engines/ContentMixEngine';
import { topicClusterEngine } from './engines/TopicClusterEngine';
import { contentAuthorityMapEngine } from './engines/ContentAuthorityMapEngine';
import { opportunityEngine } from './engines/OpportunityEngine';
import { pillarEvolutionEngine } from './engines/PillarEvolutionEngine';

const logger = pino();

export interface ContentPillarReport {
  pillars: any[];
  pillarScores: any[];
  topicClusters: any[];
  authorityMap: any;
  contentDistribution: any;
  opportunityAnalysis: any;
  evolution: any;
  snapshot: any;
  generatedAt: string;
}

export class ContentPillarOrchestrator {

  async generateFullReport(userId: string, profileData: any): Promise<ContentPillarReport> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    logger.info({ userId }, 'Generating full content pillar intelligence report');

    const discovery = contentDiscoveryEngine.discover(profileData);

    const candidates = pillarGenerationEngine.generate(profileData);

    const previousSnapshots = await PillarSnapshot.find({ userId: userObjectId })
      .sort({ version: -1 })
      .limit(5)
      .lean();

    const existingPillarNames = previousSnapshots.flatMap(s => s.pillars.map(p => p.name));

    const scored = candidates.map(c => {
      const authority = authorityScoringEngine.score(c.name, c.sourceTopics, profileData, existingPillarNames);
      const engagement = engagementPotentialEngine.score(c.name, c.description, c.category);
      const careerAlignment = careerAlignmentEngine.score(c.name, c.description, c.category, profileData.careerBlueprint?.targetPosition);
      return { ...c, authority, engagement, careerAlignment };
    });

    const prioritized = pillarPrioritizationEngine.prioritize(
      scored.map(s => ({
        name: s.name,
        description: s.description,
        category: s.category,
        authorityScore: s.authority.overall,
        engagementScore: s.engagement.overall,
        careerAlignmentScore: s.careerAlignment.overall,
      }))
    );

    const enriched = scored.map(s => {
      const p = prioritized.find(pr => pr.name === s.name)!;
      return { ...s, rank: p.rank, reasoning: p.reasoning };
    });

    enriched.sort((a, b) => a.rank - b.rank);

    const savedPillarIds: Map<string, mongoose.Types.ObjectId> = new Map();
    const savedPillars: any[] = [];

    for (const pillar of enriched) {
      const existingPillar = await ContentPillar.findOne({
        userId: userObjectId,
        name: pillar.name,
        isActive: true,
      });

      let pillarDoc;
      if (existingPillar) {
        pillarDoc = existingPillar;
        pillarDoc.rank = pillar.rank;
        pillarDoc.rationale = pillar.reasoning;
        pillarDoc.confidence = pillar.confidence;
      } else {
        pillarDoc = new ContentPillar({
          userId: userObjectId,
          name: pillar.name,
          description: pillar.description,
          rationale: pillar.reasoning,
          rank: pillar.rank,
          status: 'active',
          confidence: pillar.confidence,
          version: 1,
        });
      }

      await pillarDoc.save();
      savedPillarIds.set(pillar.name, pillarDoc._id as mongoose.Types.ObjectId);
      savedPillars.push(pillarDoc);
    }

    const pillarScores: any[] = [];
    for (const pillar of enriched) {
      const pid = savedPillarIds.get(pillar.name);
      const scoreDoc = await PillarScore.create({
        userId: userObjectId,
        pillarId: pid,
        version: 1,
        authority: {
          overall: pillar.authority.overall,
          knowledgeDepth: pillar.authority.knowledgeDepth,
          experienceLevel: pillar.authority.experienceLevel,
          differentiation: pillar.authority.differentiation,
          audienceDemand: pillar.authority.audienceDemand,
          longTermSustainability: pillar.authority.longTermSustainability,
          careerAlignment: pillar.authority.careerAlignment,
          evidence: pillar.authority.evidence,
        },
        engagement: {
          overall: pillar.engagement.overall,
          commentPotential: pillar.engagement.commentPotential,
          savePotential: pillar.engagement.savePotential,
          sharePotential: pillar.engagement.sharePotential,
          discussionPotential: pillar.engagement.discussionPotential,
          evidence: pillar.engagement.evidence,
        },
        careerAlignment: {
          overall: pillar.careerAlignment.overall,
          internship: pillar.careerAlignment.internship,
          jobSearch: pillar.careerAlignment.jobSearch,
          freelancing: pillar.careerAlignment.freelancing,
          startup: pillar.careerAlignment.startup,
          thoughtLeadership: pillar.careerAlignment.thoughtLeadership,
          evidence: pillar.careerAlignment.evidence,
        },
        priority: pillar.rank,
        reasoning: pillar.reasoning,
      });
      pillarScores.push(scoreDoc);
    }

    const topicClusters: any[] = [];
    for (const pillar of enriched) {
      const pid = savedPillarIds.get(pillar.name)!;
      const tc = topicClusterEngine.generate(pillar.name, pillar.description, profileData);
      const clusterDoc = await TopicCluster.create({
        userId: userObjectId,
        pillarId: pid,
        pillarName: pillar.name,
        version: 1,
        nodes: tc.nodes,
        totalTopics: tc.totalTopics,
        summary: tc.summary,
      });
      topicClusters.push(clusterDoc);
    }

    const authorityMapInput = enriched.map(s => ({
      name: s.name,
      authorityScore: s.authority.overall,
      engagementScore: s.engagement.overall,
    }));
    const topicClusterInput = topicClusters.map(tc => ({
      pillarName: tc.pillarName,
      nodes: tc.nodes.map((n: any) => ({ name: n.name, relevanceScore: n.relevanceScore })),
    }));
    const authMap = contentAuthorityMapEngine.generate(authorityMapInput, topicClusterInput);
    const authMapDoc = await AuthorityMap.create({
      userId: userObjectId,
      version: 1,
      ...authMap,
    });

    const mixResult = contentMixEngine.distribute(
      enriched.map(s => ({
        name: s.name,
        rank: s.rank,
        authorityScore: s.authority.overall,
        engagementScore: s.engagement.overall,
        careerAlignmentScore: s.careerAlignment.overall,
      }))
    );
    const distDoc = await ContentDistribution.create({
      userId: userObjectId,
      version: 1,
      distributions: mixResult.distributions,
      summary: {
        totalPostsPerWeek: mixResult.totalPostsPerWeek,
        primaryPillar: enriched[0]?.name || '',
        primaryPercentage: mixResult.distributions[0]?.percentage || 0,
        varietyScore: Math.round((enriched.length / 7) * 100),
      },
      recommendations: [
        `Focus ${mixResult.distributions[0]?.percentage}% of content on ${enriched[0]?.name || 'primary pillar'}`,
        'Maintain consistency with at least 3 posts per week across pillars',
      ],
    });

    const oppAnalysis = opportunityEngine.analyze(
      enriched.map(s => ({
        name: s.name,
        authorityScore: s.authority.overall,
        engagementScore: s.engagement.overall,
        careerAlignmentScore: s.careerAlignment.overall,
        sourceTopics: s.sourceTopics,
      }))
    );

    const evoInput = enriched.map(s => ({ name: s.name, description: s.description, category: s.category, confidence: s.confidence }));
    const evolution = pillarEvolutionEngine.analyze(evoInput, previousSnapshots as any);

    const snapshot = await PillarSnapshot.create({
      userId: userObjectId,
      version: evolution.version,
      pillars: enriched.map(s => ({
        name: s.name,
        rank: s.rank,
        authorityScore: s.authority.overall,
        engagementScore: s.engagement.overall,
        careerAlignmentScore: s.careerAlignment.overall,
        percentage: mixResult.distributions.find(d => d.pillarName === s.name)?.percentage || 0,
        topicCount: topicClusters.find(tc => tc.pillarName === s.name)?.totalTopics || 0,
      })),
      summary: {
        totalPillars: enriched.length,
        topPillar: enriched[0]?.name || '',
        averageAuthorityScore: Math.round(enriched.reduce((s, p) => s + p.authority.overall, 0) / enriched.length),
        averageEngagementScore: Math.round(enriched.reduce((s, p) => s + p.engagement.overall, 0) / enriched.length),
        primaryDistribution: `${mixResult.distributions[0]?.percentage}% ${enriched[0]?.name || ''}`,
      },
      trigger: 'manual_regeneration',
      reason: 'Full content pillar intelligence regeneration',
      previousSnapshotId: previousSnapshots[0]?._id as mongoose.Types.ObjectId | undefined,
    });

    logger.info({ userId, totalPillars: enriched.length }, 'Content pillar intelligence report complete');

    return {
      pillars: savedPillars,
      pillarScores,
      topicClusters,
      authorityMap: authMapDoc,
      contentDistribution: distDoc,
      opportunityAnalysis: oppAnalysis,
      evolution,
      snapshot,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const contentPillarOrchestrator = new ContentPillarOrchestrator();
