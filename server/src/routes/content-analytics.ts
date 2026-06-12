import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { Post } from '../models/content-generation/Post';
import { QueueItem } from '../models/content-operations/QueueItem';
import { LinkedInChallenge } from '../models/content-operations/LinkedInChallenge';
import { AnalysisReport } from '../models/analysis/AnalysisReport';
import { getAuthenticatedUserId } from '../utils/auth';

const logger = pino({ name: 'content-analytics' });

export function createContentAnalyticsRouter(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const uid = new mongoose.Types.ObjectId(userId);

      const [posts, queueItems, challenge, report] = await Promise.all([
        Post.find({ userId: uid }).sort({ createdAt: -1 }).lean(),
        QueueItem.find({ userId: uid }).sort({ createdAt: -1 }).lean(),
        LinkedInChallenge.findOne({ userId: uid }).lean(),
        AnalysisReport.findOne({ userId: uid }).lean(),
      ]);

      const publishedPosts = posts.filter((p: any) => p.status === 'published');
      const scheduledPosts = posts.filter((p: any) => p.status === 'scheduled');
      const draftPosts = posts.filter((p: any) => p.status === 'draft');
      const approvedPosts = posts.filter((p: any) => p.status === 'approved');

      const allPosts = [...publishedPosts, ...scheduledPosts, ...draftPosts, ...approvedPosts];

      const consistency = calculateConsistency(publishedPosts);
      const publishingHistory = calculatePublishingHistory(publishedPosts);
      const topicDistribution = calculateTopicDistribution(allPosts);
      const streak = calculateStreak(publishedPosts);
      const publishingSuccess = calculatePublishingSuccess(posts, queueItems);
      const contentTrends = calculateContentTrends(publishedPosts);
      const recommendations = generateRecommendations(publishedPosts, queueItems, challenge, report);

      const challengeProgress = challenge ? {
        exists: true,
        status: challenge.status,
        currentDay: challenge.currentDay,
        totalDays: challenge.totalDays,
        completionPct: Math.round(((challenge.currentDay || 0) / challenge.totalDays) * 100),
        postsGenerated: challenge.stats?.postsGenerated || 0,
        postsPublished: challenge.stats?.postsPublished || 0,
        currentStreak: challenge.stats?.currentStreak || 0,
        longestStreak: challenge.stats?.longestStreak || 0,
        topics: challenge.topics || [],
      } : { exists: false };

      res.json({
        overview: {
          totalPosts: allPosts.length,
          publishedPosts: publishedPosts.length,
          scheduledPosts: scheduledPosts.length,
          draftPosts: draftPosts.length,
          approvedPosts: approvedPosts.length,
          avgScore: publishedPosts.length > 0
            ? Math.round(publishedPosts.reduce((sum: number, p: any) => sum + (p.overallScore || 0), 0) / publishedPosts.length)
            : 0,
        },
        consistency,
        publishingHistory,
        topicDistribution,
        streak,
        publishingSuccess,
        contentTrends,
        challengeProgress,
        recommendations,
        linkedinConnected: !!(report?.linkedinAnalysis?.connected),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get analytics');
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

function calculateConsistency(publishedPosts: any[]): any {
  if (publishedPosts.length === 0) {
    return { score: 0, label: 'No posts yet', weeklyAvg: 0, monthlyAvg: 0, totalWeeks: 0 };
  }

  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weeks = new Map<number, number>();

  publishedPosts.forEach((p: any) => {
    const postDate = new Date(p.publishedAt || p.createdAt);
    const weekNum = Math.floor((now.getTime() - postDate.getTime()) / weekMs);
    if (weekNum >= 0 && weekNum < 12) {
      weeks.set(weekNum, (weeks.get(weekNum) || 0) + 1);
    }
  });

  const weeksWithPosts = weeks.size;
  const totalWeeks = Math.min(12, Math.max(1, Math.ceil((now.getTime() - new Date(publishedPosts[publishedPosts.length - 1].publishedAt || publishedPosts[publishedPosts.length - 1].createdAt).getTime()) / weekMs)));
  const consistencyPct = Math.round((weeksWithPosts / totalWeeks) * 100);

  const weeklyAvg = publishedPosts.length / Math.max(1, totalWeeks);
  const monthlyAvg = weeklyAvg * 4;

  let label = 'Getting Started';
  if (consistencyPct >= 80) label = 'Highly Consistent';
  else if (consistencyPct >= 60) label = 'Consistent';
  else if (consistencyPct >= 40) label = 'Building Habits';
  else if (consistencyPct >= 20) label = 'Inconsistent';

  return { score: consistencyPct, label, weeklyAvg: Math.round(weeklyAvg * 10) / 10, monthlyAvg: Math.round(monthlyAvg), totalWeeks };
}

function calculatePublishingHistory(publishedPosts: any[]): any[] {
  const last30Days = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const count = publishedPosts.filter((p: any) => {
      const pd = new Date(p.publishedAt || p.createdAt);
      return pd >= date && pd < nextDate;
    }).length;

    last30Days.push({
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      count,
    });
  }

  return last30Days;
}

function calculateTopicDistribution(posts: any[]): any[] {
  const topics: Record<string, number> = {};

  posts.forEach((p: any) => {
    const topic = p.contentType || 'general';
    topics[topic] = (topics[topic] || 0) + 1;
  });

  const total = posts.length || 1;
  return Object.entries(topics)
    .map(([topic, count]) => ({
      topic: topic.replace(/_/g, ' '),
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function calculateStreak(publishedPosts: any[]): any {
  if (publishedPosts.length === 0) {
    return { current: 0, longest: 0, lastPostDate: null };
  }

  const sorted = [...publishedPosts].sort((a: any, b: any) =>
    new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime()
  );

  const lastPostDate = new Date(sorted[0].publishedAt || sorted[0].createdAt);
  const now = new Date();
  const daysSinceLastPost = Math.floor((now.getTime() - lastPostDate.getTime()) / (24 * 60 * 60 * 1000));

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate: Date | null = null;

  sorted.forEach((p: any) => {
    const pDate = new Date(p.publishedAt || p.createdAt);
    pDate.setHours(0, 0, 0, 0);

    if (!lastDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.floor((lastDate.getTime() - pDate.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays <= 2) {
        tempStreak++;
      } else {
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        tempStreak = 1;
      }
    }
    lastDate = pDate;
  });

  if (tempStreak > longestStreak) longestStreak = tempStreak;

  if (daysSinceLastPost <= 2) {
    currentStreak = tempStreak;
  }

  return {
    current: currentStreak,
    longest: longestStreak,
    lastPostDate: lastPostDate.toISOString(),
    daysSinceLastPost,
  };
}

function calculatePublishingSuccess(posts: any[], queueItems: any[]): any {
  const totalAttempts = posts.length + queueItems.length;
  const published = posts.filter((p: any) => p.status === 'published').length;
  const failed = queueItems.filter((q: any) => q.stage === 'failed').length;
  const scheduled = queueItems.filter((q: any) => q.stage === 'scheduled').length;

  return {
    totalAttempts,
    published,
    failed,
    scheduled,
    successRate: totalAttempts > 0 ? Math.round((published / totalAttempts) * 100) : 0,
  };
}

function calculateContentTrends(publishedPosts: any[]): any {
  if (publishedPosts.length < 2) {
    return { trend: 'insufficient_data', message: 'Publish more posts to see trends' };
  }

  const sorted = [...publishedPosts].sort((a: any, b: any) =>
    new Date(a.publishedAt || a.createdAt).getTime() - new Date(b.publishedAt || b.createdAt).getTime()
  );

  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const avgFirst = firstHalf.reduce((sum: number, p: any) => sum + (p.overallScore || 0), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum: number, p: any) => sum + (p.overallScore || 0), 0) / secondHalf.length;

  const scoreDiff = avgSecond - avgFirst;

  const freqFirst = firstHalf.length;
  const freqSecond = secondHalf.length;
  const freqDiff = freqSecond - freqFirst;

  let trend = 'stable';
  let message = 'Your content performance is consistent';

  if (scoreDiff > 5) { trend = 'improving'; message = 'Your content quality is improving over time'; }
  else if (scoreDiff < -5) { trend = 'declining'; message = 'Your content quality has dipped recently'; }

  if (freqDiff > 2) { trend = 'accelerating'; message = 'You are publishing more frequently'; }
  else if (freqDiff < -2) { trend = 'decelerating'; message = 'Your posting frequency has decreased'; }

  return { trend, message, scoreTrend: Math.round(scoreDiff), frequencyTrend: freqDiff };
}

function generateRecommendations(posts: any[], queue: any[], challenge: any, report: any): any[] {
  const recs: any[] = [];
  const published = posts.filter((p: any) => p.status === 'published');

  if (published.length === 0) {
    recs.push({ priority: 'high', title: 'Start posting', description: 'Publish your first post to begin building your presence', action: 'Go to Content Studio' });
  }

  if (published.length > 0 && published.length < 10) {
    recs.push({ priority: 'medium', title: 'Build consistency', description: `You have ${published.length} posts. Aim for 10+ to establish your presence`, action: 'Keep posting weekly' });
  }

  const types = new Set(published.map((p: any) => p.contentType));
  if (types.size < 3 && published.length >= 5) {
    recs.push({ priority: 'medium', title: 'Diversify content types', description: `You're using ${types.size} content type(s). Try different formats to keep your audience engaged`, action: 'Explore new content types' });
  }

  if (!challenge && published.length >= 3) {
    recs.push({ priority: 'low', title: 'Start a 90-Day Challenge', description: 'Automate your content pipeline with a structured challenge', action: 'Start Challenge' });
  }

  if (challenge && challenge.status === 'active') {
    const challengePublished = challenge.stats?.postsPublished || 0;
    const expected = challenge.currentDay || 0;
    if (challengePublished < expected * 0.7) {
      recs.push({ priority: 'high', title: 'Catch up on challenge', description: `You've published ${challengePublished} of ${expected} expected posts`, action: 'Generate pending posts' });
    }
  }

  if (published.length >= 10) {
    const avgScore = published.reduce((sum: number, p: any) => sum + (p.overallScore || 0), 0) / published.length;
    if (avgScore < 60) {
      recs.push({ priority: 'medium', title: 'Improve content quality', description: `Your average score is ${Math.round(avgScore)}/100. Focus on stronger hooks and clearer value`, action: 'Review top-performing posts' });
    }
  }

  const recentPosts = published.slice(0, 5);
  const daysBetween = recentPosts.length > 1
    ? (new Date(recentPosts[0].publishedAt || recentPosts[0].createdAt).getTime() - new Date(recentPosts[recentPosts.length - 1].publishedAt || recentPosts[recentPosts.length - 1].createdAt).getTime()) / (recentPosts.length - 1) / (24 * 60 * 60 * 1000)
    : 0;

  if (daysBetween > 7) {
    recs.push({ priority: 'high', title: 'Increase posting frequency', description: `You post every ${Math.round(daysBetween)} days on average. Aim for 3x per week`, action: 'Set a schedule' });
  }

  return recs.slice(0, 5);
}
