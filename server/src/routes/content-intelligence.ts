import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import pino from 'pino';
import { AnalysisReport } from '../models/analysis/AnalysisReport';
import { Post } from '../models/content-generation/Post';
import { QueueItem } from '../models/content-operations/QueueItem';
import { getAuthenticatedUserId } from '../utils/auth';

const logger = pino({ name: 'content-intelligence' });

export function createContentIntelligenceRouter(): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const uid = new mongoose.Types.ObjectId(userId);
      const report = await AnalysisReport.findOne({ userId: uid }).lean();
      if (!report) return res.status(404).json({ error: 'No analysis report found' });

      const li = report.linkedinAnalysis || {} as any;
      const rs = report.resumeAnalysis || {} as any;
      const gh = report.githubAnalysis || {} as any;

      const allSkills = Array.from(new Set([...(li.skills || []), ...(rs.skills || [])]));
      const allCerts = [...(li.certifications || []), ...(rs.certifications || [])];
      const allProjects = [...(li.projects || []), ...(rs.projects || [])];
      const allExperience = [...(li.experience || []), ...(rs.experience || [])];
      const allEducation = [...(li.education || [])];

      const careerGoals = report.careerGoals || [];
      const scores = report.scores || {};
      const pillars = report.contentPillars || [];
      const strengths = report.strengths || [];
      const weaknesses = report.weaknesses || [];
      const improvements = report.improvements || [];

      const recentPosts = await Post.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean();
      const queueItems = await QueueItem.find({ userId: uid }).sort({ createdAt: -1 }).limit(20).lean();

      const contentPillars = generateContentPillars(allSkills, allExperience, allCerts, allProjects, careerGoals, pillars);
      const roadmap = generateRoadmap(allSkills, allExperience, careerGoals, scores, contentPillars);
      const weeklyCalendar = generateWeeklyCalendar(allSkills, allExperience, contentPillars, careerGoals);
      const trendingTopics = generateTrendingTopics(allSkills, allExperience, li.industry || '');
      const contentGaps = generateContentGaps(allSkills, allProjects, allCerts, recentPosts, queueItems);
      const seriesIdeas = generateSeriesIdeas(allSkills, allProjects, allCerts, allExperience);
      const postIdeas = generatePostIdeas(allSkills, allProjects, allCerts, allExperience, gh, careerGoals);
      const performanceInsights = generatePerformanceInsights(recentPosts, queueItems, allSkills);
      const contentGoals = generateContentGoals(careerGoals, scores, allExperience);
      const opportunities = generateOpportunities(allSkills, allProjects, allCerts, allExperience, recentPosts, queueItems);
      const upcomingSchedule = await getUpcomingSchedule(uid);

      res.json({
        contentPillars,
        roadmap,
        weeklyCalendar,
        trendingTopics,
        contentGaps,
        seriesIdeas,
        postIdeas,
        performanceInsights,
        contentGoals,
        opportunities,
        upcomingSchedule,
        profileSummary: {
          skills: allSkills.length,
          certifications: allCerts.length,
          projects: allProjects.length,
          experience: allExperience.length,
          githubConnected: gh.connected || false,
        },
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate content intelligence');
      res.status(500).json({ error: error.message || 'Failed to generate content intelligence' });
    }
  });

  return router;
}

