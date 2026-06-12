import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { getAuthenticatedUserId } from '../utils/auth';
import { AnalysisReport } from '../models/analysis/AnalysisReport';
import { Post } from '../models/content-generation/Post';
import { QueueItem } from '../models/content-operations/QueueItem';
import { ContentCalendar } from '../models/strategy/ContentCalendar';

const logger = pino({ name: 'dashboard-route' });

function getUserId(req: Request): string | null {
  return getAuthenticatedUserId(req);
}

function calculateStreak(publishedDates: Date[]): { current: number; longest: number; lastPublished: Date | null } {
  if (publishedDates.length === 0) {
    return { current: 0, longest: 0, lastPublished: null };
  }

  const sorted = [...publishedDates]
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  const lastPublished = sorted[0];

  const dayMs = 24 * 60 * 60 * 1000;
  const uniqueDays = [...new Set(sorted.map(d => {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r.getTime();
  }))].sort((a, b) => b - a);

  let current = 1;
  let longest = 1;
  let streak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today.getTime() - dayMs);

  const latestDay = new Date(uniqueDays[0]);
  latestDay.setHours(0, 0, 0, 0);

  if (latestDay.getTime() !== today.getTime() && latestDay.getTime() !== yesterday.getTime()) {
    current = 0;
  }

  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = (uniqueDays[i - 1] - uniqueDays[i]) / dayMs;
    if (diff === 1) {
      streak++;
    } else {
      if (i === 1 && current > 0) {
        current = streak;
      }
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }

  if (current === 0 && streak > 1) {
    current = 0;
  } else if (current > 0) {
    current = Math.max(current, streak);
  }

  longest = Math.max(longest, streak, current);

  return { current, longest, lastPublished };
}

function generateQuickWins(report: any, postsCount: number, scheduledCount: number): any[] {
  const wins: any[] = [];
  const linkedin = report?.linkedinAnalysis;
  const github = report?.githubAnalysis;
  const resume = report?.resumeAnalysis;

  if (linkedin) {
    if (!linkedin.headline || linkedin.headline.length < 10) {
      wins.push({
        title: 'Optimize LinkedIn Headline',
        reason: 'Your headline is missing or too short. A strong headline increases profile views by 40%.',
        priority: 'high',
        impact: 'Increase profile visibility and connection requests',
        effort: '15 mins',
        category: 'profile',
      });
    }
    if (!linkedin.about || linkedin.about.length < 50) {
      wins.push({
        title: 'Complete About Section',
        reason: 'Your About section is empty or too short. This is prime real estate for your story.',
        priority: 'high',
        impact: 'Improve profile completeness and search ranking',
        effort: '30 mins',
        category: 'profile',
      });
    }
    if (!linkedin.skills || linkedin.skills.length < 5) {
      wins.push({
        title: 'Add More Skills',
        reason: `You only have ${linkedin.skills?.length || 0} skills listed. Aim for at least 10 relevant skills.`,
        priority: 'medium',
        impact: 'Appear in more skill-based searches',
        effort: '10 mins',
        category: 'profile',
      });
    }
    if (!linkedin.experience || linkedin.experience.length === 0) {
      wins.push({
        title: 'Add Work Experience',
        reason: 'No experience listed on your LinkedIn profile.',
        priority: 'high',
        impact: 'Establish professional credibility',
        effort: '20 mins',
        category: 'profile',
      });
    }
  }

  if (github) {
    if (github.repos < 3) {
      wins.push({
        title: 'Add More GitHub Projects',
        reason: `Your GitHub has only ${github.repos} repos. Public projects boost technical credibility.`,
        priority: 'high',
        impact: 'Increase technical authority and trust',
        effort: '1 hour',
        category: 'technical',
      });
    }
    if (!github.connected) {
      wins.push({
        title: 'Connect GitHub Account',
        reason: 'GitHub not connected. Linking it provides AI with your technical profile.',
        priority: 'medium',
        impact: 'Enable AI-powered technical content suggestions',
        effort: '5 mins',
        category: 'technical',
      });
    }
  }

  if (resume) {
    if (!resume.certifications || resume.certifications.length === 0) {
      wins.push({
        title: 'Add Certifications',
        reason: 'No certifications found. Certifications validate your expertise.',
        priority: 'medium',
        impact: 'Strengthen authority and trust signals',
        effort: '20 mins',
        category: 'credentials',
      });
    }
    if (!resume.projects || resume.projects.length === 0) {
      wins.push({
        title: 'Showcase Projects',
        reason: 'No projects listed in your resume. Projects demonstrate hands-on experience.',
        priority: 'medium',
        impact: 'Demonstrate practical skills and initiative',
        effort: '30 mins',
        category: 'credentials',
      });
    }
  }

  if (postsCount === 0) {
    wins.push({
      title: 'Publish Your First Post',
      reason: 'You haven\'t published any content yet. Consistency starts with the first post.',
      priority: 'high',
      impact: 'Begin building your LinkedIn presence',
      effort: '30 mins',
      category: 'content',
    });
  } else if (postsCount < 5) {
    wins.push({
      title: 'Increase Posting Frequency',
      reason: `You've published ${postsCount} posts. Aim for 3 posts per week for consistent growth.`,
      priority: 'medium',
      impact: 'Improve algorithm visibility and engagement',
      effort: '1 hour/week',
      category: 'content',
    });
  }

  if (scheduledCount === 0 && postsCount > 0) {
    wins.push({
      title: 'Schedule Your Next Posts',
      reason: 'No posts scheduled. Planning ahead maintains consistency.',
      priority: 'high',
      impact: 'Ensure consistent content pipeline',
      effort: '15 mins',
      category: 'content',
    });
  }

  if (report?.brandDNA && !report.brandDNA.positioning) {
    wins.push({
      title: 'Define Brand Positioning',
      reason: 'Your brand positioning is not defined. Clear positioning differentiates you.',
      priority: 'medium',
      impact: 'Create a consistent and recognizable brand',
      effort: '30 mins',
      category: 'brand',
    });
  }

  return wins.slice(0, 8);
}

