'use client';

import { Suspense } from 'react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthLoadingSequence } from '@/components/auth/AuthLoadingSequence';

function SSOCallbackContent() {
  return <AuthLoadingSequence onComplete={() => window.location.href = '/onboarding'} />;
}

export default function SSOCallbackPage() {
  return (
    <AuthLayout>
      <Suspense fallback={null}>
        <SSOCallbackContent />
      </Suspense>
    </AuthLayout>
  );
}
