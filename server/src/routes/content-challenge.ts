import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { LinkedInChallenge } from '../models/content-operations/LinkedInChallenge';
import { AnalysisReport } from '../models/analysis/AnalysisReport';
import { Post } from '../models/content-generation/Post';
import { QueueItem } from '../models/content-operations/QueueItem';
import { getAuthenticatedUserId } from '../utils/auth';
import { contentGenerationOrchestrator, GenerateInput } from '../services/content-generation/ContentGenerationOrchestrator';

const logger = pino({ name: 'content-challenge' });

const CONTENT_ROTATION = [
  { type: 'educational', label: 'Educational Post', pillars: ['Technical', 'Skills'] },
  { type: 'story', label: 'Career Story', pillars: ['Career Growth', 'Personal'] },
  { type: 'project_breakdown', label: 'Project Breakdown', pillars: ['Projects', 'Technical'] },
  { type: 'framework', label: 'Framework Post', pillars: ['Technical', 'Skills'] },
  { type: 'industry_commentary', label: 'Industry Insight', pillars: ['Industry', 'Trends'] },
  { type: 'career_lesson', label: 'Career Lesson', pillars: ['Career Growth', 'Lessons'] },
  { type: 'thought_leadership', label: 'Thought Leadership', pillars: ['Authority', 'Opinion'] },
  { type: 'open_source', label: 'Open Source Journey', pillars: ['Open Source', 'Technical'] },
  { type: 'personal', label: 'Personal Reflection', pillars: ['Personal', 'Growth'] },
  { type: 'tutorial', label: 'Technical Tutorial', pillars: ['Technical', 'Educational'] },
];

const DAY_CONTENT_MAP: Record<string, number[]> = {
  Monday: [0, 3, 6],
  Tuesday: [1, 4, 7],
  Wednesday: [2, 5, 8],
  Thursday: [0, 3, 9],
  Friday: [1, 6, 2],
  Saturday: [4, 7, 5],
  Sunday: [8, 1, 0],
};

const TIMEZONE_OFFSETS: Record<string, number> = {
  'America/New_York': -5, 'America/Chicago': -6, 'America/Denver': -7, 'America/Los_Angeles': -8,
  'Europe/London': 0, 'Europe/Paris': 1, 'Europe/Berlin': 1, 'Asia/Dubai': 4,
  'Asia/Kolkata': 5.5, 'Asia/Singapore': 8, 'Asia/Tokyo': 9, 'Australia/Sydney': 10,
  'UTC': 0,
};

