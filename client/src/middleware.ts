import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = [
  '/',
  '/api',
];

const authRoutes = [
  '/sign-in',
  '/sign-up',
];

const isPublicRoute = (pathname: string): boolean => {
  return publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
};

const isAuthRoute = (pathname: string): boolean => {
  return authRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  );
};

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = req.cookies.get('session')?.value;

  // For auth routes (sign-in, sign-up): if valid session exists, redirect to dashboard
  if (isAuthRoute(pathname)) {
    if (!sessionCookie) {
      return NextResponse.next();
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/me`, {
        headers: { Cookie: `session=${sessionCookie}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      }
    } catch {
      // Invalid session — let them stay on auth page
    }

    return NextResponse.next();
  }

  // For all other protected routes: require valid session
  if (!sessionCookie) {
    const signInUrl = new URL('/sign-up', req.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const onboardingMatch = pathname.startsWith('/onboarding');

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/me`, {
      headers: { Cookie: `session=${sessionCookie}` },
    });

    if (!res.ok) {
      const signInUrl = new URL('/sign-up', req.url);
      signInUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (onboardingMatch) {
      return NextResponse.next();
    }

    const data = await res.json();
    if (data.user) {
      try {
        const stateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/onboarding/state`, {
          headers: { Cookie: `session=${sessionCookie}` },
        });
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          if (stateData.state?.status !== 'completed' && stateData.state?.currentStep) {
            return NextResponse.redirect(new URL('/onboarding', req.url));
          }
        }
      } catch {
        // Allow through if onboarding state check fails
      }
    }

    return NextResponse.next();
  } catch {
    const signInUrl = new URL('/sign-up', req.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
