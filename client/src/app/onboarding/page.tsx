'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { ConnectLinkedInStep } from '@/components/onboarding/ConnectLinkedInStep';
import { UploadResumeStep } from '@/components/onboarding/UploadResumeStep';
import { ConnectGitHubStep } from '@/components/onboarding/ConnectGitHubStep';
import { ConnectPortfolioStep } from '@/components/onboarding/ConnectPortfolioStep';
import { CareerGoalsStep } from '@/components/onboarding/CareerGoalsStep';
import { ContentExperienceStep } from '@/components/onboarding/ContentExperienceStep';
import { VoiceTrainingStep } from '@/components/onboarding/VoiceTrainingStep';
import { AIAnalysisStep } from '@/components/onboarding/AIAnalysisStep';
import { ResultsStep } from '@/components/onboarding/ResultsStep';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Loader2, AlertCircle } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const isSignedIn = isAuthenticated;
  const {
    currentStep, currentStepIndex, percentage, totalSteps,
    loading, error, isAnalysisRunning, analysisProgress, analysisLog,
    onboardingComplete, summary, stepLabel, stepDescription,
    completeStep, skipStep, updateAnalysis, finishOnboarding, refreshSummary,
    setCurrentStep,
  } = useOnboarding();

  useEffect(() => {
    if (currentStep === 'ai_analysis' && analysisProgress >= 100) {
      const t = setTimeout(() => setCurrentStep('results'), 500);
      return () => clearTimeout(t);
    }
  }, [currentStep, analysisProgress, setCurrentStep]);

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeScreen onComplete={() => completeStep('welcome')} />;

      case 'connect_linkedin':
        return (
          <ConnectLinkedInStep
            onComplete={(data) => completeStep('connect_linkedin', data)}
            onSkip={() => skipStep('connect_linkedin')}
          />
        );

      case 'upload_resume':
        return (
          <UploadResumeStep
            onComplete={(data) => completeStep('upload_resume', data)}
            onSkip={() => skipStep('upload_resume')}
          />
        );

      case 'connect_github':
        return (
          <ConnectGitHubStep
            onComplete={(data) => completeStep('connect_github', data)}
            onSkip={() => skipStep('connect_github')}
          />
        );

      case 'connect_portfolio':
        return (
          <ConnectPortfolioStep
            onComplete={(data) => completeStep('connect_portfolio', data)}
            onSkip={() => skipStep('connect_portfolio')}
          />
        );

      case 'career_goals':
        return <CareerGoalsStep onComplete={(data) => completeStep('career_goals', data)} />;

      case 'content_experience':
        return <ContentExperienceStep onComplete={(data) => completeStep('content_experience', data)} />;

      case 'voice_training':
        return (
          <VoiceTrainingStep
            onComplete={(data) => completeStep('voice_training', data)}
            onSkip={() => skipStep('voice_training')}
          />
        );

      case 'ai_analysis':
        return (
          <AIAnalysisStep
            progress={analysisProgress}
            log={analysisLog}
            onProgressUpdate={updateAnalysis}
            onComplete={() => {
              completeStep('ai_analysis');
              refreshSummary();
            }}
          />
        );

      case 'results':
        return <ResultsStep summary={summary} onFinish={finishOnboarding} />;

      default:
        return <WelcomeScreen onComplete={() => completeStep('welcome')} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-surface-100 mb-2">Something went wrong</h2>
          <p className="text-surface-400 mb-6">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-400 animate-spin mx-auto mb-4" />
          <p className="text-surface-400">Resuming your onboarding...</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingLayout
      currentStep={currentStep}
      currentStepIndex={currentStepIndex}
      totalSteps={totalSteps}
      percentage={percentage}
      stepLabel={stepLabel}
      stepDescription={stepDescription}
    >
      {renderStep()}
    </OnboardingLayout>
  );
}