function generateContentPillars(skills: string[], experience: any[], certs: any[], projects: any[], goals: string[], existingPillars: any[]): any[] {
  const pillarMap = new Map<string, { name: string; score: number; topics: string[]; description: string; percentage: number }>();

  const skillCategories: Record<string, string[]> = {
    'Full Stack': ['react', 'node', 'javascript', 'typescript', 'html', 'css', 'next', 'vue', 'angular', 'express', 'mongo', 'postgres', 'sql', 'django', 'flask', 'spring', 'laravel', 'php'],
    'Mobile Development': ['android', 'ios', 'swift', 'kotlin', 'react native', 'flutter', 'mobile', 'java'],
    'AI & Machine Learning': ['machine learning', 'deep learning', 'ai', 'tensorflow', 'pytorch', 'nlp', 'llm', 'gen ai', 'generative', 'openai', 'gpt', 'transformer', 'rag', 'langchain'],
    'Cloud & DevOps': ['aws', 'gcp', 'azure', 'kubernetes', 'docker', 'terraform', 'ci/cd', 'devops', 'jenkins', 'github actions'],
    'Backend Engineering': ['python', 'java', 'go', 'rust', 'node', 'api', 'microservices', 'graphql', 'rest'],
    'Data Engineering': ['sql', 'nosql', 'mongodb', 'kafka', 'spark', 'tableau', 'data', 'etl', 'pipeline'],
    'Open Source': ['github', 'open source', 'contributor', 'oss'],
    'Career Growth': ['leadership', 'management', 'mentoring', 'team', 'hiring', 'strategy'],
  };

  for (const [category, keywords] of Object.entries(skillCategories)) {
    const matchedSkills = skills.filter(s => keywords.some(k => s.toLowerCase().includes(k)));
    if (matchedSkills.length > 0) {
      const score = Math.min(100, 30 + matchedSkills.length * 15);
      pillarMap.set(category, {
        name: category,
        score,
        topics: matchedSkills.slice(0, 5),
        description: `Share insights about ${matchedSkills.slice(0, 3).join(', ')}`,
        percentage: 0,
      });
    }
  }

  if (experience.length >= 3) {
    pillarMap.set('Career Growth', {
      name: 'Career Growth',
      score: 70,
      topics: ['Lessons Learned', 'Career Advice', 'Professional Development', 'Interview Tips'],
      description: 'Share your career journey and lessons learned',
      percentage: 0,
    });
  }

  if (projects.length > 0) {
    pillarMap.set('Project Breakdowns', {
      name: 'Project Breakdowns',
      score: 60 + projects.length * 5,
      topics: projects.slice(0, 4).map((p: any) => p.name || p.title || 'Project'),
      description: 'Deep dive into your projects and technical decisions',
      percentage: 0,
    });
  }

  if (certs.length >= 2) {
    pillarMap.set('Industry Knowledge', {
      name: 'Industry Knowledge',
      score: 50 + certs.length * 10,
      topics: certs.slice(0, 4).map((c: any) => c.name || c),
      description: 'Share knowledge validated by your certifications',
      percentage: 0,
    });
  }

  if (goals.includes('job_search')) {
    pillarMap.set('Job Search Insights', {
      name: 'Job Search Insights',
      score: 75,
      topics: ['Job Search Tips', 'Interview Prep', 'Resume Advice', 'Networking'],
      description: 'Share your job search journey and tips',
      percentage: 0,
    });
  }

  if (goals.includes('startup')) {
    pillarMap.set('Building in Public', {
      name: 'Building in Public',
      score: 70,
      topics: ['Product Development', 'Startup Journey', 'Lessons', 'MVP'],
      description: 'Share your building journey transparently',
      percentage: 0,
    });
  }

  let pillars = Array.from(pillarMap.values()).sort((a, b) => b.score - a.score).slice(0, 6);

  const totalScore = pillars.reduce((sum, p) => sum + p.score, 0);
  pillars = pillars.map(p => ({
    ...p,
    percentage: Math.round((p.score / totalScore) * 100),
  }));

  while (pillars.length < 3) {
    pillars.push({
      name: 'Professional Development',
      score: 40,
      topics: ['Learning', 'Books', 'Courses', 'Growth'],
      description: 'Continuous learning and skill development',
      percentage: 10,
    });
  }

  return pillars;
}

