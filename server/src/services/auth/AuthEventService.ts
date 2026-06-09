import pino from 'pino';
import { AuthEvent } from '../../models/auth/AuthEvent';
import { UserSession } from '../../models/auth/UserSession';
import { LoginHistory } from '../../models/auth/LoginHistory';
import { SecurityLog } from '../../models/auth/SecurityLog';
import { ConnectedAccount } from '../../models/auth/ConnectedAccount';
import { UserPreferences } from '../../models/auth/UserPreferences';
import type { WebhookEvent } from '@clerk/backend';

const logger = pino();

export class AuthEventService {
  async logAuthEvent(params: {
    userId?: string;
    clerkId?: string;
    eventType: IAuthEventType;
    provider: IAuthProvider;
    ip: string;
    userAgent: string;
    success: boolean;
    sessionId?: string;
    error?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await AuthEvent.create({
        userId: params.userId,
        clerkId: params.clerkId,
        eventType: params.eventType,
        provider: params.provider,
        ip: params.ip,
        userAgent: params.userAgent,
        success: params.success,
        sessionId: params.sessionId,
        error: params.error,
        metadata: params.metadata || {},
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to log auth event');
    }
  }

  async logLoginHistory(params: {
    userId?: string;
    clerkId?: string;
    provider: ILoginProvider;
    ip: string;
    userAgent: string;
    success: boolean;
    failureReason?: string;
    sessionId?: string;
  }): Promise<void> {
    try {
      await LoginHistory.create({
        userId: params.userId,
        clerkId: params.clerkId,
        provider: params.provider,
        ip: params.ip,
        userAgent: params.userAgent,
        success: params.success,
        failureReason: params.failureReason,
        sessionId: params.sessionId,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to log login history');
    }
  }

  async logSecurityEvent(params: {
    userId?: string;
    clerkId?: string;
    eventType: ISecurityEventType;
    severity: ISecuritySeverity;
    ip: string;
    userAgent: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    try {
      await SecurityLog.create({
        userId: params.userId,
        clerkId: params.clerkId,
        eventType: params.eventType,
        severity: params.severity,
        ip: params.ip,
        userAgent: params.userAgent,
        details: params.details,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error({ error }, 'Failed to log security event');
    }
  }

  async trackSession(params: {
    userId: string;
    clerkId: string;
    clerkSessionId: string;
    ip: string;
    userAgent: string;
    device?: Record<string, string>;
  }): Promise<void> {
    try {
      await UserSession.findOneAndUpdate(
        { clerkSessionId: params.clerkSessionId },
        {
          userId: params.userId,
          clerkId: params.clerkId,
          clerkSessionId: params.clerkSessionId,
          ip: params.ip,
          userAgent: params.userAgent,
          device: {
            type: params.device?.type || 'unknown',
            os: params.device?.os || 'unknown',
            browser: params.device?.browser || 'unknown',
            fingerprint: params.device?.fingerprint,
          },
          isActive: true,
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      logger.error({ error }, 'Failed to track session');
    }
  }

  async endSession(clerkSessionId: string): Promise<void> {
    try {
      await UserSession.findOneAndUpdate(
        { clerkSessionId },
        { isActive: false, lastActiveAt: new Date() }
      );
    } catch (error) {
      logger.error({ error }, 'Failed to end session');
    }
  }

  async endAllSessions(userId: string): Promise<number> {
    const result = await UserSession.updateMany(
      { userId, isActive: true },
      { isActive: false, lastActiveAt: new Date() }
    );
    return result.modifiedCount;
  }

  async getActiveSessions(userId: string): Promise<typeof UserSession[]> {
    return UserSession.find({ userId, isActive: true })
      .sort({ lastActiveAt: -1 })
      .lean() as any;
  }

  async getLoginHistory(userId: string, limit = 20): Promise<typeof LoginHistory[]> {
    return LoginHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean() as any;
  }

  async getSecurityLogs(userId: string, limit = 20): Promise<typeof SecurityLog[]> {
    return SecurityLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean() as any;
  }

  async detectSuspiciousActivity(params: {
    userId: string;
    ip: string;
    userAgent: string;
  }): Promise<boolean> {
    const recentLogins = await LoginHistory.find({
      userId: params.userId,
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      success: true,
    }).lean();

    if (recentLogins.length === 0) return false;

    const knownIps = new Set(recentLogins.map((l: any) => l.ip));
    if (!knownIps.has(params.ip)) {
      await this.logSecurityEvent({
        userId: params.userId,
        eventType: 'new_location',
        severity: 'medium',
        ip: params.ip,
        userAgent: params.userAgent,
        details: { knownIps: Array.from(knownIps), message: 'Login from new IP address' },
      });
      return true;
    }

    return false;
  }

  async initializeUserPreferences(clerkId: string, userId: string): Promise<void> {
    const existing = await UserPreferences.findOne({ userId });
    if (existing) return;

    await UserPreferences.create({
      userId,
      clerkId,
    });
  }

  async getAuthAnalytics(days = 30): Promise<Record<string, unknown>> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [totalEvents, successfulLogins, failedLogins, providerBreakdown, dailyStats] = await Promise.all([
      AuthEvent.countDocuments({ timestamp: { $gte: since } }),
      AuthEvent.countDocuments({ timestamp: { $gte: since }, eventType: 'login', success: true }),
      AuthEvent.countDocuments({ timestamp: { $gte: since }, eventType: 'login', success: false }),
      AuthEvent.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$provider', count: { $sum: 1 } } },
      ]),
      AuthEvent.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, count: { $sum: 1 }, successCount: { $sum: { $cond: ['$success', 1, 0] } } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return {
      totalEvents,
      successfulLogins,
      failedLogins,
      successRate: totalEvents > 0 ? (successfulLogins / totalEvents) * 100 : 0,
      providerBreakdown,
      dailyStats,
      period: `${days}d`,
    };
  }
}

type IAuthEventType = 'login' | 'logout' | 'signup' | 'oauth_linkedin' | 'oauth_google' | 'oauth_github' | 'email_otp' | 'email_magiclink' | 'session_created' | 'session_removed' | 'account_linked' | 'account_unlinked' | 'password_reset_requested' | 'email_verified' | 'suspicious_login' | 'login_failed';
type IAuthProvider = 'linkedin' | 'google' | 'github' | 'email' | 'unknown';
type ILoginProvider = 'linkedin' | 'google' | 'github' | 'email';
type ISecurityEventType = 'suspicious_login' | 'failed_login_attempt' | 'new_device' | 'new_location' | 'multiple_failed_attempts' | 'session_hijack_attempt' | 'unauthorized_access' | 'rate_limit_exceeded' | 'csrf_validation_failed' | 'token_expired' | 'account_deleted' | 'privacy_settings_changed' | 'data_export_requested';
type ISecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export const authEventService = new AuthEventService();
