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

export function createContentChallengeRouter(): Router {
  const router = Router();

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
        return d >= today && c.status !== 'published';
      }).slice(0, 7) || [];

      const publishedCount = challenge.calendar?.filter((c: any) => c.status === 'published').length || 0;

      res.json({
        exists: true,
        ...challenge,
        todayEntry,
        upcomingEntries,
        publishedCount,
        daysRemaining: Math.max(0, challenge.totalDays - (challenge.currentDay || 0)),
        completionPct: Math.round(((challenge.currentDay || 0) / challenge.totalDays) * 100),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get challenge');
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/start', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { topics, postsPerWeek, postingDays, postingTime, reviewMode } = req.body;
      if (!topics?.length) return res.status(400).json({ error: 'Select at least one topic' });
      if (!postingDays?.length) return res.status(400).json({ error: 'Select at least one posting day' });

      const uid = new mongoose.Types.ObjectId(userId);
      const report = await AnalysisReport.findOne({ userId: uid }).lean();
      if (!report) return res.status(400).json({ error: 'Complete LinkedIn Analysis first' });

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 90);

      const calendar = generateCalendar(startDate, postingDays, postsPerWeek, topics, report);

      const challenge = await LinkedInChallenge.findOneAndUpdate(
        { userId: uid },
        {
          userId: uid,
          status: 'active',
          topics,
          postsPerWeek: postsPerWeek || 3,
          postingDays,
          postingTime: postingTime || '09:00',
          reviewMode: reviewMode || false,
          startDate,
          endDate,
          currentDay: 1,
          totalDays: 90,
          calendar,
          stats: { postsGenerated: 0, postsPublished: 0, postsFailed: 0, currentStreak: 0, longestStreak: 0, avgEngagement: 0, profileViews: 0, followerGrowth: 0 },
          generatedTopics: [],
          generatedHooks: [],
          generatedStructures: [],
        },
        { upsert: true, new: true }
      );

      logger.info({ userId, topics, postsPerWeek, postingDays }, 'Challenge started');
      res.json({ success: true, challenge });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to start challenge');
      res.status(500).json({ error: error.message });
    }
  });

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

      if (!todayEntry) {
        return res.status(400).json({ error: 'No content scheduled for today' });
      }

      if (todayEntry.status === 'published') {
        return res.status(400).json({ error: 'Today\'s content already published' });
      }

      todayEntry.status = 'generating';
      await challenge.save();

      try {
        const li = report.linkedinAnalysis || {} as any;
        const rs = report.resumeAnalysis || {} as any;
        const gh = report.githubAnalysis || {} as any;
        const allSkills = Array.from(new Set([...(li.skills || []), ...(rs.skills || [])]));
        const allProjects = [...(li.projects || []), ...(rs.projects || [])];
        const allCerts = [...(li.certifications || []), ...(rs.certifications || [])];
        const allExperience = [...(li.experience || []), ...(rs.experience || [])];

        const usedTopics = challenge.generatedTopics || [];
        const usedHooks = challenge.generatedHooks || [];

        const topic = generateUniqueTopic(todayEntry.topic, todayEntry.contentType, allSkills, allProjects, allCerts, allExperience, usedTopics);
        const hook = generateUniqueHook(todayEntry.contentType, topic, usedHooks);
        const context = generateContext(todayEntry.contentType, topic, allSkills, allProjects, allCerts, allExperience);

        const input: GenerateInput = {
          userId,
          topic,
          context,
          keyInsight: topic,
          contentType: todayEntry.contentType as any,
          sourceType: 'strategy',
          sourceDescription: `90-Day Challenge Day ${challenge.currentDay}: ${todayEntry.contentType}`,
          voiceProfile: {
            vocabularyRules: (report as any).writingDNA?.vocabularyProfile?.technicalTerms || [],
            toneRules: [(report as any).writingDNA?.toneProfile?.primary || 'Professional'],
            storytellingRules: ['personal story', 'lessons learned'],
            hookRules: [(report as any).writingDNA?.hooks?.[0]?.text || 'Have you ever faced this challenge?'],
            ctaRules: [(report as any).writingDNA?.ctas?.[0]?.text || 'What\'s your experience?'],
            communicationRules: [(report as any).writingDNA?.communicationStyle || 'Clear and structured'],
          },
          brandProfile: {
            positioning: (report as any).brandDNA?.positioning || '',
            audience: [(report as any).brandDNA?.targetAudience || 'Fellow engineers'],
            expertise: (report as any).brandDNA?.brandTerritory || [],
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
          todayEntry.status = challenge.reviewMode ? 'generated' : 'scheduled';
          todayEntry.postId = result.post._id;
          todayEntry.generatedAt = new Date();

          challenge.generatedTopics.push(topic);
          challenge.generatedHooks.push(hook);
          challenge.stats.postsGenerated++;

          if (!challenge.reviewMode) {
            await QueueItem.create({
              userId: uid,
              postId: result.post._id,
              topic,
              hook,
              contentType: todayEntry.contentType,
              pillar: todayEntry.pillar,
              stage: 'scheduled',
              scheduledDate: challenge.postingTime ? combineDateAndTime(today, challenge.postingTime) : today,
              overallScore: (result.scores?.content as any)?.overall || 70,
            });
            todayEntry.status = 'scheduled';
          }

          await challenge.save();

          res.json({
            success: true,
            post: result.post,
            topic,
            hook,
            contentType: todayEntry.contentType,
            status: todayEntry.status,
          });
        } else {
          todayEntry.status = 'failed';
          todayEntry.error = result.error || 'Generation failed';
          await challenge.save();
          res.status(500).json({ error: result.error || 'Generation failed' });
        }
      } catch (genError: any) {
        todayEntry.status = 'failed';
        todayEntry.error = genError.message;
        todayEntry.retryCount = (todayEntry.retryCount || 0) + 1;
        await challenge.save();
        throw genError;
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate today content');
      res.status(500).json({ error: error.message });
    }
  });

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

      const li = report.linkedinAnalysis || {} as any;
      const rs = report.resumeAnalysis || {} as any;
      const allSkills = Array.from(new Set([...(li.skills || []), ...(rs.skills || [])]));
      const allProjects = [...(li.projects || []), ...(rs.projects || [])];
      const allCerts = [...(li.certifications || []), ...(rs.certifications || [])];
      const allExperience = [...(li.experience || []), ...(rs.experience || [])];

      const pendingEntries = challenge.calendar
        .filter((c: any) => c.status === 'pending')
        .slice(0, days || 7);

      const results: any[] = [];

      for (const entry of pendingEntries) {
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
            sourceDescription: `90-Day Challenge batch generation`,
            voiceProfile: {
              vocabularyRules: (report as any).writingDNA?.vocabularyProfile?.technicalTerms || [],
              toneRules: [(report as any).writingDNA?.toneProfile?.primary || 'Professional'],
              storytellingRules: ['personal story'],
              hookRules: ['Have you ever faced this challenge?'],
              ctaRules: ['What\'s your experience?'],
              communicationRules: [(report as any).writingDNA?.communicationStyle || 'Clear and structured'],
            },
            brandProfile: {
              positioning: (report as any).brandDNA?.positioning || '',
              audience: [(report as any).brandDNA?.targetAudience || 'Fellow engineers'],
              expertise: (report as any).brandDNA?.brandTerritory || [],
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
            entry.status = challenge.reviewMode ? 'generated' : 'scheduled';
            entry.postId = result.post._id;
            entry.generatedAt = new Date();
            challenge.generatedTopics.push(topic);
            challenge.generatedHooks.push(hook);
            challenge.stats.postsGenerated++;

            if (!challenge.reviewMode) {
              await QueueItem.create({
                userId: uid,
                postId: result.post._id,
                topic,
                hook,
                contentType: entry.contentType,
                pillar: entry.pillar,
                stage: 'scheduled',
                scheduledDate: entry.date,
                overallScore: (result.scores?.content as any)?.overall || 70,
              });
              entry.status = 'scheduled';
            }

            results.push({ day: entry.day, topic, status: entry.status });
          }
        } catch (e: any) {
          entry.status = 'failed';
          entry.error = e.message;
          entry.retryCount = (entry.retryCount || 0) + 1;
          results.push({ day: entry.day, error: e.message });
        }
      }

      await challenge.save();
      res.json({ success: true, results, generated: results.length });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to batch generate');
      res.status(500).json({ error: error.message });
    }
  });

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

      await LinkedInChallenge.deleteOne({ userId: new mongoose.Types.ObjectId(userId) });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