function generateRoadmap(skills: string[], experience: any[], goals: string[], scores: any, pillars: any[]): any[] {
  const topPillars = pillars.slice(0, 3);
  const topSkills = skills.slice(0, 5);
  const expYears = experience.length;

  return [
    {
      period: '30 Days',
      title: 'Foundation',
      focus: topPillars.map((p: any) => p.name).join(' + '),
      topics: topPillars.flatMap((p: any) => p.topics?.slice(0, 2) || []).slice(0, 6),
      contentTypes: ['Project Breakdown', 'Learning Post', 'Technical Tutorial', 'Career Story'],
      goal: 'Build consistency — post 3x per week',
      expectedOutcome: `+${200 + expYears * 50} profile visits, +${50 + expYears * 10} connections`,
    },
    {
      period: '60 Days',
      title: 'Growth',
      focus: `Expand beyond ${topPillars[0]?.name || 'core skills'}`,
      topics: [...topSkills.slice(0, 3), 'Industry Trends', 'Lessons Learned', 'Best Practices'],
      contentTypes: ['Framework Post', 'Industry Commentary', 'Thought Leadership', 'Series Launch'],
      goal: 'Build authority — get featured in discussions',
      expectedOutcome: `+${500 + expYears * 100} profile views, +${100 + expYears * 20} followers`,
    },
    {
      period: '90 Days',
      title: 'Authority',
      focus: `Establish as ${topPillars[0]?.name || 'domain'} expert`,
      topics: ['Deep Technical Insights', 'Career Reflections', 'Industry Predictions', 'Mentorship'],
      contentTypes: ['Long-form Article', 'Poll', 'Collaboration', 'Case Study'],
      goal: 'Become recognized authority in your niche',
      expectedOutcome: `+${1000 + expYears * 200} profile views, +${200 + expYears * 30} followers`,
    },
  ];
}

function generateWeeklyCalendar(skills: string[], experience: any[], pillars: any[], goals: string[]): any[] {
  const topPillar = pillars[0]?.name || 'Professional Development';
  const secondPillar = pillars[1]?.name || 'Technical';
  const hasTech = skills.some(s => /react|node|python|java|android|ios|flutter/i.test(s));
  const hasProjects = skills.length > 3;

  const days = [
    { day: 'Monday', type: 'Technical Tutorial', description: `Deep dive into ${skills[0] || 'a technical topic'}`, pillar: secondPillar, difficulty: 'medium' },
    { day: 'Tuesday', type: 'Project Breakdown', description: hasProjects ? 'Showcase a project you built' : 'Share a technical concept', pillar: 'Project Breakdowns', difficulty: 'easy' },
    { day: 'Wednesday', type: 'Career Story', description: 'Share a lesson from your career journey', pillar: 'Career Growth', difficulty: 'easy' },
    { day: 'Thursday', type: 'Industry Insight', description: `Trends in ${topPillar}`, pillar: topPillar, difficulty: 'medium' },
    { day: 'Friday', type: 'Learning Post', description: 'What you learned this week', pillar: secondPillar, difficulty: 'easy' },
    { day: 'Saturday', type: hasTech ? 'Open Source' : 'Framework Post', description: hasTech ? 'Contribute to or discuss open source' : 'Share a framework or tool', pillar: topPillar, difficulty: 'hard' },
    { day: 'Sunday', type: 'Personal Reflection', description: 'Weekly wins and lessons', pillar: 'Career Growth', difficulty: 'easy' },
  ];

  if (goals.includes('job_search')) {
    days[4] = { day: 'Friday', type: 'Job Search Tips', description: 'Share interview or resume tips', pillar: 'Job Search Insights', difficulty: 'easy' };
  }

  return days;
}

function generateTrendingTopics(skills: string[], experience: any[], industry: string): any[] {
  const topics: { topic: string; relevance: number; category: string }[] = [];

  const aiSkills = skills.some(s => /ai|ml|llm|gpt|gen ai|transformer|rag/i.test(s));
  const webSkills = skills.some(s => /react|next|node|typescript|javascript/i.test(s));
  const mobileSkills = skills.some(s => /android|ios|flutter|swift|kotlin/i.test(s));
  const cloudSkills = skills.some(s => /aws|gcp|azure|docker|kubernetes/i.test(s));

  if (aiSkills) {
    topics.push({ topic: 'Agentic AI', relevance: 95, category: 'AI' });
    topics.push({ topic: 'MCP Protocol', relevance: 90, category: 'AI' });
    topics.push({ topic: 'RAG Systems', relevance: 88, category: 'AI' });
    topics.push({ topic: 'LLM Fine-tuning', relevance: 85, category: 'AI' });
  }

  if (webSkills) {
    topics.push({ topic: 'Server Components', relevance: 85, category: 'Web' });
    topics.push({ topic: 'Edge Computing', relevance: 80, category: 'Web' });
    topics.push({ topic: 'TypeScript 5.5', relevance: 78, category: 'Web' });
  }

  if (mobileSkills) {
    topics.push({ topic: 'Kotlin Multiplatform', relevance: 82, category: 'Mobile' });
    topics.push({ topic: 'Compose Multiplatform', relevance: 80, category: 'Mobile' });
    topics.push({ topic: 'Flutter 4', relevance: 78, category: 'Mobile' });
  }

  if (cloudSkills) {
    topics.push({ topic: 'Platform Engineering', relevance: 85, category: 'Cloud' });
    topics.push({ topic: 'FinOps', relevance: 78, category: 'Cloud' });
  }

  topics.push({ topic: 'Building in Public', relevance: 82, category: 'Strategy' });
  topics.push({ topic: 'Career Growth in Tech', relevance: 80, category: 'Career' });

  return topics.sort((a, b) => b.relevance - a.relevance).slice(0, 10);
}

