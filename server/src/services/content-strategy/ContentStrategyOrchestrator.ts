import mongoose from 'mongoose';
import pino from 'pino';
import { ContentStrategyIntelligence } from '../../models/content-strategy/ContentStrategyIntelligence';
import { MonthlyStrategy } from '../../models/content-strategy/MonthlyStrategy';
import { WeeklyTheme } from '../../models/content-strategy/WeeklyTheme';
import { StrategyScore } from '../../models/content-strategy/StrategyScore';
import { GrowthGoal } from '../../models/content-strategy/GrowthGoal';
import { AuthorityRoadmap } from '../../models/content-strategy/AuthorityRoadmap';
import { NetworkingPlan } from '../../models/content-strategy/NetworkingPlan';
import { OpportunityPlan } from '../../models/content-strategy/OpportunityPlan';

import { audienceGoalEngine } from './engines/AudienceGoalEngine';
import { authorityBuildingEngine } from './engines/AuthorityBuildingEngine';
import { networkingStrategyEngine } from './engines/NetworkingStrategyEngine';
import { opportunityCreationEngine } from './engines/OpportunityCreationEngine';
import { contentMixEngine } from './engines/ContentMixEngine';
import { postFrequencyEngine } from './engines/PostFrequencyEngine';
import { weeklyThemeEngine } from './engines/WeeklyThemeEngine';
import { strategyScoringEngine } from './engines/StrategyScoringEngine';
import { regenerationEngine } from './engines/RegenerationEngine';

const logger = pino();

export interface ContentStrategyReport {
  strategy: any;
  monthlyPlans: any[];
  weeklyThemes: any[];
  growthGoals: any[];
  authorityRoadmap: any;
  networkingPlan: any;
  opportunityPlan: any;
  strategyScore: any;
  generatedAt: string;
}

export class ContentStrategyOrchestrator {

  async generateFullReport(userId: string, profileData: any): Promise<ContentStrategyReport> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    logger.info({ userId }, 'Generating full content strategy intelligence report');

    const previousStrategies = await ContentStrategyIntelligence.find({ userId: userObjectId, isActive: true })
      .sort({ version: -1 })
      .limit(1)
      .lean();
    const previousVersion = previousStrategies[0];
    const nextVersion = (previousVersion?.version || 0) + 1;

    const freq = postFrequencyEngine.recommend(profileData);

    const audienceGoals = audienceGoalEngine.generate(profileData);

    const authorityRoadmapData = authorityBuildingEngine.analyze(profileData);

    const networkingPlanData = networkingStrategyEngine.recommend(profileData);

    const opportunityPlanData = opportunityCreationEngine.analyze(profileData);

