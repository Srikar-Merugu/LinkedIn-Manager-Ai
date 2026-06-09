import mongoose from 'mongoose';
import { OnboardingState, IOnboardingState } from '../../models/onboarding/OnboardingState';
import { VoiceSample } from '../../models/onboarding/VoiceSample';
import { ResumeData } from '../../models/onboarding/ResumeData';
import { GitHubData } from '../../models/onboarding/GitHubData';
import { PortfolioData } from '../../models/onboarding/PortfolioData';
import { User } from '../../models/identity/User';
import type { OnboardingStep } from '../../types/database';
import pino from 'pino';

const logger = pino();

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'connect_linkedin',
  'upload_resume',
  'connect_github',
  'connect_portfolio',
  'career_goals',
  'content_experience',
  'voice_training',
  'ai_analysis',
  'results',
];

function getStepIndex(step: OnboardingStep): number {
  return STEP_ORDER.indexOf(step);
}

function getNextStep(current: OnboardingStep): OnboardingStep | null {
  const idx = getStepIndex(current);
  if (idx === -1 || idx >= STEP_ORDER.length - 1) return null;
  return STEP_ORDER[idx + 1];
}

export class OnboardingService {
  async getOrCreateState(clerkId: string, userEmail?: string, fullName?: string): Promise<IOnboardingState> {
    let state = await OnboardingState.findOne({ clerkId });
    if (state) return state;

    let user = await User.findOne({ clerkId });
    if (!user) {
      user = await User.create({
        clerkId,
        email: userEmail || `${clerkId}@placeholder.com`,
        fullName: fullName || 'User',
        onboardingStatus: 'not_started',
        onboardingStep: 0,
      });
    }

    state = await OnboardingState.create({
      userId: user._id,
      clerkId,
      status: 'in_progress',
      currentStep: 'welcome',
      completedSteps: [],
      stepData: [],
      connectedSources: {
        linkedin: { connected: false },
        github: { connected: false },
        resume: { connected: false },
        portfolio: { connected: false },
      },
      careerGoals: [],
      analysisStatus: 'pending',
      analysisProgress: 0,
      analysisLog: [],
      brandDnaGenerated: false,
      voiceSamplesCount: 0,
      startedAt: new Date(),
    });

    await User.findByIdAndUpdate(user._id, { onboardingStatus: 'not_started', onboardingStep: 0 });
    return state;
  }

  async getState(clerkId: string): Promise<IOnboardingState | null> {
    return OnboardingState.findOne({ clerkId });
  }

  async completeStep(clerkId: string, step: OnboardingStep, data: Record<string, unknown> = {}): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    if (state.completedSteps.includes(step)) return state;

    const stepEntry = {
      step,
      completedAt: new Date(),
      skipped: false,
      data,
    };

    state.stepData.push(stepEntry as any);
    state.completedSteps.push(step);

    const nextStep = getNextStep(step);
    if (nextStep) {
      state.currentStep = nextStep;
    } else {
      state.currentStep = step;
      state.status = 'completed';
      state.completedAt = new Date();
      state.analysisStatus = 'completed';
    }

    await state.save();

    const stepIndex = getStepIndex(step) + 1;
    await User.findOneAndUpdate({ clerkId }, {
      onboardingStep: stepIndex,
      onboardingStatus: step === 'results' ? 'complete' : 'linkedin_connected',
    });