export function createContentChallengeRouter(): Router {
  const router = Router();

  /* ─── Get challenge ─── */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const challenge = await LinkedInChallenge.findOne({
        userId: new mongoose.Types.ObjectId(userId),
      }).lean();

      if (!challenge) return res.json({ exists: false });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEntry = challenge.calendar?.find((c: any) => {
        const d = new Date(c.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });

      const upcomingEntries = challenge.calendar?.filter((c: any) => {
        const d = new Date(c.date);
        return d >= today && c.status !== 'published' && c.status !== 'rest';
      }).slice(0, 7) || [];

      const publishedCount = challenge.calendar?.filter((c: any) => c.status === 'published').length || 0;
      const scheduledCount = challenge.calendar?.filter((c: any) => c.status === 'scheduled').length || 0;
      const failedCount = challenge.calendar?.filter((c: any) => c.status === 'failed').length || 0;

      res.json({
        exists: true,
        ...challenge,
        todayEntry,
        upcomingEntries,
        publishedCount,
        scheduledCount,
        failedCount,
        daysRemaining: Math.max(0, challenge.totalDays - (challenge.currentDay || 0)),
        completionPct: Math.round(((challenge.currentDay || 0) / challenge.totalDays) * 100),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get challenge');
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Start challenge — pre-generate ALL 90 posts ─── */
  router.post('/start', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { topics, postsPerWeek, postingDays, postingTime, timezone, reviewMode, startDate: customStartDate } = req.body;
      if (!topics?.length) return res.status(400).json({ error: 'Select at least one topic' });
      if (!postingDays?.length) return res.status(400).json({ error: 'Select at least one posting day' });

      const uid = new mongoose.Types.ObjectId(userId);
      const report = await AnalysisReport.findOne({ userId: uid }).lean();
      if (!report) return res.status(400).json({ error: 'Complete LinkedIn Analysis first' });

      // Parse start date and time
      const startDate = customStartDate ? new Date(customStartDate) : new Date();
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 90);

      const tz = timezone || 'America/New_York';
      const time = postingTime || '09:00';
      const [hours, minutes] = time.split(':').map(Number);

      // Generate calendar with exact scheduled datetime for each posting day
      const calendar = generateCalendar(startDate, postingDays, postsPerWeek, topics, report, hours, minutes, tz);

      // Delete existing challenge
      await LinkedInChallenge.deleteOne({ userId: uid });

      // Create challenge with calendar
      const challenge = await LinkedInChallenge.create({
        userId: uid,
        status: 'active',
        topics,
        postsPerWeek: postsPerWeek || 3,
        postingDays,
        postingTime: time,
        timezone: tz,
        reviewMode: reviewMode || false,
        startDate,
        endDate,
        currentDay: 1,
        totalDays: 90,
        calendar,
        stats: { postsGenerated: 0, postsPublished: 0, postsFailed: 0, postsScheduled: 0, currentStreak: 0, longestStreak: 0, avgEngagement: 0, profileViews: 0, followerGrowth: 0 },
        generatedTopics: [],
        generatedHooks: [],
        generatedStructures: [],
      });

      logger.info({ userId, topics, postsPerWeek, postingDays, tz, time }, 'Challenge started — generating 90 posts in background');

      // Generate all 90 posts in background (non-blocking)
      generateAllChallengePosts(userId, report, challenge).catch(err => {
        logger.error({ error: err.message, userId }, 'Background generation failed');
      });

      res.json({
        success: true,
        challenge: {
          ...challenge.toObject(),
          _id: challenge._id,
        },
        message: 'Challenge started. Generating 90 posts — this takes a few minutes.',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to start challenge');
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Get challenge stats (for dashboard) ─── */
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const uid = new mongoose.Types.ObjectId(userId);
      const challenge = await LinkedInChallenge.findOne({ userId: uid }).lean();

      if (!challenge) {
        return res.json({
          exists: false,
          totalGenerated: 0, totalScheduled: 0, totalPublished: 0, totalFailed: 0,
          currentStreak: 0, longestStreak: 0, daysRemaining: 0, completionPct: 0,
        });
      }

      const cal = challenge.calendar || [];
      const totalGenerated = cal.filter((c: any) => c.status !== 'pending' && c.status !== 'rest').length;
      const totalScheduled = cal.filter((c: any) => c.status === 'scheduled').length;
      const totalPublished = cal.filter((c: any) => c.status === 'published').length;
      const totalFailed = cal.filter((c: any) => c.status === 'failed').length;
      const totalRest = cal.filter((c: any) => c.status === 'rest').length;

      // Calculate current streak
      const sortedPublished = cal
        .filter((c: any) => c.status === 'published')
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let currentStreak = 0;
      if (sortedPublished.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let checkDate = new Date(today);

        for (const entry of sortedPublished) {
          const entryDate = new Date(entry.date);
          entryDate.setHours(0, 0, 0, 0);
          if (entryDate.getTime() === checkDate.getTime()) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else if (entryDate.getTime() < checkDate.getTime()) {
            break;
          }
        }
      }

      // Get upcoming scheduled posts
      const now = new Date();
      const upcoming = cal
        .filter((c: any) => c.status === 'scheduled' && new Date(c.scheduledPublishAt || c.date) > now)
        .sort((a: any, b: any) => new Date(a.scheduledPublishAt || a.date).getTime() - new Date(b.scheduledPublishAt || b.date).getTime())
        .slice(0, 5);

      res.json({
        exists: true,
        status: challenge.status,
        totalDays: challenge.totalDays,
        currentDay: challenge.currentDay,
        totalGenerated,
        totalScheduled,
        totalPublished,
        totalFailed,
        totalRest,
        currentStreak,
        longestStreak: challenge.stats?.longestStreak || 0,
        daysRemaining: Math.max(0, challenge.totalDays - (challenge.currentDay || 0)),
        completionPct: Math.round(((challenge.currentDay || 0) / challenge.totalDays) * 100),
        upcoming,
        topics: challenge.topics,
        postingTime: challenge.postingTime,
        timezone: challenge.timezone,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get challenge stats');
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Generate a single post on-demand ─── */
  router.post('/generate-today', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const uid = new mongoose.Types.ObjectId(userId);
      const challenge = await LinkedInChallenge.findOne({ userId: uid });
      if (!challenge || challenge.status !== 'active') {
        return res.status(400).json({ error: 'No active challenge' });
      }

      const report = await AnalysisReport.findOne({ userId: uid }).lean();
      if (!report) return res.status(400).json({ error: 'Analysis report not found' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEntry = challenge.calendar.find((c: any) => {
        const d = new Date(c.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });

      if (!todayEntry) return res.status(400).json({ error: 'No content scheduled for today' });
      if (todayEntry.status === 'published') return res.status(400).json({ error: 'Today\'s content already published' });
      if (todayEntry.status === 'rest') return res.status(400).json({ error: 'Today is a rest day' });

      const result = await generateSinglePost(userId, report, challenge, todayEntry);
      if (result.success) {
        res.json({ success: true, post: result.post, topic: result.topic, status: todayEntry.status });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate today content');
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Batch generate posts ─── */
  router.post('/generate-batch', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { days } = req.body;
      const uid = new mongoose.Types.ObjectId(userId);
      const challenge = await LinkedInChallenge.findOne({ userId: uid });
      if (!challenge || challenge.status !== 'active') {
        return res.status(400).json({ error: 'No active challenge' });
      }

      const report = await AnalysisReport.findOne({ userId: uid }).lean();
      if (!report) return res.status(400).json({ error: 'Analysis report not found' });

      const pendingEntries = challenge.calendar
        .filter((c: any) => c.status === 'pending')
        .slice(0, days || 7);

      const results: any[] = [];
      for (const entry of pendingEntries) {
        const result = await generateSinglePost(userId, report, challenge, entry);
        results.push({ day: entry.day, topic: result.topic, status: entry.status, error: result.error });
      }

      await challenge.save();
      res.json({ success: true, results, generated: results.length });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to batch generate');
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Pause / Resume / Delete ─── */
  router.post('/pause', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      await LinkedInChallenge.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { status: 'paused' }
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/resume', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      await LinkedInChallenge.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId) },
        { status: 'active' }
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const uid = new mongoose.Types.ObjectId(userId);
      await LinkedInChallenge.deleteOne({ userId: uid });
      // Also clean up queue items
      await QueueItem.deleteMany({ userId: uid, stage: { $in: ['scheduled', 'draft_generated'] } });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════
   GENERATE ALL 90 POSTS (background, non-blocking)
   ═══════════════════════════════════════════════════════ */

async function generateAllChallengePosts(userId: string, report: any, challenge: any): Promise<void> {
  const uid = new mongoose.Types.ObjectId(userId);
  const li = report.linkedinAnalysis || {} as any;
  const rs = report.resumeAnalysis || {} as any;
  const allSkills = Array.from(new Set([...(li.skills || []), ...(rs.skills || [])]));
  const allProjects = [...(li.projects || []), ...(rs.projects || [])];
  const allCerts = [...(li.certifications || []), ...(rs.certifications || [])];
  const allExperience = [...(li.experience || []), ...(rs.experience || [])];

  let generated = 0;
  let failed = 0;

  for (const entry of challenge.calendar) {
    if (entry.status === 'rest') continue;
    if (entry.status === 'scheduled' || entry.status === 'published') continue;

    try {
      entry.status = 'generating';
      await challenge.save();

      const topic = generateUniqueTopic(entry.topic, entry.contentType, allSkills, allProjects, allCerts, allExperience, challenge.generatedTopics);
      const hook = generateUniqueHook(entry.contentType, topic, challenge.generatedHooks);
      const context = generateContext(entry.contentType, topic, allSkills, allProjects, allCerts, allExperience);

      const input: GenerateInput = {
        userId,
        topic,
        context,
        keyInsight: topic,
        contentType: entry.contentType as any,
        sourceType: 'strategy',
        sourceDescription: `90-Day Challenge Day ${entry.day}: ${entry.contentType}`,
        voiceProfile: {
          vocabularyRules: report.writingDNA?.vocabularyProfile?.technicalTerms || [],
          toneRules: [report.writingDNA?.toneProfile?.primary || 'Professional'],
          storytellingRules: ['personal story', 'lessons learned'],
          hookRules: [report.writingDNA?.hooks?.[0]?.text || 'Have you ever faced this challenge?'],
          ctaRules: [report.writingDNA?.ctas?.[0]?.text || 'What\'s your experience?'],
          communicationRules: [report.writingDNA?.communicationStyle || 'Clear and structured'],
        },
        brandProfile: {
          positioning: report.brandDNA?.positioning || '',
          audience: [report.brandDNA?.targetAudience || 'Fellow engineers'],
          expertise: report.brandDNA?.brandTerritory || [],
          authorityAreas: [],
          brandRules: [],
          brandVoice: '',
          targetIndustries: [],
          targetRoles: [],
        },
        careerGoals: (report.careerGoals || []).map((g: string) => ({ type: g, target: g, description: g, timeline: '90 days' })) as any,
        currentRole: rs.currentRole || '',
      };

      const result = await contentGenerationOrchestrator.generate(input);

      if (result.success && result.post) {
        // Update post with schedule date
        await Post.findByIdAndUpdate(result.post._id, {
          status: 'scheduled',
          scheduleDate: entry.scheduledPublishAt,
        });

        // Create QueueItem for AutoPublisher
        const queueItem = await QueueItem.create({
          userId: uid,
          postId: result.post._id,
          topic,
          hook,
          contentType: entry.contentType,
          pillar: entry.pillar,
          stage: 'scheduled',
          scheduledAt: entry.scheduledPublishAt,
          overallScore: (result.scores?.content as any)?.overall || 70,
          automationMode: 'autonomous',
        });

        entry.status = 'scheduled';
        entry.postId = result.post._id;
        entry.queueItemId = queueItem._id;
        entry.generatedAt = new Date();
        entry.topic = topic;
        entry.hook = hook;

        challenge.generatedTopics.push(topic);
        challenge.generatedHooks.push(hook);
        challenge.stats.postsGenerated++;
        challenge.stats.postsScheduled++;
        generated++;

        logger.info({ userId, day: entry.day, topic, scheduledAt: entry.scheduledPublishAt }, 'Challenge post generated');
      } else {
        entry.status = 'failed';
        entry.error = result.error || 'Generation failed';
        entry.retryCount = (entry.retryCount || 0) + 1;
        challenge.stats.postsFailed++;
        failed++;
      }
    } catch (err: any) {
      entry.status = 'failed';
      entry.error = err.message;
      entry.retryCount = (entry.retryCount || 0) + 1;
      challenge.stats.postsFailed++;
      failed++;
      logger.error({ error: err.message, day: entry.day }, 'Challenge post generation failed');
    }

    await challenge.save();
  }

  logger.info({ userId, generated, failed, total: challenge.calendar.length }, 'Challenge generation complete');
}

/* ═══════════════════════════════════════════════════════
   GENERATE SINGLE POST
   ═══════════════════════════════════════════════════════ */

async function generateSinglePost(userId: string, report: any, challenge: any, entry: any): Promise<{ success: boolean; post?: any; topic?: string; error?: string }> {
  const uid = new mongoose.Types.ObjectId(userId);
  const li = report.linkedinAnalysis || {} as any;
  const rs = report.resumeAnalysis || {} as any;
  const allSkills = Array.from(new Set([...(li.skills || []), ...(rs.skills || [])]));
  const allProjects = [...(li.projects || []), ...(rs.projects || [])];
  const allCerts = [...(li.certifications || []), ...(rs.certifications || [])];
  const allExperience = [...(li.experience || []), ...(rs.experience || [])];

  entry.status = 'generating';
  await challenge.save();

  try {
    const topic = generateUniqueTopic(entry.topic, entry.contentType, allSkills, allProjects, allCerts, allExperience, challenge.generatedTopics);
    const hook = generateUniqueHook(entry.contentType, topic, challenge.generatedHooks);
    const context = generateContext(entry.contentType, topic, allSkills, allProjects, allCerts, allExperience);

    const input: GenerateInput = {
      userId,
      topic,
      context,
      keyInsight: topic,
      contentType: entry.contentType as any,
      sourceType: 'strategy',
      sourceDescription: `90-Day Challenge Day ${entry.day}`,
      voiceProfile: {
        vocabularyRules: report.writingDNA?.vocabularyProfile?.technicalTerms || [],
        toneRules: [report.writingDNA?.toneProfile?.primary || 'Professional'],
        storytellingRules: ['personal story', 'lessons learned'],
        hookRules: [report.writingDNA?.hooks?.[0]?.text || 'Have you ever faced this challenge?'],
        ctaRules: [report.writingDNA?.ctas?.[0]?.text || 'What\'s your experience?'],
        communicationRules: [report.writingDNA?.communicationStyle || 'Clear and structured'],
      },
      brandProfile: {
        positioning: report.brandDNA?.positioning || '',
        audience: [report.brandDNA?.targetAudience || 'Fellow engineers'],
        expertise: report.brandDNA?.brandTerritory || [],
        authorityAreas: [],
        brandRules: [],
        brandVoice: '',
        targetIndustries: [],
        targetRoles: [],
      },
      careerGoals: (report.careerGoals || []).map((g: string) => ({ type: g, target: g, description: g, timeline: '90 days' })) as any,
      currentRole: rs.currentRole || '',
    };

    const result = await contentGenerationOrchestrator.generate(input);

    if (result.success && result.post) {
      await Post.findByIdAndUpdate(result.post._id, {
        status: 'scheduled',
        scheduleDate: entry.scheduledPublishAt,
      });

      const queueItem = await QueueItem.create({
        userId: uid,
        postId: result.post._id,
        topic,
        hook,
        contentType: entry.contentType,
        pillar: entry.pillar,
        stage: 'scheduled',
        scheduledAt: entry.scheduledPublishAt,
        overallScore: (result.scores?.content as any)?.overall || 70,
        automationMode: 'autonomous',
      });

      entry.status = 'scheduled';
      entry.postId = result.post._id;
      entry.queueItemId = queueItem._id;
      entry.generatedAt = new Date();
      entry.topic = topic;
      entry.hook = hook;

      challenge.generatedTopics.push(topic);
      challenge.generatedHooks.push(hook);
      challenge.stats.postsGenerated++;
      challenge.stats.postsScheduled++;

      await challenge.save();
      return { success: true, post: result.post, topic };
    } else {
      entry.status = 'failed';
      entry.error = result.error || 'Generation failed';
      entry.retryCount = (entry.retryCount || 0) + 1;
      challenge.stats.postsFailed++;
      await challenge.save();
      return { success: false, error: result.error || 'Generation failed' };
    }
  } catch (err: any) {
    entry.status = 'failed';
    entry.error = err.message;
    entry.retryCount = (entry.retryCount || 0) + 1;
    challenge.stats.postsFailed++;
    await challenge.save();
    return { success: false, error: err.message };
  }
}

/* ═══════════════════════════════════════════════════════
   CALENDAR GENERATION
   ═══════════════════════════════════════════════════════ */

function generateCalendar(
  startDate: Date, postingDays: string[], postsPerWeek: number,
  topics: string[], report: any, hours: number, minutes: number, tz: string
): any[] {
  const calendar: any[] = [];
  const li = report.linkedinAnalysis || {};
  const rs = report.resumeAnalysis || {};
  const allSkills = Array.from(new Set([...(li.skills || []), ...(rs.skills || [])]));
  const allProjects = [...(li.projects || []), ...(rs.projects || [])];

  const tzOffset = TIMEZONE_OFFSETS[tz] ?? 0;

  for (let day = 1; day <= 90; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day - 1);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

    if (!postingDays.includes(dayOfWeek)) {
      calendar.push({
        day, date, scheduledPublishAt: date, dayOfWeek,
        contentType: 'rest', pillar: '', topic: '', hook: '',
        status: 'rest', retryCount: 0,
      });
      continue;
    }

    // Calculate exact UTC publish time
    const scheduledPublishAt = new Date(date);
    scheduledPublishAt.setUTCHours(hours - tzOffset, minutes, 0, 0);

    const dayIdx = DAY_CONTENT_MAP[dayOfWeek] || [0];
    const contentIdx = dayIdx[day % dayIdx.length];
    const contentDef = CONTENT_ROTATION[contentIdx % CONTENT_ROTATION.length];

    const topicIdx = (day - 1) % topics.length;
    const skillIdx = (day - 1) % Math.max(allSkills.length, 1);
    const projectIdx = (day - 1) % Math.max(allProjects.length, 1);

    let topic = topics[topicIdx] || topics[0];
    if (contentDef.type === 'project_breakdown' && allProjects[projectIdx]) {
      topic = allProjects[projectIdx].name || allProjects[projectIdx].title || topic;
    } else if (allSkills[skillIdx] && Math.random() > 0.5) {
      topic = `${allSkills[skillIdx]} — ${topic}`;
    }

    calendar.push({
      day, date, scheduledPublishAt, dayOfWeek,
      contentType: contentDef.type,
      pillar: contentDef.pillars[0] || 'General',
      topic, hook: '',
      status: 'pending', retryCount: 0,
    });
  }

  return calendar;
}

/* ═══════════════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════════════ */

function generateUniqueTopic(suggestedTopic: string, contentType: string, skills: string[], projects: any[], certs: any[], experience: any[], usedTopics: string[]): string {
  const allOptions: string[] = [];
  skills.forEach(s => {
    allOptions.push(`${s} best practices`, `Lessons from ${s}`, `${s} tips for beginners`, `My ${s} journey`);
  });
  projects.forEach(p => {
    allOptions.push(`How I built ${p.name || p.title}`, `The story behind ${p.name || p.title}`, `${p.name || p.title} — lessons learned`);
  });
  certs.forEach(c => {
    allOptions.push(`Why I got certified in ${c.name || c}`, `What ${c.name || c} taught me`);
  });
  experience.forEach(e => {
    allOptions.push(`Lessons from being ${e.title}`, `What I learned at ${e.organization || 'my role'}`);
  });
  allOptions.push(
    `${suggestedTopic} — a fresh perspective`, `The truth about ${suggestedTopic}`,
    `What nobody tells you about ${suggestedTopic}`, `My honest review of ${suggestedTopic}`,
    `Why ${suggestedTopic} matters more than you think`, `The biggest mistake in ${suggestedTopic}`,
    `How ${suggestedTopic} changed my career`, `3 things I wish I knew about ${suggestedTopic}`,
  );
  const available = allOptions.filter(t => !usedTopics.includes(t));
  if (available.length === 0) return `${suggestedTopic} — new perspective`;
  return available[Math.floor(Math.random() * available.length)];
}

function generateUniqueHook(contentType: string, topic: string, usedHooks: string[]): string {
  const hooks = [
    `I spent 6 months learning about ${topic}. Here's what I found:`,
    `Most people get ${topic} wrong. Here's why:`,
    `The one thing about ${topic} that nobody talks about:`,
    `I made a huge mistake with ${topic}. Here's what happened:`,
    `Unpopular opinion: ${topic} is overrated. Here's why:`,
    `Here's what ${topic} taught me about life:`,
    `If you're learning ${topic}, read this first:`,
    `The hard truth about ${topic} that experienced developers know:`,
    `I used to hate ${topic}. Then something changed:`,
    `After 3 years of ${topic}, here's my honest take:`,
  ];
  const available = hooks.filter(h => !usedHooks.includes(h));
  if (available.length === 0) return `My latest thoughts on ${topic}`;
  return available[Math.floor(Math.random() * available.length)];
}

function generateContext(contentType: string, topic: string, skills: string[], projects: any[], certs: any[], experience: any[]): string {
  const skillList = skills.slice(0, 5).join(', ');
  const projectNames = projects.slice(0, 3).map((p: any) => p.name || p.title).join(', ');
  const role = experience[0]?.title || 'professional';
  return `I'm a ${role} with skills in ${skillList}. I've worked on projects like ${projectNames}. I want to share insights about ${topic} based on my real experience.`;
}