function generateContentGaps(skills: string[], projects: any[], certs: any[], posts: any[], queue: any[]): any {
  const postedTopics = new Set<string>();
  posts.forEach((p: any) => { if (p.topic) postedTopics.add(p.topic.toLowerCase()); });
  queue.forEach((q: any) => { if (q.topic) postedTopics.add(q.topic.toLowerCase()); });

  const covered: string[] = [];
  const missing: string[] = [];

  const keyAreas = [
    ...skills.slice(0, 5).map(s => s),
    ...projects.slice(0, 3).map((p: any) => p.name || p.title || 'Project'),
    ...certs.slice(0, 3).map((c: any) => c.name || 'Certification'),
  ];

  keyAreas.forEach(area => {
    const areaLower = area.toLowerCase();
    const isCovered = Array.from(postedTopics).some(t => t.includes(areaLower) || areaLower.includes(t));
    if (isCovered) covered.push(area);
    else missing.push(area);
  });

  if (missing.length === 0 && skills.length > 3) {
    missing.push('System Design', 'Open Source', 'Career Lessons');
  }

  return { covered, missing };
}

function generateSeriesIdeas(skills: string[], projects: any[], certs: any[], experience: any[]): any[] {
  const series: any[] = [];

  const topSkills = skills.slice(0, 4);
  topSkills.forEach(skill => {
    series.push({
      title: `30 Days of ${skill}`,
      description: `Daily insights about ${skill} — tips, tricks, and real-world examples`,
      topics: Array.from({ length: 30 }, (_, i) => `${skill} Tip #${i + 1}`),
      schedule: 'Daily for 30 days',
      estimatedReach: `${1500 + Math.floor(Math.random() * 1000)} impressions`,
      difficulty: 'medium',
    });
  });

  if (projects.length >= 2) {
    series.push({
      title: 'Project Breakdown Series',
      description: 'Deep dive into each of your projects — architecture, decisions, and lessons',
      topics: projects.slice(0, 5).map((p: any) => `How I built ${p.name || p.title}`),
      schedule: 'Weekly for 5 weeks',
      estimatedReach: `${2000 + projects.length * 200} impressions`,
      difficulty: 'hard',
    });
  }

  if (experience.length >= 2) {
    series.push({
      title: 'Career Lessons Learned',
      description: 'Share one lesson from each role in your career',
      topics: experience.slice(0, 5).map((e: any) => `Lessons from being ${e.title || 'a professional'}`),
      schedule: 'Weekly for 5 weeks',
      estimatedReach: `${1800 + experience.length * 150} impressions`,
      difficulty: 'easy',
    });
  }

  return series.slice(0, 4);
}

