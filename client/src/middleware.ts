import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
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

  const session = await auth();
  const metadata = (session.sessionClaims as any)?.metadata;
  if (metadata?.onboardingComplete === true) return;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/state`, {
      headers: { 'x-clerk-user-id': userId },
    });
    console.log(`[Middleware] onboarding state fetched: ${res.status}`);
    if (res.ok) {
      const data = await res.json();
      console.log(`[Middleware] state data:`, JSON.stringify(data));
      if (data.state?.status !== 'completed' && data.state?.currentStep) {
        console.log(`[Middleware] REDIRECT -> /onboarding (status=${data.state?.status}, step=${data.state?.currentStep})`);
        return Response.redirect(new URL('/onboarding', req.url));
      }
      console.log(`[Middleware] ALLOW through to ${req.url} (status=${data.state?.status})`);
    }
  } catch (e) {
    console.log(`[Middleware] error fetching state, allowing through:`, e);
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
