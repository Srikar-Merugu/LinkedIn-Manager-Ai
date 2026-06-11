import { Router, Request, Response } from 'express';
import { analysisService } from '../services/analysis/AnalysisService';
import { getTokenFromReq, verifyToken } from '../utils/jwt';
import pino from 'pino';

const logger = pino({ name: 'analysis-report-route' });

export function createAnalysisReportRouter(): Router {
  const router = Router();

  function getUserId(req: Request): string | null {
    const token = getTokenFromReq(req);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
  }

  router.get('/report', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const report = await analysisService.getReport(userId);
      if (!report) return res.status(404).json({ error: 'No analysis report found' });

      res.json(report);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get analysis report');
      res.status(500).json({ error: error.message || 'Failed to get analysis report' });
    }
  });

  router.post('/generate', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const report = await analysisService.generateFullReport(userId);
      res.json(report);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to generate analysis report');
      res.status(500).json({ error: error.message || 'Failed to generate analysis report' });
    }
  });

  router.get('/section/:section', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required' });

      const { section } = req.params;
      const report = await analysisService.getReport(userId);
      if (!report) return res.status(404).json({ error: 'No analysis report found' });

      const validSections = ['scores', 'strengths', 'weaknesses', 'contentPillars', 'brandDNA', 'writingDNA', 'careerBlueprint', 'strategy90Days', 'contentCalendar', 'quickWins', 'opportunities', 'dashboardMetrics', 'linkedinAnalysis', 'resumeAnalysis', 'githubAnalysis'];

      if (!validSections.includes(section)) {
        return res.status(400).json({ error: `Invalid section. Valid: ${validSections.join(', ')}` });
      }

      res.json((report as any)[section] || null);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get analysis section');
      res.status(500).json({ error: error.message || 'Failed to get analysis section' });
    }
  });

  return router;
}