function generatePostIdeas(skills: string[], projects: any[], certs: any[], experience: any[], github: any, goals: string[]): any[] {
  const ideas: any[] = [];

  projects.forEach((p: any) => {
    ideas.push({
      idea: `How I built ${p.name || p.title}`,
      type: 'Project Breakdown',
      pillar: 'Project Breakdowns',
      difficulty: 'medium',
      engagement: 'high',
    });
    if (p.description) {
      ideas.push({
        idea: `The hardest part about building ${p.name || p.title}`,
        type: 'Story',
        pillar: 'Career Growth',
        difficulty: 'easy',
        engagement: 'high',
      });
    }
  });

  certs.slice(0, 3).forEach((c: any) => {
    ideas.push({
      idea: `Why I got certified in ${c.name || c}`,
      type: 'Career Story',
      pillar: 'Industry Knowledge',
      difficulty: 'easy',
      engagement: 'medium',
    });
  });

  experience.slice(0, 3).forEach((e: any) => {
    ideas.push({
      idea: `What I learned as ${e.title || 'a professional'} at ${e.organization || 'my company'}`,
      type: 'Career Story',
      pillar: 'Career Growth',
      difficulty: 'easy',
      engagement: 'high',
    });
  });

  skills.slice(0, 5).forEach(skill => {
    ideas.push({
      idea: `3 things I wish I knew about ${skill} earlier`,
      type: 'Educational',
      pillar: skill,
      difficulty: 'easy',
      engagement: 'high',
    });
    ideas.push({
      idea: `The ${skill} mistake that cost me 3 months`,
      type: 'Story',
      pillar: skill,
      difficulty: 'medium',
      engagement: 'very high',
    });
  });

  if (github.connected) {
    ideas.push({
      idea: 'What my GitHub contribution graph taught me about consistency',
      type: 'Personal',
      pillar: 'Open Source',
      difficulty: 'easy',
      engagement: 'medium',
    });
  }

  if (goals.includes('job_search')) {
    ideas.push({
      idea: 'My job search strategy that actually worked',
      type: 'Career Story',
      pillar: 'Job Search',
      difficulty: 'easy',
      engagement: 'very high',
    });
  }

  ideas.push(
    { idea: 'The most underrated skill in tech', type: 'Thought Leadership', pillar: 'Career Growth', difficulty: 'easy', engagement: 'high' },
    { idea: 'Hot take: What really matters in technical interviews', type: 'Contrarian', pillar: 'Career Growth', difficulty: 'medium', engagement: 'very high' },
    { idea: 'A day in my life as a developer', type: 'Personal', pillar: 'Career Growth', difficulty: 'easy', engagement: 'high' },
    { idea: 'What nobody tells you about your first year in tech', type: 'Story', pillar: 'Career Growth', difficulty: 'easy', engagement: 'very high' },
    { idea: 'Tools that 10x my productivity', type: 'Listicle', pillar: 'Professional Development', difficulty: 'easy', engagement: 'high' },
  );

  return ideas.slice(0, 50);
}

function generatePerformanceInsights(posts: any[], queue: any[], skills: string[]): any {
  const publishedPosts = posts.filter((p: any) => p.status === 'published');
  const totalPosts = publishedPosts.length + queue.length;

  const topics: Record<string, number> = {};
  publishedPosts.forEach((p: any) => {
    const topic = p.pillar || p.topic || 'General';
    topics[topic] = (topics[topic] || 0) + (p.engagement || 1);
  });

  const bestTopic = Object.entries(topics).sort((a, b) => b[1] - a[1])[0];

  return {
    bestPerformingTopic: bestTopic ? bestTopic[0] : skills[0] || 'Technical Content',
    bestContentType: publishedPosts.length > 0 ? 'Story Post' : 'Educational Post',
    bestPublishingTime: 'Tuesday 8:00 AM',
    engagementRate: totalPosts > 0 ? `${Math.min(8, 2 + totalPosts * 0.3).toFixed(1)}%` : '0%',
    consistencyScore: Math.min(100, totalPosts * 8),
    postingStreak: calculateStreak(publishedPosts),
    totalPosts,
    audienceGrowth: `+${totalPosts * 15}`,
  };
}

