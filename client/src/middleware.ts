import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/api(.*)',
]);

const isOnboardingRoute = createRouteMatcher([
  '/onboarding(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  if (isOnboardingRoute(req)) return;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/onboarding/state`, {
      headers: { 'x-clerk-user-id': userId },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.state?.status !== 'completed' && data.state?.currentStep) {
        return Response.redirect(new URL('/onboarding', req.url));
      }
    }
  } catch {
    // Allow through if onboarding state check fails
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