function calculateContentHealthScore(posts: any[], calendarEntries: any[], queueItems: any[]): number {
  let score = 0;

  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);

  const postsThisWeek = posts.filter(p =>
    p.status === 'published' && p.publishedAt && new Date(p.publishedAt) >= thisWeekStart
  ).length;
  score += Math.min(postsThisWeek * 15, 30);

  const upcomingCalendar = calendarEntries.filter(e => new Date(e.date) >= now).length;
  if (upcomingCalendar >= 5) score += 25;
  else if (upcomingCalendar >= 3) score += 15;
  else if (upcomingCalendar >= 1) score += 10;

  const draftCount = queueItems.filter(q => q.stage === 'draft_generated' || q.stage === 'ready').length;
  const approvedCount = queueItems.filter(q => q.stage === 'approved' || q.stage === 'scheduled').length;
  if (approvedCount > 0) score += 25;
  else if (draftCount > 0) score += 15;

  const publishedTotal = posts.filter(p => p.status === 'published').length;
  if (publishedTotal >= 10) score += 20;
  else if (publishedTotal >= 5) score += 15;
  else if (publishedTotal >= 1) score += 10;

  return Math.min(score, 100);
}

export function createDashboardRouter(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const oid = new mongoose.Types.ObjectId(userId);

      const [report, posts, queueItems, calendarEntries] = await Promise.all([
        AnalysisReport.findOne({ userId: oid }).lean(),
        Post.find({ userId: oid }).sort({ createdAt: -1 }).lean(),
        QueueItem.find({ userId: oid }).sort({ createdAt: -1 }).lean(),
        ContentCalendar.find({ userId: oid }).sort({ date: 1 }).lean(),
      ]);

      if (!report) {
        return res.json({ hasReport: false });
      }

      const publishedPosts = posts.filter(p => p.status === 'published');
      const publishedDates = publishedPosts
        .map(p => p.publishedAt || p.scheduleDate || p.createdAt)
        .filter(Boolean);

      const streak = calculateStreak(publishedDates);

      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const publishedThisWeek = publishedPosts.filter(p =>
        p.publishedAt && new Date(p.publishedAt) >= thisWeekStart
      ).length;
      const publishedThisMonth = publishedPosts.filter(p =>
        p.publishedAt && new Date(p.publishedAt) >= thisMonthStart
      ).length;

      const scheduledPosts = posts
        .filter(p => p.status === 'scheduled' && p.scheduleDate && new Date(p.scheduleDate) >= now)
        .sort((a, b) => new Date(a.scheduleDate!).getTime() - new Date(b.scheduleDate!).getTime())
        .slice(0, 5);

      const draftPosts = posts.filter(p => p.status === 'draft' || p.status === 'review');

      const failedPosts = posts.filter(p => p.status === 'archived');

      const upcomingCalendar = calendarEntries
        .filter(e => new Date(e.date) >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      const scores = report.scores || {};
      const overallScore = Math.round(
        ((scores.technicalLeadership || 0) +
          (scores.contentReadiness || 0) +
          (scores.industryAuthority || 0) +
          (scores.personalBrand || 0) +
          (scores.careerOpportunity || 0)) / 5
      );

      const quickWins = generateQuickWins(report, publishedPosts.length, posts.filter(p => p.status === 'scheduled').length);

      const contentHealthScore = calculateContentHealthScore(posts, calendarEntries, queueItems);

      const postsThisWeek = publishedPosts.filter(p =>
        p.publishedAt && new Date(p.publishedAt) >= thisWeekStart
      ).length;
      const postsLastWeekStart = new Date(thisWeekStart);
      postsLastWeekStart.setDate(postsLastWeekStart.getDate() - 7);
      const postsLastWeek = publishedPosts.filter(p =>
        p.publishedAt && new Date(p.publishedAt) >= postsLastWeekStart && new Date(p.publishedAt) < thisWeekStart
      ).length;

      const monthlyGoal = 12;
      const monthlyProgress = publishedPosts.filter(p =>
        p.publishedAt && new Date(p.publishedAt) >= thisMonthStart
      ).length;
      const streakGoal = 7;

      res.json({
        hasReport: true,
        overallScore,
        scores: report.scores,
        streak,
        published: {
          thisWeek: publishedThisWeek,
          thisMonth: publishedThisMonth,
          total: publishedPosts.length,
          scheduled: posts.filter(p => p.status === 'scheduled').length,
          drafts: draftPosts.length,
          failed: failedPosts.length,
        },
        upcomingPosts: scheduledPosts.map(p => ({
          _id: p._id,
          title: p.title || p.hook?.slice(0, 50) || 'Untitled',
          scheduledDate: p.scheduleDate,
          contentType: p.contentType,
          status: p.status,
          overallScore: p.overallScore,
        })),
        upcomingCalendar: upcomingCalendar.map(e => ({
          _id: e._id,
          date: e.date,
          topic: e.topic,
          pillarName: e.pillarName,
          status: e.status,
          hook: e.hook,
        })),
        publishingQueue: queueItems.slice(0, 5).map(q => ({
          _id: q._id,
          title: q.title || q.topic || q.hook?.slice(0, 50) || 'Untitled',
          stage: q.stage,
          scheduledAt: q.scheduledAt,
          overallScore: q.overallScore,
          contentType: q.contentType,
        })),
        quickWins,
        contentHealthScore,
        consistency: {
          postsThisWeek,
          postsLastWeek,
          recommendedFrequency: report.strategy90Days?.recommendedFrequency || '3x per week',
          trend: postsThisWeek > postsLastWeek ? 'improving' : postsThisWeek < postsLastWeek ? 'declining' : 'stable',
        },
        goals: [
          {
            title: `Post ${monthlyGoal} times this month`,
            current: monthlyProgress,
            target: monthlyGoal,
            completed: monthlyProgress >= monthlyGoal,
          },
          {
            title: `Maintain ${streakGoal}-day streak`,
            current: Math.min(streak.current, streakGoal),
            target: streakGoal,
            completed: streak.current >= streakGoal,
          },
          {
            title: 'Generate 30-day calendar',
            current: calendarEntries.length > 0 ? 1 : 0,
            target: 1,
            completed: calendarEntries.length > 0,
          },
        ],
        activity: [
          ...(report.linkedinAnalysis?.connected ? [{ type: 'linkedin_connected', label: 'LinkedIn connected', timestamp: report.updatedAt }] : []),
          ...(report.githubAnalysis?.connected ? [{ type: 'github_connected', label: 'GitHub connected', timestamp: report.updatedAt }] : []),
          ...(publishedPosts.length > 0 ? [{ type: 'post_published', label: `${publishedPosts.length} posts published`, timestamp: publishedPosts[0]?.publishedAt }] : []),
          ...(posts.filter(p => p.status === 'scheduled').length > 0 ? [{ type: 'post_scheduled', label: `${posts.filter(p => p.status === 'scheduled').length} posts scheduled`, timestamp: now }] : []),
          ...(calendarEntries.length > 0 ? [{ type: 'calendar_generated', label: 'Content calendar generated', timestamp: report.updatedAt }] : []),
        ].sort((a, b) => new Date(b.timestamp as any).getTime() - new Date(a.timestamp as any).getTime()).slice(0, 5),
        bestDay: report.dashboardMetrics?.bestDay || report.strategy90Days?.weeklyThemes?.[0]?.contentTypes?.[0] || null,
        bestTime: '9 AM',
        linkedinAnalysis: report.linkedinAnalysis ? {
          connected: report.linkedinAnalysis.connected,
          headline: report.linkedinAnalysis.headline,
          skills: report.linkedinAnalysis.skills?.length || 0,
          experience: report.linkedinAnalysis.experience?.length || 0,
        } : null,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get dashboard data');
      res.status(500).json({ error: error.message || 'Failed to get dashboard data' });
    }
  });

  return router;
}