function calculateStreak(posts: any[]): number {
  if (posts.length === 0) return 0;
  let streak = 1;
  const sorted = posts.sort((a: any, b: any) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
  for (let i = 1; i < sorted.length; i++) {
    const diff = new Date(sorted[i - 1].publishedAt || sorted[i - 1].createdAt).getTime() - new Date(sorted[i].publishedAt || sorted[i].createdAt).getTime();
    if (diff <= 7 * 24 * 60 * 60 * 1000) streak++;
    else break;
  }
  return streak;
}

function generateContentGoals(careerGoals: string[], scores: any, experience: any[]): any[] {
  const goals: any[] = [];

  goals.push({
    goal: 'Build Personal Brand',
    description: 'Establish yourself as a recognized voice in your field',
    target: '500+ followers in 90 days',
    progress: Math.min(100, (scores.personalBrand || 0)),
    priority: 'high',
  });

  goals.push({
    goal: 'Post Consistently',
    description: 'Maintain a regular posting schedule',
    target: '3 posts per week',
    progress: 0,
    priority: 'high',
  });

  if (careerGoals.includes('job_search')) {
    goals.push({
      goal: 'Get Discovered by Recruiters',
      description: 'Optimize profile and content for recruiter visibility',
      target: '5+ recruiter outreach per month',
      progress: Math.min(100, (scores.careerOpportunity || 0)),
      priority: 'high',
    });
  }

  if (careerGoals.includes('startup')) {
    goals.push({
      goal: 'Build Startup Audience',
      description: 'Grow an audience interested in your product journey',
      target: '1000+ targeted followers',
      progress: Math.min(100, (scores.personalBrand || 0)),
      priority: 'medium',
    });
  }

  if (experience.length >= 5) {
    goals.push({
      goal: 'Establish Thought Leadership',
      description: 'Become a go-to expert in your domain',
      target: 'Feature in 2+ industry discussions per month',
      progress: Math.min(100, (scores.industryAuthority || 0)),
      priority: 'medium',
    });
  }

  goals.push({
    goal: 'Grow Engagement',
    description: 'Increase post engagement and interactions',
    target: '5%+ engagement rate',
    progress: Math.min(100, (scores.contentReadiness || 0)),
    priority: 'medium',
  });

  return goals;
}

function generateOpportunities(skills: string[], projects: any[], certs: any[], experience: any[], posts: any[], queue: any[]): any[] {
  const opps: any[] = [];

  const postedSkills = new Set<string>();
  posts.forEach((p: any) => { if (p.topic) postedSkills.add(p.topic.toLowerCase()); });

  const underrepresented = skills.filter(s => !Array.from(postedSkills).some(t => t.includes(s.toLowerCase())));
  underrepresented.slice(0, 3).forEach(skill => {
    opps.push({
      opportunity: `Your ${skill} skills are underrepresented`,
      description: `You have ${skill} expertise but haven't posted about it yet`,
      impact: 'high',
      effort: 'low',
    });
  });

  if (certs.length > 0 && posts.length < certs.length * 2) {
    opps.push({
      opportunity: `You have ${certs.length} certifications but haven't shared them`,
      description: 'Certifications are powerful social proof — share your learning journey',
      impact: 'medium',
      effort: 'low',
    });
  }

  if (projects.length > 1) {
    const showcased = new Set(posts.filter((p: any) => p.topic?.toLowerCase().includes('project') || p.topic?.toLowerCase().includes('built')).map((p: any) => p.topic));
    if (showcased.size < projects.length) {
      opps.push({
        opportunity: `You built ${projects.length} projects but only showcased ${showcased.size}`,
        description: 'Each project is a content opportunity — share the story behind it',
        impact: 'high',
        effort: 'medium',
      });
    }
  }

  if (experience.length >= 3) {
    opps.push({
      opportunity: 'Your career journey has untold stories',
      description: `${experience.length} roles = ${experience.length} stories to share`,
      impact: 'medium',
      effort: 'medium',
    });
  }

  if (posts.length === 0) {
    opps.push({
      opportunity: 'You haven\'t posted yet — start today',
      description: 'Your first post is the hardest. Share something you learned this week',
      impact: 'very high',
      effort: 'low',
    });
  }

  return opps.slice(0, 6);
}

async function getUpcomingSchedule(userId: mongoose.Types.ObjectId): Promise<any[]> {
  const upcoming = await QueueItem.find({
    userId,
    scheduledDate: { $gte: new Date() },
    stage: { $in: ['approved', 'scheduled'] },
  }).sort({ scheduledDate: 1 }).limit(5).lean();

  return upcoming.map((item: any) => ({
    topic: item.topic || item.hook || 'Untitled',
    scheduledDate: item.scheduledDate,
    stage: item.stage,
    pillar: item.pillar || '',
  }));
}
