import { Router, Request, Response } from 'express';
import { onboardingService } from '../services/onboarding/OnboardingService';
import { brandAnalysisEngine } from '../services/analysis/BrandAnalysisEngine';
import { getTokenFromReq, verifyToken } from '../utils/jwt';
import pino from 'pino';

const logger = pino();

export function createOnboardingRouter(): Router {
  const router = Router();

  function getUserId(req: Request): string | null {
    const token = getTokenFromReq(req);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
  }

  router.get('/state', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const progress = await onboardingService.getOnboardingProgress(userId);
      res.json(progress);
    } catch (error) {
      logger.error({ error }, 'Failed to get onboarding state');
      res.status(500).json({ error: 'Failed to get onboarding state' });
    }
  });

  router.post('/start', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.getOrCreateState(userId);
      res.json(state);
    } catch (error) {
      logger.error({ error }, 'Failed to start onboarding');
      res.status(500).json({ error: 'Failed to start onboarding' });
    }
  });

  router.post('/steps/welcome', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.completeStep(userId, 'welcome', req.body);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/linkedin-url', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { linkedinUrl } = req.body;
      if (!linkedinUrl) return res.status(400).json({ error: 'linkedinUrl required' });

      const { OnboardingState } = await import('../models/onboarding/OnboardingState');
      const state = await OnboardingState.findOne({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
      if (!state) return res.status(404).json({ error: 'Onboarding state not found' });

      (state as any).linkedinUrl = linkedinUrl;
      await state.save();

      const result = await onboardingService.completeStep(userId, 'connect_linkedin', { linkedinUrl });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/resume', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.saveResumeData(userId, req.body.fileInfo, req.body.parsedData);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/github-url', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { githubUrl } = req.body;
      if (!githubUrl) return res.status(400).json({ error: 'githubUrl required' });

      const { OnboardingState } = await import('../models/onboarding/OnboardingState');
      const state = await OnboardingState.findOne({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
      if (!state) return res.status(404).json({ error: 'Onboarding state not found' });

      (state as any).githubUrl = githubUrl;
      await state.save();

      const result = await onboardingService.completeStep(userId, 'connect_github', { githubUrl });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/goals', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { goals } = req.body;
      if (!goals || !Array.isArray(goals)) {
        return res.status(400).json({ error: 'goals array required' });
      }
      const state = await onboardingService.saveCareerGoals(userId, goals);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/skip', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { step } = req.body;
      if (!step) return res.status(400).json({ error: 'step required' });
      const state = await onboardingService.skipStep(userId, step);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/steps/:step/complete', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const { step } = req.params;
      const state = await onboardingService.completeStep(userId, step as any, req.body);
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/resume/upload', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const multer = require('multer');
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

      await new Promise<void>((resolve, reject) => {
        upload.single('resume')(req, res, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: 'No file uploaded' });

      const parsed = {
        rawText: '',
        summary: 'Resume uploaded successfully',
        skills: [],
        experience: [],
        education: [],
      };

      res.json({ parsed, fileInfo: { fileName: file.originalname, fileType: file.mimetype, fileSize: file.size } });
    } catch (error: any) {
      logger.error({ error }, 'Resume upload failed');
      res.status(500).json({ error: error.message || 'Failed to upload resume' });
    }
  });

  router.post('/analysis/run', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { analysisService } = await import('../services/analysis/AnalysisService');
      const report = await analysisService.generateFullReport(userId);

      const { OnboardingState } = await import('../models/onboarding/OnboardingState');
      const state = await OnboardingState.findOne({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });
      if (state) {
        (state as any).analysisResult = report;
        (state as any).analysisStatus = 'completed';
        (state as any).analysisProgress = 100;
        (state as any).brandDnaGenerated = true;
        (state as any).completedAt = new Date();
        (state as any).status = 'completed';
        await state.save();
      }

      res.json(report);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Analysis failed');
      res.status(500).json({ error: error.message || 'Analysis failed' });
    }
  });

  router.get('/summary', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { OnboardingState } = await import('../models/onboarding/OnboardingState');
      const state = await OnboardingState.findOne({ userId: new (await import('mongoose')).default.Types.ObjectId(userId) });

      if (state && (state as any).analysisResult) {
        return res.json((state as any).analysisResult);
      }

      const summary = await onboardingService.getOnboardingSummary(userId);
      res.json(summary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/resume', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      const state = await onboardingService.resume(userId);
      if (!state) return res.status(404).json({ error: 'No onboarding state found' });
      res.json(state);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/abort', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      await onboardingService.abort(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/redirected', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });
      await onboardingService.markRedirected(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/linkedin-pdf', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const multer = require('multer');
      const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

      await new Promise<void>((resolve, reject) => {
        upload.single('pdf')(req, res, (err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: 'No file uploaded' });

      const pdfParse = require('pdf-parse');
      const data = await pdfParse(file.buffer);
      const rawText = data.text || '';

      logger.info({ textLength: rawText.length, first500: rawText.substring(0, 500) }, 'Raw PDF text extracted');

      const parsed = parseLinkedInPdf(rawText);
      logger.info({
        fullName: parsed.fullName || '(empty)',
        headline: parsed.headline ? parsed.headline.substring(0, 60) : '(empty)',
        aboutLength: parsed.about?.length || 0,
        experienceCount: parsed.experience?.length || 0,
        educationCount: parsed.education?.length || 0,
        skillsCount: parsed.skills?.length || 0,
        certificationsCount: parsed.certifications?.length || 0,
      }, 'LinkedIn PDF parse result');

      res.json({ parsed, fileInfo: { fileName: file.originalname, fileType: file.mimetype, fileSize: file.size } });
    } catch (error: any) {
      logger.error({ error }, 'LinkedIn PDF upload failed');
      res.status(500).json({ error: error.message || 'Failed to parse LinkedIn PDF' });
    }
  });

  router.post('/linkedin-pdf-data', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { fileInfo, parsedData } = req.body;
      logger.info({
        hasFile: !!fileInfo,
        hasParsed: !!parsedData,
        headline: parsedData?.headline || '(empty)',
        skills: parsedData?.skills?.length || 0,
        experience: parsedData?.experience?.length || 0,
      }, 'Storing LinkedIn PDF data');
      await onboardingService.completeStep(userId, 'linkedin_pdf', { fileInfo, parsedData });
      logger.info('LinkedIn PDF data stored successfully');
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to store LinkedIn PDF data');
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

function parseLinkedInPdf(rawText: string): any {
  logger.info({ textLength: rawText.length, firstChars: rawText.substring(0, 200) }, 'Starting LinkedIn PDF parse');

  const rawLines = rawText.split('\n');
  const lines = rawLines.map((l: string) => l.trim()).filter(Boolean);

  let fullName = '';
  let headline = '';
  let about = '';
  let location = '';
  let connections = '';
  const experience: any[] = [];
  const education: any[] = [];
  const skills: string[] = [];
  const certifications: any[] = [];
  const volunteerWork: any[] = [];
  const recommendations: any[] = [];
  const featured: any[] = [];

  let currentSection = '';
  let aboutLines: string[] = [];
  let currentExp: any = null;
  let currentEdu: any = null;

  const SECTION_NAMES = ['about', 'experience', 'education', 'skills', 'certifications', 'volunteer experience', 'volunteer', 'recommendations', 'featured', 'interests', 'people also viewed', 'licenses & certifications', 'licenses and certifications', 'projects', 'publications', 'patents', 'test scores', 'organizations'];

  function isSectionHeader(line: string): string | null {
    const lower = line.toLowerCase().trim();

    if (lower === 'about' || lower === 'summary') return 'about';
    if (lower === 'experience' || lower === 'work experience' || lower === 'work history') return 'experience';
    if (lower === 'education') return 'education';
    if (lower === 'featured' || lower === 'featured media') return 'featured';
    if (lower === 'interests' || lower === 'people also viewed') return '';

    if (lower.includes('skill')) return 'skills';
    if (lower.includes('certification') || lower.includes('license') || lower === 'courses') return 'certifications';
    if (lower.includes('volunteer')) return 'volunteer';
    if (lower.includes('recommendation')) return 'recommendations';
    if (lower.includes('project') && lower.length < 20) return 'projects';
    if (lower.includes('publication') && lower.length < 20) return 'publications';

    return null;
  }

  function isDateLine(line: string): boolean {
    return !!(
      line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\s*-\s*(Present|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4})$/i) ||
      line.match(/^\d{4}\s*-\s*(Present|\d{4})$/i) ||
      line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$/i) ||
      line.match(/^\d{1,2}\/\d{4}\s*-\s*(Present|\d{1,2}\/\d{4})$/i) ||
      line.match(/^(Present|\d{4}\s*-\s*(?:Present|\d{4}))$/i) ||
      line.match(/^\w+\s+\d{4}\s*-\s*(?:Present|\w+\s+\d{4})$/i)
    );
  }

  function isLocationLine(line: string): boolean {
    return !!(
      line.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z][a-z]+/) &&
      line.length < 60 &&
      !isSectionHeader(line) &&
      !line.match(/\d{4}/)
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase().trim();

    const detectedSection = isSectionHeader(line);
    if (detectedSection !== null) {
      if (detectedSection === '') { currentSection = ''; continue; }
      if (aboutLines.length > 0 && !about) {
        about = aboutLines.join(' ').trim();
        aboutLines = [];
      }
      if (currentExp) { experience.push(currentExp); currentExp = null; }
      if (currentEdu) { education.push(currentEdu); currentEdu = null; }
      currentSection = detectedSection;
      logger.info({ line: line.substring(0, 40), section: currentSection }, 'SECTION DETECTED');
      continue;
    }

    if (currentSection === 'about') {
      aboutLines.push(line);
      continue;
    }

    if (currentSection === 'experience') {
      if (isDateLine(line)) {
        if (currentExp) experience.push(currentExp);
        currentExp = { title: '', organization: '', location: '', description: '', startDate: line, endDate: '', current: lower.includes('present') };
        continue;
      }
      if (currentExp) {
        if (!currentExp.title) { currentExp.title = line; continue; }
        if (!currentExp.organization) { currentExp.organization = line; continue; }
        if (!currentExp.location && isLocationLine(line)) { currentExp.location = line; continue; }
        currentExp.description = currentExp.description ? currentExp.description + ' ' + line : line;
        continue;
      }
      if (isDateLine(line) || line.match(/\d{4}/)) {
        currentExp = { title: '', organization: '', location: '', description: '', startDate: line, endDate: '', current: lower.includes('present') };
        continue;
      }
      if (!currentExp && line.length > 3 && line.length < 100) {
        currentExp = { title: line, organization: '', location: '', description: '', startDate: '', endDate: '', current: false };
        continue;
      }
    }

    if (currentSection === 'education') {
      if (isDateLine(line) || line.match(/^\d{4}\s*(?:-\s*\d{4})?$/)) {
        if (currentEdu) education.push(currentEdu);
        currentEdu = { schoolName: '', degree: '', fieldOfStudy: '', startDate: line, endDate: '' };
        continue;
      }
      if (currentEdu) {
        if (!currentEdu.schoolName) { currentEdu.schoolName = line; continue; }
        if (!currentEdu.degree) { currentEdu.degree = line; continue; }
        currentEdu.fieldOfStudy = currentEdu.fieldOfStudy ? currentEdu.fieldOfStudy + ' ' + line : line;
        continue;
      }
      if (line.length > 3 && line.length < 100) {
        currentEdu = { schoolName: line, degree: '', fieldOfStudy: '', startDate: '', endDate: '' };
        continue;
      }
    }

    if (currentSection === 'skills') {
      if (line.length > 1 && line.length < 100 && !line.match(/^\d+$/)) {
        const cleaned = line.replace(/\s*·\s*\d+$/, '').replace(/\s*\(\d+\)$/, '').trim();
        if (cleaned.length > 1) skills.push(cleaned);
      }
      continue;
    }

    if (currentSection === 'certifications') {
      if (line.length > 2 && !line.match(/^\d+$/)) {
        const cleaned = line.replace(/\s*·\s*\d{4}$/, '').trim();
        if (cleaned.length > 2) certifications.push({ name: cleaned, authority: '', url: '' });
      }
      continue;
    }
  }

  if (aboutLines.length > 0 && !about) about = aboutLines.join(' ').trim();
  if (currentExp) experience.push(currentExp);
  if (currentEdu) education.push(currentEdu);

  if (!fullName) {
    for (const line of lines.slice(0, 5)) {
      if (line.length > 2 && line.length < 80 && !isSectionHeader(line) && !line.match(/^\d/) && !line.match(/linkedin/i) && !line.match(/connections/i)) {
        fullName = line;
        break;
      }
    }
  }

  if (!headline) {
    for (const line of lines.slice(0, 10)) {
      if (line !== fullName && line.length > 5 && line.length < 150 && !isSectionHeader(line) && !line.match(/^\d/) && !line.match(/linkedin/i) && !line.match(/connections/i) && !isLocationLine(line)) {
        headline = line;
        break;
      }
    }
  }

  for (const line of lines) {
    if (line.match(/^\d+\s+connections?$/i)) { connections = line; break; }
  }

  if (!location) {
    for (const line of lines.slice(0, 15)) {
      if (isLocationLine(line) && line !== fullName && line !== headline) { location = line; break; }
    }
  }

  const result = {
    fullName,
    headline,
    about,
    location,
    connections,
    experience,
    education,
    skills: [...new Set(skills)],
    certifications,
    volunteerWork,
    recommendations,
    featured,
    rawText: rawText.substring(0, 10000),
  };

  logger.info({
    fullName: fullName || '(empty)',
    headline: headline ? headline.substring(0, 50) : '(empty)',
    aboutLength: about.length,
    experienceCount: experience.length,
    educationCount: education.length,
    skillsCount: skills.length,
    certificationsCount: certifications.length,
  }, 'LinkedIn PDF parse complete');

  return result;
}
