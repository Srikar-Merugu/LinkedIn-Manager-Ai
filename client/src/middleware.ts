import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'personaos_token';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return new TextEncoder().encode(secret);
}

function isPublicRoute(pathname: string): boolean {
  const publicPatterns = [
    '/',
    '/sign-in',
    '/sign-up',
    '/sso-callback',
  ];
  return publicPatterns.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api');
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images') ||
    /\.(svg|png|jpg|jpeg|gif|webp)$/.test(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname) || isApiRoute(pathname)) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId as string);
    return response;
  } catch {
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('redirect_url', pathname);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
