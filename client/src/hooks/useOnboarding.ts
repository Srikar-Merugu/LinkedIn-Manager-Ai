'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { api } from '@/lib/api';

type OnboardingStep =
  | 'welcome'
  | 'connect_linkedin'
  | 'upload_resume'
  | 'connect_github'
  | 'connect_portfolio'
  | 'career_goals'
  | 'content_experience'
  | 'voice_training'
  | 'ai_analysis'
  | 'results';

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

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  connect_linkedin: 'Connect LinkedIn',
  upload_resume: 'Upload Resume',
  connect_github: 'Connect GitHub',
  connect_portfolio: 'Connect Portfolio',
  career_goals: 'Career Goals',
  content_experience: 'Content Experience',
  voice_training: 'Voice Training',
  ai_analysis: 'AI Analysis',
  results: 'Your Results',
};

const STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  welcome: 'Let\'s get started',
  connect_linkedin: 'Your profile is the source of truth',
  upload_resume: 'Bring your experience',
  connect_github: 'Show your work',
  connect_portfolio: 'Your online presence',
  career_goals: 'What are you working toward?',
  content_experience: 'Your content baseline',
  voice_training: 'Teach AI your voice',
  ai_analysis: 'AI is building your profile',
  results: 'Your personal brand strategy',
};

export function useOnboarding() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [completedSteps, setCompletedSteps] = useState<OnboardingStep[]>([]);
  const [percentage, setPercentage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);

  const totalSteps = STEP_ORDER.length;
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  useEffect(() => {
    if (!isLoaded) return;

    async function loadState() {
      if (!isSignedIn || !user) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.onboarding.getState();
        if (data.state) {
          setCurrentStep(data.state.currentStep || 'welcome');
          setCompletedSteps(data.state.completedSteps || []);
          setPercentage(data.percentage || 0);
          setAnalysisProgress(data.state.analysisProgress || 0);
          setAnalysisLog(data.state.analysisLog || []);

          if (data.state.status === 'completed') {
            setOnboardingComplete(true);
            setCurrentStep('results');
          }

          if (data.state.analysisStatus === 'in_progress') {
            setIsAnalysisRunning(true);
          }
          setLoading(false);
          return;
        }
      } catch {
        // State fetch failed
      }

      try {
        await api.onboarding.start();
      } catch {
        // Silently handle
      }
      setLoading(false);
    }

    loadState();
  }, [isLoaded, isSignedIn, user]);

  const goToStep = useCallback((step: OnboardingStep) => {
    setCurrentStep(step);
  }, []);

  const completeStep = useCallback(async (step: OnboardingStep, data?: any) => {
    try {
      switch (step) {
        case 'welcome':
          await api.onboarding.completeWelcome(data);
          break;
        case 'connect_linkedin':
          if (data) await api.onboarding.connectLinkedIn(data.profileId, data.accessToken);
          break;
        case 'upload_resume':
          if (data) await api.onboarding.uploadResume(data.fileInfo, data.parsedData);
          break;
        case 'connect_github':
          if (data) await api.onboarding.connectGitHub(data.username, data);
          break;
        case 'connect_portfolio':
          if (data) await api.onboarding.connectPortfolio(data.url, data);
          break;
        case 'career_goals':
          await api.onboarding.saveGoals(data?.goals || []);
          break;
        case 'content_experience':
          await api.onboarding.saveContentExperience(data?.frequency || 'never');
          break;
        case 'voice_training':
          if (data) await api.onboarding.saveVoiceSamples(data.samples || []);
          break;
        case 'ai_analysis':
          await api.onboarding.startAnalysis();
          setIsAnalysisRunning(true);
          break;
        default:
          break;
      }

      const newCompleted = [...completedSteps, step];
      setCompletedSteps(newCompleted);
      const pct = Math.round((newCompleted.length / totalSteps) * 100);
      setPercentage(pct);

      const nextIdx = STEP_ORDER.indexOf(step) + 1;
      if (nextIdx < STEP_ORDER.length) {
        setCurrentStep(STEP_ORDER[nextIdx]);
      } else {
        setOnboardingComplete(true);
        setCurrentStep('results');
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [completedSteps, totalSteps]);

  const skipStep = useCallback(async (step: OnboardingStep) => {
    try {
      await api.onboarding.skipStep(step);
      const newCompleted = [...completedSteps, step];
      setCompletedSteps(newCompleted);
      const pct = Math.round((newCompleted.length / totalSteps) * 100);
      setPercentage(pct);

      const nextIdx = STEP_ORDER.indexOf(step) + 1;
      if (nextIdx < STEP_ORDER.length) {
        setCurrentStep(STEP_ORDER[nextIdx]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [completedSteps, totalSteps]);

  const updateAnalysis = useCallback(async (progressVal: number, logEntry?: string) => {
    setAnalysisProgress(progressVal);
    if (logEntry) setAnalysisLog(prev => [...prev, logEntry]);
    if (progressVal >= 100) {
      setIsAnalysisRunning(false);
      setPercentage(100);
      setCurrentStep('results');
      setOnboardingComplete(true);
      api.onboarding.updateAnalysisProgress(100, 'Analysis complete').catch(() => {});
    } else if (progressVal % 25 === 0) {
      api.onboarding.updateAnalysisProgress(progressVal, logEntry).catch(() => {});
    }
  }, []);

  const finishOnboarding = useCallback(async () => {
    try {
      await api.onboarding.markRedirected();
    } catch {
      // Silently handle
    }
    setOnboardingComplete(true);
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const s = await api.onboarding.getSummary();
      setSummary(s);
    } catch {
      // Silently handle
    }
  }, []);

  return {
    currentStep,
    currentStepIndex,
    completedSteps,
    percentage,
    totalSteps,
    loading,
    error,
    isAnalysisRunning,
    analysisProgress,
    analysisLog,
    onboardingComplete,
    summary,
    isSignedIn,
    isLoaded,
    user,
    stepLabel: STEP_LABELS[currentStep],
    stepDescription: STEP_DESCRIPTIONS[currentStep],
    stepLabels: STEP_LABELS,
    stepDescriptions: STEP_DESCRIPTIONS,
    stepOrder: STEP_ORDER,
    goToStep,
    setCurrentStep,
    completeStep,
    skipStep,
    updateAnalysis,
    finishOnboarding,
    refreshSummary,
  };
}
