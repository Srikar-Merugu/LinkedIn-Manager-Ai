import mongoose from 'mongoose';
import pino from 'pino';
import { CareerGoal } from '../../models/brand/CareerGoal';
import { CareerBlueprint } from '../../models/career/CareerBlueprint';
import { SkillGapReport } from '../../models/career/SkillGapReport';
import { OpportunityForecast } from '../../models/career/OpportunityForecast';
import { AuthorityMap } from '../../models/career/AuthorityMap';
import { NetworkingRecommendation } from '../../models/career/NetworkingRecommendation';
import { CareerMilestone } from '../../models/career/CareerMilestone';

import { careerStageDetectionEngine } from './engines/CareerStageDetectionEngine';
import { opportunityMappingEngine } from './engines/OpportunityMappingEngine';
import { skillGapEngine } from './engines/SkillGapEngine';
import { contentToCareerEngine } from './engines/ContentToCareerEngine';
import { careerBlueprintEngine } from './engines/CareerBlueprintEngine';
import { authorityBuildingEngine } from './engines/AuthorityBuildingEngine';
import { networkingIntelligenceEngine } from './engines/NetworkingIntelligenceEngine';
import { opportunityForecastingEngine } from './engines/OpportunityForecastingEngine';
import { careerGoalEngine } from './engines/CareerGoalEngine';

const logger = pino();

export interface CareerIntelligenceReport {
  goal: any;
  stage: any;
  opportunityMap: any;
  skillGap: any;
  contentMap: any;
  authority: any;
  networking: any;
  forecast: any;
  blueprint: any;
  generatedAt: string;
}

export class CareerIntelligenceOrchestrator {

  async generateFullReport(userId: string, profileData: any): Promise<CareerIntelligenceReport> {
    const userObjectId = new mongoose.Types.ObjectId(userId);

    logger.info({ userId }, 'Generating full career intelligence report');

    const goal = await this.ensureGoal(userObjectId, profileData);
    const stage = careerStageDetectionEngine.detect(profileData);
    const opportunityMap = opportunityMappingEngine.map(profileData, profileData.targetRole);
    const skillGap = skillGapEngine.analyze(profileData);
    const contentMap = contentToCareerEngine.map(goal.primaryGoal);

    const authorityData = {
      ...profileData,
      currentRole: opportunityMap.currentPosition,
      targetRole: opportunityMap.targetPosition,
    };
    const authority = authorityBuildingEngine.analyze(authorityData);

    const networkingProfile = {
      ...profileData,
      targetRole: opportunityMap.targetPosition,
    };
    const networking = networkingIntelligenceEngine.recommend(networkingProfile);

    const forecastProfile = {
      skills: profileData.skills,
      experience: profileData.experience,
      certifications: profileData.certifications,
      projects: profileData.projects,
      targetRole: opportunityMap.targetPosition,
      careerStage: stage.primaryStage,
    };
    const forecast = opportunityForecastingEngine.forecast(forecastProfile);

    const blueprintInput = {
      currentPosition: opportunityMap.currentPosition,
      targetPosition: opportunityMap.targetPosition,
      careerStage: stage.primaryStage,
      skills: profileData.skills,
      topGaps: skillGap.skills.filter(s => s.gap >= 3).map(s => s.skill),
      recommendedContent: contentMap.recommendedContentTypes.map(c => c.type),
      authorityTopics: authority.topics.filter(t => t.category === 'own').map(t => t.topic),
      networkingTargets: networking.targets.map(t => t.name),
      confidence: stage.confidence,
    };
    const blueprint = careerBlueprintEngine.generate(blueprintInput);

    const dbBlueprint = await CareerBlueprint.create({
      userId: userObjectId,
      careerGoalId: goal._id,
      version: 1,
      currentPosition: blueprintInput.currentPosition,
      targetPosition: blueprintInput.targetPosition,
      careerStage: blueprintInput.careerStage,
      confidence: blueprintInput.confidence,
      sections: blueprint.sections,
      milestones: blueprint.milestones,
      progress: blueprint.progress,
    });

    await SkillGapReport.create({
      userId: userObjectId,
      careerGoalId: goal._id,
      version: 1,
      targetRole: opportunityMap.targetPosition,
      careerStage: stage.primaryStage,
      skills: skillGap.skills,
      summary: skillGap.summary,
      recommendations: skillGap.recommendations,
    });

    await OpportunityForecast.create({
      userId: userObjectId,
      careerGoalId: goal._id,
      version: 1,
      targetRole: opportunityMap.targetPosition,
      forecasts: forecast.forecasts,
      trends: forecast.trends,
      summary: forecast.summary,
      recommendations: forecast.recommendations,
    });

    await AuthorityMap.create({
      userId: userObjectId,
      careerGoalId: goal._id,
      version: 1,
      targetRole: opportunityMap.targetPosition,
      careerStage: stage.primaryStage,
      topics: authority.topics,
      summary: authority.summary,
      authorityRoadmap: authority.authorityRoadmap,
      recommendations: authority.recommendations,
    });

    await NetworkingRecommendation.create({
      userId: userObjectId,
      careerGoalId: goal._id,
      version: 1,
      targetRole: opportunityMap.targetPosition,
      targets: networking.targets,
      communities: networking.communities,
      events: networking.events,
      discussions: networking.discussions,
      summary: networking.summary,
      recommendations: networking.recommendations,
    });

    logger.info({ userId, primaryGoal: goal.primaryGoal }, 'Career intelligence report complete');

    return {
      goal,
      stage,
      opportunityMap,
      skillGap,
      contentMap,
      authority,
      networking,
      forecast,
      blueprint: {
        _id: dbBlueprint._id,
        currentPosition: dbBlueprint.currentPosition,
        targetPosition: dbBlueprint.targetPosition,
        sections: dbBlueprint.sections,
        milestones: dbBlueprint.milestones,
        progress: dbBlueprint.progress,
        createdAt: dbBlueprint.createdAt,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private async ensureGoal(userObjectId: mongoose.Types.ObjectId, profileData: any) {
    const existing = await CareerGoal.findOne({ userId: userObjectId, isActive: true });
    if (existing) return existing;

    const suggestions = careerGoalEngine.suggest(profileData);
    const top = suggestions[0];

    return CareerGoal.create({
      userId: userObjectId,
      primaryGoal: top.type,
      secondaryGoals: suggestions.slice(1, 3).map(s => s.type),
      timeline: {
        shortTerm: `Achieve ${top.label.toLowerCase()} in next 3 months`,
        mediumTerm: `Build sustainable ${top.label.toLowerCase()} over 6 months`,
        longTerm: `Establish career trajectory over 12 months`,
      },
      isActive: true,
      status: 'draft',
      version: 1,
    });
  }
}

export const careerIntelligenceOrchestrator = new CareerIntelligenceOrchestrator();
