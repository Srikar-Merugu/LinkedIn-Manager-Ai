'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type OnboardingStep =
  | 'welcome'
  | 'linkedin_url'
  | 'upload_resume'
  | 'github_url'
  | 'career_goals'
  | 'ai_analysis'
  | 'results';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'linkedin_url',
  'upload_resume',
  'github_url',
  'career_goals',
  'ai_analysis',
  'results',
];

const STEP_LABELS: Record<OnboardingStep, string> = {
  welcome: 'Welcome',
  linkedin_url: 'LinkedIn Profile',
  upload_resume: 'Upload Resume',
  github_url: 'GitHub Profile',
  career_goals: 'Career Goals',
  ai_analysis: 'AI Analysis',
  results: 'Your Results',
};

const STEP_DESCRIPTIONS: Record<OnboardingStep, string> = {
  welcome: 'Let\'s get started',
  linkedin_url: 'Your profile is the source of truth',
  upload_resume: 'Bring your experience',
  github_url: 'Show your work',
  career_goals: 'What are you working toward?',
  ai_analysis: 'AI is building your brand intelligence',
  results: 'Your personal brand strategy',
};

export function useOnboarding() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const isSignedIn = isAuthenticated;
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
    if (isLoading) return;

    async function loadState() {
      if (!isSignedIn || !user) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.onboarding.getState();
        if (data.state) {
          const step = data.state.currentStep || 'welcome';
          if (STEP_ORDER.includes(step as OnboardingStep)) {
            setCurrentStep(step as OnboardingStep);
          }
          setCompletedSteps((data.state.completedSteps || []).filter((s: string) => STEP_ORDER.includes(s as OnboardingStep)));
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
  }, [isLoading, isSignedIn, user]);

  const completeStep = useCallback(async (step: OnboardingStep, data?: any) => {
    try {
      switch (step) {
        case 'welcome':
          await api.onboarding.completeWelcome(data);
          break;
        case 'linkedin_url':
          if (data?.linkedinUrl) {
            await api.onboarding.saveLinkedInUrl(data.linkedinUrl);
          }
          break;
        case 'upload_resume':
          if (data) await api.onboarding.uploadResume(data.fileInfo, data.parsedData);
          break;
        case 'github_url':
          if (data?.githubUrl) {
            await api.onboarding.saveGithubUrl(data.githubUrl);
          }
          break;
        case 'career_goals':
          await api.onboarding.saveGoals(data?.goals || []);
          break;
        case 'ai_analysis':
          setIsAnalysisRunning(true);
          setAnalysisLog([]);
          setAnalysisProgress(0);
          break;
        default:
          break;
      }

      const newCompleted = [...completedSteps, step];
      setCompletedSteps(newCompleted);
      const pct = Math.round((newCompleted.length / totalSteps) * 100);
      setPercentage(pct);

      if (step !== 'ai_analysis') {
        const nextIdx = STEP_ORDER.indexOf(step) + 1;
        if (nextIdx < STEP_ORDER.length) {
          setCurrentStep(STEP_ORDER[nextIdx]);
        }
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

  const runAnalysis = useCallback(async () => {
    try {
      setAnalysisProgress(0);
      setAnalysisLog(['Starting analysis...']);

      const result = await api.onboarding.runAnalysis();

      setAnalysisProgress(100);
      setAnalysisLog(prev => [...prev, 'Analysis complete!']);
      setIsAnalysisRunning(false);
      setSummary(result);

      await api.onboarding.completeStep('ai_analysis', { summary: result });

      const newCompleted: OnboardingStep[] = [...completedSteps, 'ai_analysis'];
      setCompletedSteps(newCompleted);
      setPercentage(100);
      setCurrentStep('results');
      setOnboardingComplete(true);
    } catch (err: any) {
      setAnalysisLog(prev => [...prev, `Error: ${err.message}`]);
      setIsAnalysisRunning(false);
      setError(err.message);
    }
  }, [completedSteps]);

  const finishOnboarding = useCallback(async () => {
    try {
      await api.onboarding.markRedirected();
    } catch {
      // Silently handle
    }
    setOnboardingComplete(true);
    router.replace('/dashboard');
  }, [router]);

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
    isLoading,
    user,
    stepLabel: STEP_LABELS[currentStep],
    stepDescription: STEP_DESCRIPTIONS[currentStep],
    stepLabels: STEP_LABELS,
    stepDescriptions: STEP_DESCRIPTIONS,
    stepOrder: STEP_ORDER,
    setCurrentStep,
    completeStep,
    skipStep,
    runAnalysis,
    finishOnboarding,
  };
}
