import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import pino from 'pino';
import { AnalysisReport } from '../models/analysis/AnalysisReport';
import { Post } from '../models/content-generation/Post';
import { QueueItem } from '../models/content-operations/QueueItem';
import { LinkedInChallenge } from '../models/content-operations/LinkedInChallenge';
import { ChatSession } from '../models/ai-manager/ChatSession';
import { ConversationHistory } from '../models/ai-manager/ConversationHistory';
import { getAuthenticatedUserId } from '../utils/auth';

const logger = pino({ name: 'ai-coach' });
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function createAICoachRouter(): Router {
  const router = Router();

  /* ─── Full context load (for memory panel) ─── */
  router.get('/context', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const uid = new mongoose.Types.ObjectId(userId);
      const [report, posts, queue, challenge] = await Promise.all([
        AnalysisReport.findOne({ userId: uid }).lean(),
        Post.find({ userId: uid }).sort({ createdAt: -1 }).lean(),
        QueueItem.find({ userId: uid }).sort({ createdAt: -1 }).lean(),
        LinkedInChallenge.findOne({ userId: uid }).lean(),
      ]);

      const published = posts.filter((p: any) => p.status === 'published');

      res.json({
        profile: report ? {
          name: report.linkedinAnalysis?.fullName || '',
          headline: report.linkedinAnalysis?.headline || '',
          location: report.linkedinAnalysis?.location || '',
          about: report.linkedinAnalysis?.about || '',
          skills: report.linkedinAnalysis?.skills || [],
          certifications: report.linkedinAnalysis?.certifications || [],
          projects: report.linkedinAnalysis?.projects || [],
          experience: report.linkedinAnalysis?.experience || [],
          education: report.linkedinAnalysis?.education || [],
          githubUsername: report.githubAnalysis?.username || '',
          githubLanguages: report.githubAnalysis?.languages || [],
          githubRepos: report.githubAnalysis?.repos || 0,
        } : null,
        scores: report?.scores || null,
        strengths: report?.strengths || [],
        weaknesses: report?.weaknesses || [],
        contentPillars: report?.contentPillars || [],
        brandDNA: report?.brandDNA || null,
        writingDNA: report?.writingDNA || null,
        careerBlueprint: report?.careerBlueprint || null,
        strategy90Days: report?.strategy90Days || null,
        careerGoals: report?.careerGoals || [],
        profileScore: report?.profileScore || 0,
        contentOpportunities: report?.contentOpportunities || [],
        posts: {
          total: posts.length,
          published: published.length,
          scheduled: posts.filter((p: any) => p.status === 'scheduled').length,
          drafts: posts.filter((p: any) => p.status === 'draft').length,
          recentPosts: posts.slice(0, 5).map((p: any) => ({
            title: p.title || '',
            contentType: p.contentType,
            status: p.status,
            overallScore: p.overallScore,
            createdAt: p.createdAt,
          })),
        },
        queue: {
          total: queue.length,
          items: queue.slice(0, 10).map((q: any) => ({
            topic: q.topic || '',
            hook: q.hook || '',
            stage: q.stage,
            contentType: q.contentType,
          })),
        },
        challenge: challenge ? {
          status: challenge.status,
          currentDay: challenge.currentDay,
          totalDays: challenge.totalDays,
          topics: challenge.topics || [],
          stats: challenge.stats || {},
        } : null,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to load context');
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── Chat with full AI context ─── */
  router.post('/chat', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { message, sessionId } = req.body;
      if (!message) return res.status(400).json({ error: 'message required' });

      const uid = new mongoose.Types.ObjectId(userId);

      // Load all user data
      const [report, posts, queue, challenge] = await Promise.all([
        AnalysisReport.findOne({ userId: uid }).lean(),
        Post.find({ userId: uid }).sort({ createdAt: -1 }).lean(),
        QueueItem.find({ userId: uid }).sort({ createdAt: -1 }).lean(),
        LinkedInChallenge.findOne({ userId: uid }).lean(),
      ]);

      // Get or create session
      let session: any;
      if (sessionId) {
        session = await ChatSession.findById(sessionId);
      }
      if (!session) {
        session = await ChatSession.create({
          userId: uid,
          title: message.substring(0, 60),
          status: 'active',
          context: 'ai-coach',
          messageCount: 0,
        });
      }

      // Get conversation history
      const history = await ConversationHistory.find({ sessionId: session._id })
        .sort({ createdAt: 1 }).limit(20).lean();

      // Build system prompt with full context
      const systemPrompt = buildSystemPrompt(report, posts, queue, challenge);

      // Build messages for LLM
      const messages: any[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((h: any) => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
      ];

      // Call OpenRouter
      const apiKey = process.env.OPENROUTER_API_KEY || '';
      if (!apiKey) {
        return res.status(503).json({ error: 'AI service not configured' });
      }

      const response = await axios.post(OPENROUTER_API_URL, {
        model: 'deepseek/deepseek-chat-v3:free',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://personaos-ai.vercel.app',
          'X-Title': 'PersonaOS AI Content Coach',
        },
        timeout: 60000,
      });

      const aiResponse = response.data?.choices?.[0]?.message?.content || 'I could not generate a response. Please try again.';

      // Save messages
      await ConversationHistory.create({
        sessionId: session._id,
        userId: uid,
        role: 'user',
        type: 'text',
        content: message,
      });
      await ConversationHistory.create({
        sessionId: session._id,
        userId: uid,
        role: 'assistant',
        type: 'text',
        content: aiResponse,
      });
      await ChatSession.findByIdAndUpdate(session._id, {
        $inc: { messageCount: 2 },
        lastMessageAt: new Date(),
        title: message.substring(0, 60),
      });

      res.json({
        sessionId: session._id.toString(),
        response: aiResponse,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Chat failed');
      if (error.response?.status === 429) {
        return res.status(429).json({ error: 'Rate limited. Please wait a moment and try again.' });
      }
      res.status(500).json({ error: error.message || 'Failed to process message' });
    }
  });

  /* ─── Sessions ─── */
  router.get('/sessions', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const sessions = await ChatSession.find({ userId: new mongoose.Types.ObjectId(userId), status: 'active' })
        .sort({ lastMessageAt: -1 }).limit(20).lean();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/sessions', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const session = await ChatSession.create({
        userId: new mongoose.Types.ObjectId(userId),
        title: 'New conversation',
        status: 'active',
        context: 'ai-coach',
      });
      res.json(session);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  /* ─── History ─── */
  router.get('/history/:sessionId', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { sessionId } = req.params;
      const history = await ConversationHistory.find({ sessionId: new mongoose.Types.ObjectId(sessionId) })
        .sort({ createdAt: 1 }).lean();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

function buildSystemPrompt(report: any, posts: any[], queue: any[], challenge: any): string {
  const parts: string[] = [];

  parts.push(`You are an expert AI LinkedIn Content Coach. You have complete access to this user's professional profile, content history, analytics, and career goals. You must ONLY reference real data from their profile — never make up information, never use generic templates, never give advice that isn't grounded in their actual data.

When the user asks "What should I post today?" or similar, you must reference their specific projects, skills, certifications, experience, content pillars, and current content strategy to give a specific, actionable recommendation. Never say "write about a lesson you learned" — instead say something like "Based on your HelpNet project and Laravel experience, write about X because Y."

Your tone should be like a knowledgeable, encouraging mentor who deeply understands their career and content strategy.`);

  if (report) {
    const li = report.linkedinAnalysis || {};
    const resume = report.resumeAnalysis || {};
    const github = report.githubAnalysis || {};
    const brand = report.brandDNA || {};
    const writing = report.writingDNA || {};
    const career = report.careerBlueprint || {};
    const strategy = report.strategy90Days || {};

    parts.push(`\n=== USER PROFILE ===`);
    parts.push(`Name: ${li.fullName || 'Unknown'}`);
    parts.push(`Headline: ${li.headline || 'Unknown'}`);
    parts.push(`Location: ${li.location || 'Unknown'}`);
    parts.push(`About: ${li.about || 'Not provided'}`);

    if (li.skills?.length > 0) parts.push(`Skills: ${li.skills.join(', ')}`);
    if (resume.skills?.length > 0 && JSON.stringify(resume.skills) !== JSON.stringify(li.skills)) {
      parts.push(`Resume Skills: ${resume.skills.join(', ')}`);
    }
    if (li.certifications?.length > 0) parts.push(`Certifications: ${li.certifications.map((c: any) => typeof c === 'string' ? c : c.name || c.title || JSON.stringify(c)).join(', ')}`);
    if (li.projects?.length > 0) parts.push(`Projects: ${li.projects.map((p: any) => typeof p === 'string' ? p : p.name || p.title || JSON.stringify(p)).join(', ')}`);

    if (li.experience?.length > 0) {
      parts.push(`Experience:`);
      li.experience.forEach((e: any) => {
        parts.push(`  - ${e.title || e.role || 'Role'} at ${e.company || e.organization || 'Company'} (${e.dateRange || e.date || ''})`);
      });
    }

    if (github.username) {
      parts.push(`GitHub: ${github.username} — ${github.repos} repos, languages: ${(github.languages || []).join(', ')}`);
    }

    parts.push(`\n=== CAREER ===`);
    parts.push(`Current: ${career.currentPosition || 'Unknown'}`);
    parts.push(`Target: ${career.targetPosition || 'Unknown'}`);
    parts.push(`Stage: ${career.careerStage || 'Unknown'}`);
    if (career.skillGaps?.length > 0) {
      parts.push(`Skill Gaps: ${career.skillGaps.map((g: any) => `${g.skill} (${g.currentLevel} → ${g.targetLevel})`).join(', ')}`);
    }
    if (career.authorityMap?.topics?.length > 0) {
      parts.push(`Authority Topics: ${career.authorityMap.topics.join(', ')}`);
    }
    if (report.careerGoals?.length > 0) {
      parts.push(`Career Goals: ${report.careerGoals.join('; ')}`);
    }

    parts.push(`\n=== BRAND & VOICE ===`);
    parts.push(`Brand Archetype: ${brand.archetype || 'Unknown'}`);
    parts.push(`Positioning: ${brand.positioning || 'Unknown'}`);
    parts.push(`Unique Value Prop: ${brand.uniqueValueProposition || 'Unknown'}`);
    parts.push(`Target Audience: ${brand.targetAudience || 'Unknown'}`);
    parts.push(`Voice Signature: ${writing.voiceSignature || 'Unknown'}`);
    parts.push(`Communication Style: ${writing.communicationStyle || 'Unknown'}`);
    parts.push(`Tone: ${writing.toneProfile?.primary || 'Professional'}${writing.toneProfile?.secondary?.length ? ` (secondary: ${writing.toneProfile.secondary.join(', ')})` : ''}`);

    if (report.contentPillars?.length > 0) {
      parts.push(`\n=== CONTENT PILLARS ===`);
      report.contentPillars.forEach((p: any, i: number) => {
        parts.push(`${i + 1}. ${p.name}: ${p.description} (topics: ${(p.topics || []).join(', ')})`);
      });
    }

    parts.push(`\n=== STRATEGY (90-Day) ===`);
    parts.push(`Narrative: ${strategy.narrative || 'Not set'}`);
    parts.push(`Recommended Frequency: ${strategy.recommendedFrequency || '3x per week'}`);
    if (strategy.monthlyPlans?.length > 0) {
      strategy.monthlyPlans.forEach((m: any) => {
        parts.push(`Month ${m.month} (${m.phase}): ${m.focus}`);
        if (m.goals?.length > 0) parts.push(`  Goals: ${m.goals.join(', ')}`);
      });
    }
    if (strategy.growthGoals?.length > 0) {
      parts.push(`Growth Goals: ${strategy.growthGoals.map((g: any) => `${g.goal} — target ${g.target} ${g.metric}`).join(', ')}`);
    }

    parts.push(`\n=== SCORES ===`);
    parts.push(`Profile Score: ${report.profileScore || 0}/100`);
    parts.push(`Technical Leadership: ${report.scores?.technicalLeadership || 0}/100`);
    parts.push(`Content Readiness: ${report.scores?.contentReadiness || 0}/100`);
    parts.push(`Industry Authority: ${report.scores?.industryAuthority || 0}/100`);
    parts.push(`Personal Brand: ${report.scores?.personalBrand || 0}/100`);
    parts.push(`Career Opportunity: ${report.scores?.careerOpportunity || 0}/100`);

    if (report.strengths?.length > 0) {
      parts.push(`\nStrengths: ${report.strengths.map((s: any) => s.title).join(', ')}`);
    }
    if (report.weaknesses?.length > 0) {
      parts.push(`Weaknesses: ${report.weaknesses.map((w: any) => w.title).join(', ')}`);
    }
    if (report.contentOpportunities?.length > 0) {
      parts.push(`Content Opportunities: ${report.contentOpportunities.map((o: any) => o.topic).join(', ')}`);
    }
  }

  parts.push(`\n=== CONTENT ACTIVITY ===`);
  parts.push(`Total Posts: ${posts.length}`);
  parts.push(`Published: ${posts.filter((p: any) => p.status === 'published').length}`);
  parts.push(`Scheduled: ${posts.filter((p: any) => p.status === 'scheduled').length}`);
  parts.push(`Drafts: ${posts.filter((p: any) => p.status === 'draft').length}`);

  if (posts.length > 0) {
    const published = posts.filter((p: any) => p.status === 'published');
    if (published.length > 0) {
      const avgScore = published.reduce((s: number, p: any) => s + (p.overallScore || 0), 0) / published.length;
      parts.push(`Average Post Score: ${Math.round(avgScore)}/100`);
      parts.push(`Recent Published Posts:`);
      published.slice(0, 5).forEach((p: any) => {
        parts.push(`  - "${p.title || 'Untitled'}" (${p.contentType || 'general'}) — Score: ${p.overallScore || 'N/A'}`);
      });
    }
  }

  if (queue.length > 0) {
    parts.push(`\nPublishing Queue (${queue.length} items):`);
    queue.slice(0, 5).forEach((q: any) => {
      parts.push(`  - "${q.topic || q.hook || 'Untitled'}" — Stage: ${q.stage}`);
    });
  }

  if (challenge) {
    parts.push(`\n=== 90-DAY CHALLENGE ===`);
    parts.push(`Status: ${challenge.status}`);
    parts.push(`Day: ${challenge.currentDay || 0}/${challenge.totalDays || 90}`);
    parts.push(`Posts Generated: ${challenge.stats?.postsGenerated || 0}`);
    parts.push(`Posts Published: ${challenge.stats?.postsPublished || 0}`);
    parts.push(`Current Streak: ${challenge.stats?.currentStreak || 0} days`);
    if (challenge.topics?.length > 0) {
      parts.push(`Topics: ${challenge.topics.join(', ')}`);
    }
  }

  parts.push(`\n=== RESPONSE RULES ===`);
  parts.push(`1. NEVER give generic advice. Always reference specific data from their profile.`);
  parts.push(`2. When suggesting posts, reference their actual projects, skills, experience, and content pillars.`);
  parts.push(`3. When reviewing strategy, reference their actual strategy90Days data, scores, and content mix.`);
  parts.push(`4. When rewriting posts, match their voiceSignature, communicationStyle, and toneProfile.`);
  parts.push(`5. When suggesting growth, reference their actual analytics, consistency, and challenge progress.`);
  parts.push(`6. Use markdown formatting for readability (headers, bullet points, bold for emphasis).`);
  parts.push(`7. Be direct and actionable — every response should include specific next steps.`);
  parts.push(`8. If the user asks something outside LinkedIn content coaching, politely redirect to that domain.`);
  parts.push(`9. Keep responses concise but thorough — 2-4 paragraphs typically.`);
  parts.push(`10. Always be encouraging and constructive, even when pointing out weaknesses.`);

  return parts.join('\n');
}