    const themes = weeklyThemeEngine.generate(profileData);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + (7 - startDate.getDay()));

    const startDates: Date[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i * 7);
      startDates.push(d);
    }

    const monthlyPlans: Array<{
      monthNumber: 1 | 2 | 3;
      phase: 'positioning' | 'authority' | 'opportunity';
      goals: Array<{ goal: string; reasoning: string; expectedOutcome: string; successMetrics: string[] }>;
      contentMix: Array<{ type: string; percentage: number; reasoning: string }>;
      weeklyThemes: number[];
    }> = [];

    for (let month = 1; month <= 3; month++) {
      const phase: 'positioning' | 'authority' | 'opportunity' =
        month === 1 ? 'positioning' : month === 2 ? 'authority' : 'opportunity';

      const mix = contentMixEngine.distribute(profileData, phase);
      const monthThemes = themes.filter(t => t.monthNumber === month).map(t => t.globalWeekNumber);

      const phaseGoals = [
        phase === 'positioning'
          ? { goal: 'Establish initial expertise recognition', reasoning: 'First impressions determine whether audience continues engaging. Positioning phase builds trust foundation.', expectedOutcome: 'Audience recognizes you as credible professional in your domain', successMetrics: ['Profile views +50%', 'New connections +30', 'Content engagement rate >3%'] }
          : phase === 'authority'
            ? { goal: 'Build recognized authority in core domains', reasoning: 'Authority is earned through demonstrated depth. Educational and framework content proves expertise.', expectedOutcome: 'Industry peers reference your work and engage with your frameworks', successMetrics: ['Content save rate >10%', 'Peer mentions increase', 'Speaking/collaboration invites'] }
            : { goal: 'Generate measurable professional opportunities', reasoning: 'Strategic opinion and success-story content attracts specific opportunity types.', expectedOutcome: 'Inbound opportunities from target audience segments', successMetrics: ['Recruiter DMs', 'Client inquiries', 'Collaboration proposals'] },
      ];

      monthlyPlans.push({
        monthNumber: month as 1 | 2 | 3,
        phase,
        goals: phaseGoals,
        contentMix: mix.distributions.map(d => ({ type: d.type, percentage: d.percentage, reasoning: d.reasoning })),
        weeklyThemes: monthThemes,
      });
    }

    const allGoals = [
      ...audienceGoals,
      {
        category: 'authority' as const,
        goal: `Dominate ${authorityRoadmapData.topics.filter(t => t.category === 'dominate').map(t => t.name).slice(0, 2).join(' and ')} as authority topics`,
        reasoning: 'Authority dominance in specific topics creates a moat that differentiates you from generalists and attracts premium opportunities.',
        expectedOutcome: `Authority score increase from ${Math.round(authorityRoadmapData.topics.filter(t => t.category !== 'avoid').reduce((s, t) => s + t.currentAuthority, 0) / Math.max(authorityRoadmapData.topics.filter(t => t.category !== 'avoid').length, 1))} to ${authorityRoadmapData.overallAuthorityProjection}`,
        successMetrics: ['Topic-specific engagement rate', 'Content saves', 'Direct messages about expertise'],
      },
      {
        category: 'career' as const,
        goal: `Align content strategy with ${profileData.careerGoal?.targetRole || 'career growth'} objectives`,
        reasoning: 'Every piece of content should serve career outcomes. Strategic alignment ensures content effort translates to professional advancement.',
        expectedOutcome: 'Clear connection between content output and career progression signals',
        successMetrics: ['Target role opportunities', 'Industry recognition', 'Skill demonstration through content'],
      },
      {
        category: 'networking' as const,
        goal: 'Build strategic professional network through value-first engagement',
        reasoning: 'Content multiplies networking impact when combined with intentional engagement strategy.',
        expectedOutcome: `${networkingPlanData.reach.projectedNewConnections} new quality connections and ${networkingPlanData.reach.projectedEngagements} meaningful engagements`,
        successMetrics: ['New connections/week', 'Meaningful comment exchanges', 'Collaboration requests'],
      },
      {
        category: 'content' as const,
        goal: `Publish ${freq.postsPerWeek * 12} strategic posts over 90 days with consistent quality`,
        reasoning: 'Volume without strategy is noise. Each post must serve a specific goal within the monthly phase framework.',
        expectedOutcome: `${freq.postsPerWeek} posts per week with clear strategic purpose per piece`,
        successMetrics: ['Post completion rate', 'Content quality score', 'Strategy adherence'],
      },
      {
        category: 'growth' as const,
        goal: 'Build compounding content authority that generates opportunities beyond 90 days',
        reasoning: 'The 90-day strategy seeds long-term authority. Each phase builds on the previous to create compounding professional value.',
        expectedOutcome: 'Strategy generates opportunities that continue past the 90-day window',
        successMetrics: ['Month-over-month growth', 'Opportunity velocity', 'Authority trajectory'],
      },
    ];

    const strategyInput = {
      growthGoals: allGoals,
      contentMix: monthlyPlans.flatMap(mp => mp.contentMix),
      authorityTopics: authorityRoadmapData.topics,
      opportunityPlan: opportunityPlanData,
      networkingPlan: networkingPlanData,
      frequencyRecommendation: freq,
    };
    const scores = strategyScoringEngine.evaluate(strategyInput);

    const narrative = `A ${freq.postsPerWeek}-post-per-week, 12-week content strategy for a ${profileData.experience?.length || 'professional'} with expertise in ${(profileData.skills || []).slice(0, 3).map((s: any) => s.name).join(', ') || 'their field'}. The strategy follows a ${monthlyPlans.map(mp => mp.phase).join(' → ')} progression, starting with positioning, building authority, and culminating in opportunity generation. Content mix is optimized for ${profileData.careerGoal?.targetRole || 'career growth'} outcomes with ${freq.postsPerWeek} posts per week.`;

    const distributionSummary = monthlyPlans.map(mp =>
      `Month ${mp.monthNumber} (${mp.phase}): ${mp.contentMix.map(d => `${d.percentage}% ${d.type}`).join(', ')}`
    ).join('. ') + '.';

    const strategyDoc = await ContentStrategyIntelligence.create({
      userId: userObjectId,
      version: nextVersion,
      status: 'active',
      generationTrigger: 'initial',
      profileSnapshot: {
        experienceLevel: (profileData.experience?.length || 0) > 5 ? 'senior' : (profileData.experience?.length || 0) > 2 ? 'mid' : 'junior',
        primarySkills: (profileData.skills || []).map((s: any) => s.name),
        targetRole: profileData.careerGoal?.targetRole,
        audienceSize: profileData.audienceData?.size,
      },
      overallStrategy: {
        narrative,
        monthlyPlans,
        totalWeeks: 12,
        recommendedFrequency: freq.postsPerWeek,
        distributionSummary,
      },
      growthGoals: allGoals,
      scores: {
        authorityScore: scores.authorityScore.overall,
        opportunityScore: scores.opportunityScore.overall,
        careerAlignmentScore: scores.careerAlignmentScore.overall,
        audienceFitScore: scores.audienceFitScore.overall,
        executionScore: scores.executionScore.overall,
        overallScore: scores.overallScore,
      },
      regenerationHistory: previousVersion ? [...previousVersion.regenerationHistory, {
        version: nextVersion,
        trigger: 'initial',
        timestamp: new Date(),
        changes: ['Full strategy regeneration'],
      }] : [],
      isActive: true,
      activatedAt: new Date(),
    });

    const savedMonthlyPlanDocs = [];
    for (const mp of monthlyPlans) {
      const monthStart = new Date(startDate);
      monthStart.setDate(monthStart.getDate() + (mp.monthNumber - 1) * 28);
      const monthEnd = new Date(monthStart);
      monthEnd.setDate(monthEnd.getDate() + 27);

      const doc = await MonthlyStrategy.create({
        userId: userObjectId,
        strategyId: strategyDoc._id,
        monthNumber: mp.monthNumber,
        phase: mp.phase,
        version: nextVersion,
        goals: mp.goals.map(g => ({ category: mp.phase, ...g })),
        contentMix: mp.contentMix.map(d => ({
          type: d.type,
          percentage: d.percentage,
          count: Math.round((d.percentage / 100) * freq.postsPerWeek * 28 / 7),
          reasoning: d.reasoning,
        })),
        weeklyThemeIds: [],
        status: mp.monthNumber === 1 ? 'active' : 'pending',
        startDate: monthStart,
        endDate: monthEnd,
      });
      savedMonthlyPlanDocs.push(doc);
    }

    const savedThemeDocs = [];
    for (let i = 0; i < themes.length; i++) {
      const theme = themes[i];
      const weekStart = startDates[i];
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const doc = await WeeklyTheme.create({
        userId: userObjectId,
        strategyId: strategyDoc._id,
        monthNumber: theme.monthNumber,
        weekNumber: theme.weekNumber,
        globalWeekNumber: theme.globalWeekNumber,
        version: nextVersion,
        title: theme.title,
        focus: theme.focus,
        description: theme.description,
        supportingMonthlyGoal: theme.supportingMonthlyGoal,
        contentIdeas: theme.contentIdeas,
        pillarFocus: theme.pillarFocus,
        contentTypeMix: theme.contentTypeMix,
        status: i === 0 ? 'active' : 'pending',
        startDate: weekStart,
        endDate: weekEnd,
      });
      savedThemeDocs.push(doc);

      const monthIdx = theme.monthNumber - 1;
      if (savedMonthlyPlanDocs[monthIdx]) {
        savedMonthlyPlanDocs[monthIdx].weeklyThemeIds.push(doc._id as mongoose.Types.ObjectId);
        if (i % 4 === 3 || i === themes.length - 1) {
          await savedMonthlyPlanDocs[monthIdx].save();
        }
      }
    }

    await MonthlyStrategy.bulkSave(savedMonthlyPlanDocs);

    const growthGoalDocs = [];
    for (const g of allGoals) {
      const doc = await GrowthGoal.create({
        userId: userObjectId,
        strategyId: strategyDoc._id,
        version: nextVersion,
        category: g.category,
        goal: g.goal,
        reasoning: g.reasoning,
        expectedOutcome: g.expectedOutcome,
        successMetrics: g.successMetrics,
        priority: g.category === 'authority' || g.category === 'career' ? 'critical' : 'high',
        status: 'active',
        progress: 0,
        linkedPillars: profileData.contentPillars?.map((p: any) => p.name) || [],
        linkedOpportunities: [],
      });
      growthGoalDocs.push(doc);
    }

    const authRoadmapDoc = await AuthorityRoadmap.create({
      userId: userObjectId,
      strategyId: strategyDoc._id,
      version: nextVersion,
      topics: authorityRoadmapData.topics,
      growthPath: authorityRoadmapData.growthPath,
      monthlyPriorities: authorityRoadmapData.monthlyPriorities,
      competitiveGap: authorityRoadmapData.competitiveGap,
      overallAuthorityProjection: authorityRoadmapData.overallAuthorityProjection,
    });

    const networkingDoc = await NetworkingPlan.create({
      userId: userObjectId,
      strategyId: strategyDoc._id,
      version: nextVersion,
      targets: networkingPlanData.targets,
      communities: networkingPlanData.communities,
      discussionsToJoin: networkingPlanData.discussionsToJoin,
      creatorsToFollow: networkingPlanData.creatorsToFollow,
      weeklyEngagementPlan: networkingPlanData.weeklyEngagementPlan,
      reach: networkingPlanData.reach,
    });

    const opportunityDoc = await OpportunityPlan.create({
      userId: userObjectId,
      strategyId: strategyDoc._id,
      version: nextVersion,
      contentToAttract: opportunityPlanData.contentToAttract,
      opportunityForecast: opportunityPlanData.opportunityForecast,
      highImpactContent: opportunityPlanData.highImpactContent,
      triggerContent: opportunityPlanData.triggerContent,
    });

    const scoreDoc = await StrategyScore.create({
      userId: userObjectId,
      strategyId: strategyDoc._id,
      version: nextVersion,
      authorityScore: scores.authorityScore,
      opportunityScore: scores.opportunityScore,
      careerAlignmentScore: scores.careerAlignmentScore,
      audienceFitScore: scores.audienceFitScore,
      executionScore: scores.executionScore,
      overallScore: scores.overallScore,
      scoreBreakdown: scores.scoreBreakdown,
      recommendations: scores.recommendations,
    });

    logger.info({ userId, version: nextVersion, overallScore: scores.overallScore }, 'Content strategy intelligence report complete');

    return {
      strategy: strategyDoc,
      monthlyPlans: savedMonthlyPlanDocs,
      weeklyThemes: savedThemeDocs,
      growthGoals: growthGoalDocs,
      authorityRoadmap: authRoadmapDoc,
      networkingPlan: networkingDoc,
      opportunityPlan: opportunityDoc,
      strategyScore: scoreDoc,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const contentStrategyOrchestrator = new ContentStrategyOrchestrator();
