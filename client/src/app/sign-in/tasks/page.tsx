import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';
import { Suspense } from 'react';

export default function SignInTasksPage() {
  return (
    <Suspense fallback={null}>
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/sign-in?success=true"
        signUpForceRedirectUrl="/sign-in?success=true"
      />
    </Suspense>
  );
}
