import { Request } from 'express';
import { getTokenFromReq, verifyToken } from '../utils/jwt';

/**
 * Extract authenticated userId from request using JWT.
 * Works with both cookie-based and Bearer token auth.
 * Returns null if not authenticated.
 */
export function getAuthenticatedUserId(req: Request): string | null {
  const token = getTokenFromReq(req);
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.userId || null;
}

/**
 * Extract authenticated userId from request, or throw 401.
 * Use in route handlers that require authentication.
 */
export function requireAuth(req: Request): string {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    throw new Error('AUTH_REQUIRED');
  }
  return userId;
}
