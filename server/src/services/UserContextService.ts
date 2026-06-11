import mongoose from 'mongoose';
import pino from 'pino';
import { User } from '../models/identity/User';
import { AnalysisReport } from '../models/analysis/AnalysisReport';
import { OnboardingState } from '../models/onboarding/OnboardingState';

const logger = pino({ name: 'user-context-service' });

export interface UserContext {
  userId: string;
  user: any;
  report: any;
  onboarding: any;
  linkedinUrl: string;
  githubUrl: string;
  careerGoals: string[];
}

export class UserContextService {

  async getContext(userId: string): Promise<UserContext> {
    const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

    const [user, report, onboarding] = await Promise.all([
      User.findById(userId).lean().catch(() => null),
      AnalysisReport.findOne({ userId: toObjectId(userId) }).lean().catch(() => null),
      OnboardingState.findOne({ userId: toObjectId(userId) }).lean().catch(() => null),
    ]);

    return {
      userId,
      user,
      report,
      onboarding,
      linkedinUrl: (onboarding as any)?.linkedinUrl || '',
      githubUrl: (onboarding as any)?.githubUrl || '',
      careerGoals: (onboarding as any)?.careerGoals || [],
    };
  }

  async getUser(userId: string): Promise<any> {
    return User.findById(userId).lean().catch(() => null);
  }

  async getReport(userId: string): Promise<any> {
    const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);
    return AnalysisReport.findOne({ userId: toObjectId(userId) }).lean().catch(() => null);
  }

  async getBrandDNA(userId: string): Promise<any> {
    const report = await this.getReport(userId);
    return report?.brandDNA || null;
  }

  async getWritingDNA(userId: string): Promise<any> {
    const report = await this.getReport(userId);
    return report?.writingDNA || null;
  }

  async getContentStrategy(userId: string): Promise<any> {
    const report = await this.getReport(userId);
    return report?.strategy90Days || null;
  }

  async getContentPillars(userId: string): Promise<any[]> {
    const report = await this.getReport(userId);
    return report?.contentPillars || [];
  }

  async getCareerBlueprint(userId: string): Promise<any> {
    const report = await this.getReport(userId);
    return report?.careerBlueprint || null;
  }

  async getScores(userId: string): Promise<any> {
    const report = await this.getReport(userId);
    return report?.scores || { technicalLeadership: 0, contentReadiness: 0, industryAuthority: 0, personalBrand: 0, careerOpportunity: 0 };
  }
}

export const userContextService = new UserContextService();
