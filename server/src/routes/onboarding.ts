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

      const parsed = parseLinkedInPdf(rawText);
      logger.info({ textLength: rawText.length, sections: Object.keys(parsed) }, 'LinkedIn PDF parsed');

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
      await onboardingService.completeStep(userId, 'linkedin_pdf', { fileInfo, parsedData });
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

function parseLinkedInPdf(rawText: string): any {
  const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean);

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

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0 && !line.match(/^(Experience|Education|Skills|About|Certifications|Volunteer|Featured|Recommendations)/i)) {
      fullName = line;
      continue;
    }
    if (i === 1 && fullName && !line.match(/^(Experience|Education|Skills|About|Certifications|Volunteer|Featured|Recommendations)/i)) {
      headline = line;
      continue;
    }
    if (line.match(/^\d+\s+connections?$/i)) {
      connections = line;
      continue;
    }
    if (line.match(/^[A-Z][a-z]+(?:,\s*[A-Z][a-z]+)?$/) && !line.match(/^(Experience|Education|Skills|About|Certifications|Volunteer|Featured|Recommendations)/i) && fullName && !location) {
      location = line;
      continue;
    }

    if (line === 'About') { currentSection = 'about'; aboutLines = []; continue; }
    if (line === 'Experience') { currentSection = 'experience'; if (aboutLines.length > 0 && !about) about = aboutLines.join(' ').trim(); continue; }
    if (line === 'Education') { currentSection = 'education'; if (currentExp) { experience.push(currentExp); currentExp = null; } continue; }
    if (line === 'Skills') { currentSection = 'skills'; if (currentEdu) { education.push(currentEdu); currentEdu = null; } continue; }
    if (line === 'Certifications') { currentSection = 'certifications'; continue; }
    if (line === 'Volunteer Experience') { currentSection = 'volunteer'; continue; }
    if (line === 'Recommendations') { currentSection = 'recommendations'; continue; }
    if (line === 'Featured') { currentSection = 'featured'; continue; }
    if (line === 'Interests') { currentSection = ''; continue; }
    if (line === 'People also viewed') { currentSection = ''; continue; }

    if (currentSection === 'about') {
      aboutLines.push(line);
      continue;
    }

    if (currentSection === 'experience') {
      if (line.match(/^(Present|\d{4}\s*-\s*(?:Present|\d{4}|\w+\s+\d{4}))$/i) || line.match(/^\w+\s+\d{4}\s*-\s*(?:Present|\w+\s+\d{4})$/i)) {
        if (currentExp) experience.push(currentExp);
        currentExp = { title: '', organization: '', location: '', description: '', startDate: line, endDate: '', current: line.toLowerCase().includes('present') };
        continue;
      }
      if (currentExp && !currentExp.title) {
        currentExp.title = line;
        continue;
      }
      if (currentExp && !currentExp.organization) {
        currentExp.organization = line;
        continue;
      }
      if (currentExp && currentExp.title && currentExp.organization && !currentExp.location && line.length < 60 && !line.match(/^\d/)) {
        currentExp.location = line;
        continue;
      }
      if (currentExp && currentExp.title) {
        currentExp.description = currentExp.description ? currentExp.description + ' ' + line : line;
        continue;
      }
    }

    if (currentSection === 'education') {
      if (line.match(/^\d{4}\s*-\s*\d{4}$/i) || line.match(/^\d{4}$/)) {
        if (currentEdu) education.push(currentEdu);
        currentEdu = { schoolName: '', degree: '', fieldOfStudy: '', startDate: line, endDate: '' };
        continue;
      }
      if (currentEdu && !currentEdu.schoolName) {
        currentEdu.schoolName = line;
        continue;
      }
      if (currentEdu && !currentEdu.degree) {
        currentEdu.degree = line;
        continue;
      }
      if (currentEdu && currentEdu.degree) {
        currentEdu.fieldOfStudy = currentEdu.fieldOfStudy ? currentEdu.fieldOfStudy + ' ' + line : line;
        continue;
      }
    }

    if (currentSection === 'skills') {
      if (!line.match(/^\d+$/i) && line.length > 1 && line.length < 100) {
        skills.push(line);
      }
      continue;
    }

    if (currentSection === 'certifications') {
      if (!line.match(/^\d+$/i) && line.length > 2) {
        certifications.push({ name: line, authority: '', url: '' });
      }
      continue;
    }
  }

  if (aboutLines.length > 0 && !about) about = aboutLines.join(' ').trim();
  if (currentExp) experience.push(currentExp);
  if (currentEdu) education.push(currentEdu);

  return {
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
    rawText: rawText.substring(0, 5000),
  };
}