    return state;
  }

  async skipStep(clerkId: string, step: OnboardingStep): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    if (state.completedSteps.includes(step)) return state;

    const stepEntry = {
      step,
      completedAt: undefined,
      skipped: true,
      data: { skipped: true },
    };

    state.stepData.push(stepEntry as any);
    state.completedSteps.push(step);

    const nextStep = getNextStep(step);
    if (nextStep) {
      state.currentStep = nextStep;
    }

    await state.save();
    return state;
  }

  async saveLinkedInData(clerkId: string, profileId: string, accessToken: string): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    state.connectedSources.linkedin = {
      connected: true,
      profileId,
      accessToken,
      syncedAt: new Date(),
    };

    await state.save();
    return this.completeStep(clerkId, 'connect_linkedin', { profileId });
  }

  async saveResumeData(
    clerkId: string,
    fileInfo: { fileName: string; fileType: string; fileSize: number },
    parsedData: {
      rawText: string;
      skills: string[];
      experience: any[];
      education: any[];
      certifications: string[];
      projects: any[];
      summary?: string;
      languages: string[];
    }
  ): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    const resume = await ResumeData.create({
      userId: state.userId,
      clerkId,
      onboardingStateId: state._id,
      originalFileName: fileInfo.fileName,
      fileType: fileInfo.fileType,
      fileSize: fileInfo.fileSize,
      rawText: parsedData.rawText,
      parsed: {
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        certifications: parsedData.certifications,
        projects: parsedData.projects,
        summary: parsedData.summary,
        languages: parsedData.languages,
      },
    });

    state.connectedSources.resume = {
      connected: true,
      fileId: resume._id.toString(),
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      syncedAt: new Date(),
    };

    await state.save();
    return this.completeStep(clerkId, 'upload_resume', { resumeId: resume._id, skillsCount: parsedData.skills.length });
  }

  async saveGitHubData(clerkId: string, username: string, githubInfo: Record<string, unknown>): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    const ghData = await GitHubData.create({
      userId: state.userId,
      clerkId,
      onboardingStateId: state._id,
      username,
      ...githubInfo,
    });

    state.connectedSources.github = {
      connected: true,
      username,
      repos: (githubInfo as any).publicRepos || 0,
      languages: (githubInfo as any).topLanguages?.map((l: any) => l.name) || [],
      syncedAt: new Date(),
    };

    await state.save();
    return this.completeStep(clerkId, 'connect_github', { githubDataId: ghData._id, repos: (githubInfo as any).publicRepos });
  }

  async savePortfolioData(clerkId: string, url: string, portfolioInfo: Record<string, unknown>): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    const pfData = await PortfolioData.create({
      userId: state.userId,
      clerkId,
      onboardingStateId: state._id,
      url,
      title: portfolioInfo.title as string | undefined,
      description: portfolioInfo.description as string | undefined,
      aboutContent: portfolioInfo.aboutContent as string | undefined,
      skills: portfolioInfo.skills as string[] | undefined,
      rawContent: portfolioInfo.rawContent as string | undefined,
    });

    state.connectedSources.portfolio = {
      connected: true,
      url,
      pages: (portfolioInfo as any).entries?.length || 0,
      syncedAt: new Date(),
    };

    await state.save();
    return this.completeStep(clerkId, 'connect_portfolio', { portfolioDataId: pfData._id });
  }

  async saveCareerGoals(clerkId: string, goals: string[]): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    state.careerGoals = goals;
    await state.save();
    return this.completeStep(clerkId, 'career_goals', { goals });
  }

  async saveContentExperience(clerkId: string, frequency: string): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    state.postingFrequency = frequency as any;
    await state.save();
    return this.completeStep(clerkId, 'content_experience', { frequency });
  }

  async saveVoiceSamples(clerkId: string, samples: Array<{ sourceType: string; content: string; title?: string; sourceUrl?: string; contentType: string }>): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    for (const sample of samples) {
      await VoiceSample.create({
        userId: state.userId,
        clerkId,
        onboardingStateId: state._id,
        sourceType: sample.sourceType,
        content: sample.content,
        title: sample.title,
        sourceUrl: sample.sourceUrl,
        contentType: sample.contentType,
        wordCount: sample.content.split(/\s+/).filter(Boolean).length,
      });
    }

    state.voiceSamplesCount = (state.voiceSamplesCount || 0) + samples.length;
    await state.save();
    return this.completeStep(clerkId, 'voice_training', { samplesCount: samples.length });
  }

  async startAIAnalysis(clerkId: string): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    state.analysisStatus = 'in_progress';
    state.analysisProgress = 0;
    state.analysisLog = [];
    state.analysisStartedAt = new Date();
    await state.save();
    return state;
  }

  async updateAnalysisProgress(clerkId: string, progress: number, logEntry?: string): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    state.analysisProgress = Math.min(progress, 100);
    if (logEntry) {
      state.analysisLog.push(logEntry);
    }
    if (progress >= 100) {
      state.analysisStatus = 'completed';
      state.analysisCompletedAt = new Date();
      state.brandDnaGenerated = true;
      if (!state.completedSteps.includes('ai_analysis')) {
        state.completedSteps.push('ai_analysis');
      }
      state.currentStep = 'results';
      state.status = 'completed';
      state.completedAt = new Date();
    }
    await state.save();
    return state;
  }

  async failAnalysis(clerkId: string, error: string): Promise<IOnboardingState> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) throw new Error('Onboarding state not found');

    state.analysisStatus = 'failed';
    state.analysisLog.push(`ERROR: ${error}`);
    await state.save();
    return state;
  }

  async markRedirected(clerkId: string): Promise<void> {
    await OnboardingState.findOneAndUpdate(
      { clerkId },
      { onboardingCompleteRedirected: true, status: 'completed' }
    );
  }

  async getOnboardingProgress(clerkId: string): Promise<{
    state: IOnboardingState | null;
    totalSteps: number;
    completedCount: number;
    percentage: number;
    currentStepIndex: number;
  }> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) return { state: null, totalSteps: STEP_ORDER.length, completedCount: 0, percentage: 0, currentStepIndex: 0 };

    const completedCount = state.completedSteps.length;
    return {
      state,
      totalSteps: STEP_ORDER.length,
      completedCount,
      percentage: Math.round((completedCount / STEP_ORDER.length) * 100),
      currentStepIndex: getStepIndex(state.currentStep),
    };
  }

  async getOnboardingSummary(clerkId: string): Promise<Record<string, unknown>> {
    const state = await this.getState(clerkId);
    if (!state) return {};

    const resume = state.connectedSources.resume.connected
      ? await ResumeData.findOne({ onboardingStateId: state._id }).lean()
      : null;

    const github = state.connectedSources.github.connected
      ? await GitHubData.findOne({ onboardingStateId: state._id }).lean()
      : null;

    const portfolio = state.connectedSources.portfolio.connected
      ? await PortfolioData.findOne({ onboardingStateId: state._id }).lean()
      : null;

    const voiceSamples = await VoiceSample.find({ onboardingStateId: state._id }).lean();

    return {
      status: state.status,
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      connectedSources: state.connectedSources,
      careerGoals: state.careerGoals,
      postingFrequency: state.postingFrequency,
      analysisStatus: state.analysisStatus,
      analysisProgress: state.analysisProgress,
      resumeSummary: resume ? { skills: (resume as any).parsed?.skills?.length || 0, experience: (resume as any).parsed?.experience?.length || 0 } : null,
      githubSummary: github ? { repos: (github as any).publicRepos, languages: (github as any).topLanguages } : null,
      portfolioSummary: portfolio ? { entries: (portfolio as any).entries?.length || 0 } : null,
      voiceSampleCount: voiceSamples.length,
    };
  }

  async abort(clerkId: string): Promise<void> {
    await OnboardingState.findOneAndUpdate({ clerkId }, { status: 'abandoned' });
  }

  async resume(clerkId: string): Promise<IOnboardingState | null> {
    const state = await OnboardingState.findOne({ clerkId, status: { $in: ['in_progress', 'abandoned'] } });
    if (!state) return null;
    if (state.status === 'abandoned') {
      state.status = 'in_progress';
      await state.save();
    }
    return state;
  }

  async getStepData(clerkId: string, step: OnboardingStep): Promise<Record<string, unknown> | null> {
    const state = await OnboardingState.findOne({ clerkId });
    if (!state) return null;
    const entry = state.stepData.find((s: any) => s.step === step);
    return entry ? (entry as any).data || {} : null;
  }
}

export const onboardingService = new OnboardingService();