function generateCalendar(startDate: Date, postingDays: string[], postsPerWeek: number, topics: string[], report: any): any[] {
  const calendar: any[] = [];
  const li = report.linkedinAnalysis || {};
  const rs = report.resumeAnalysis || {};
  const allSkills = Array.from(new Set([...(li.skills || []), ...(rs.skills || [])]));
  const allProjects = [...(li.projects || []), ...(rs.projects || [])];

  for (let day = 1; day <= 90; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day - 1);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

    if (!postingDays.includes(dayOfWeek)) {
      calendar.push({ day, date, dayOfWeek, contentType: 'rest', pillar: '', topic: '', hook: '', status: 'rest', retryCount: 0 });
      continue;
    }

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
      day,
      date,
      dayOfWeek,
      contentType: contentDef.type,
      pillar: contentDef.pillars[0] || 'General',
      topic,
      hook: '',
      status: 'pending',
      retryCount: 0,
    });
  }

  return calendar;
}

function generateUniqueTopic(suggestedTopic: string, contentType: string, skills: string[], projects: any[], certs: any[], experience: any[], usedTopics: string[]): string {
  const allOptions: string[] = [];

  skills.forEach(s => {
    allOptions.push(`${s} best practices`);
    allOptions.push(`Lessons from ${s}`);
    allOptions.push(`${s} tips for beginners`);
    allOptions.push(`My ${s} journey`);
  });

  projects.forEach(p => {
    allOptions.push(`How I built ${p.name || p.title}`);
    allOptions.push(`The story behind ${p.name || p.title}`);
    allOptions.push(`${p.name || p.title} — lessons learned`);
  });

  certs.forEach(c => {
    allOptions.push(`Why I got certified in ${c.name || c}`);
    allOptions.push(`What ${c.name || c} taught me`);
  });

  experience.forEach(e => {
    allOptions.push(`Lessons from being ${e.title}`);
    allOptions.push(`What I learned at ${e.organization || 'my role'}`);
  });

  allOptions.push(
    `${suggestedTopic} — a fresh perspective`,
    `The truth about ${suggestedTopic}`,
    `What nobody tells you about ${suggestedTopic}`,
    `My honest review of ${suggestedTopic}`,
    `Why ${suggestedTopic} matters more than you think`,
    `The biggest mistake in ${suggestedTopic}`,
    `How ${suggestedTopic} changed my career`,
    `3 things I wish I knew about ${suggestedTopic}`,
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

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}
