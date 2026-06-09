import mongoose from 'mongoose';
import pino from 'pino';
import { OpportunitySignal, IOpportunitySignal } from '../../../models/opportunity/OpportunitySignal';

const logger = pino();

interface SourceData {
  linkedin?: {
    headline?: string;
    position?: string;
    newSkills?: string[];
    newCertifications?: string[];
    activity?: Array<{ type: string; content: string }>;
  };
  github?: {
    repos?: Array<{ name: string; description?: string; language?: string; stars?: number }>;
    commits?: Array<{ repo: string; message: string }>;
    milestones?: Array<{ type: string; value: number }>;
  };
  resume?: {
    newRole?: string;
    newSkills?: string[];
    newProjects?: Array<{ name: string; description: string }>;
    achievements?: string[];
  };
  portfolio?: {
    newProjects?: Array<{ title: string; description: string; url?: string }>;
    caseStudies?: Array<{ title: string; summary: string }>;
    blogs?: Array<{ title: string; url?: string }>;
  };
  certifications?: Array<{ name: string; issuer: string; date?: string }>;
  projects?: Array<{ title: string; description: string; technologies?: string[] }>;
}

export class SignalDetectionEngine {
  async detectFromAll(userId: mongoose.Types.ObjectId, data: SourceData): Promise<IOpportunitySignal[]> {
    logger.info({ userId }, 'Detecting signals from all sources');
    const signals: IOpportunitySignal[] = [];

    if (data.linkedin) signals.push(...await this.detectLinkedIn(userId, data.linkedin) as IOpportunitySignal[]);
    if (data.github) signals.push(...await this.detectGitHub(userId, data.github) as IOpportunitySignal[]);
    if (data.resume) signals.push(...await this.detectResume(userId, data.resume) as IOpportunitySignal[]);
    if (data.portfolio) signals.push(...await this.detectPortfolio(userId, data.portfolio) as IOpportunitySignal[]);
    if (data.certifications) signals.push(...await this.detectCertifications(userId, data.certifications) as IOpportunitySignal[]);
    if (data.projects) signals.push(...await this.detectProjects(userId, data.projects) as IOpportunitySignal[]);

    const saved: IOpportunitySignal[] = [];
    for (const signal of signals) {
      const existing = await OpportunitySignal.findOne({
        userId, source: signal.source, type: signal.type, title: signal.title, detectedAt: { $gte: new Date(Date.now() - 86400000) },
      });
      if (!existing) {
        const doc = await OpportunitySignal.create(signal);
        saved.push(doc);
      }
    }

    logger.info({ detected: saved.length }, 'New signals detected');
    return saved;
  }

  private async detectLinkedIn(userId: mongoose.Types.ObjectId, data: any): Promise<Partial<IOpportunitySignal>[]> {
    const signals: Partial<IOpportunitySignal>[] = [];
    if (data.position) signals.push({ userId, source: 'linkedin', type: 'new_position', title: `New position: ${data.position}`, description: `Started a new role`, metadata: { position: data.position }, confidence: 0.9 });
    if (data.newSkills?.length) signals.push({ userId, source: 'linkedin', type: 'new_skills', title: `Added ${data.newSkills.length} new skills`, description: `Skills: ${data.newSkills.join(', ')}`, metadata: { skills: data.newSkills }, confidence: 0.85 });
    if (data.newCertifications?.length) signals.push({ userId, source: 'linkedin', type: 'certification', title: `Earned: ${data.newCertifications[0]}`, description: `New certification on LinkedIn`, metadata: { certifications: data.newCertifications }, confidence: 0.9 });
    if (data.headline) signals.push({ userId, source: 'linkedin', type: 'headline_update', title: `Updated headline`, description: `New headline: ${data.headline}`, metadata: { headline: data.headline }, confidence: 0.7 });
    return signals;
  }

  private async detectGitHub(userId: mongoose.Types.ObjectId, data: any): Promise<Partial<IOpportunitySignal>[]> {
    const signals: Partial<IOpportunitySignal>[] = [];
    if (data.repos?.length) {
      for (const repo of data.repos) {
        signals.push({ userId, source: 'github', type: 'new_repository', title: `New repo: ${repo.name}`, description: repo.description || `Created ${repo.name}`, metadata: { repo }, confidence: 0.85 });
      }
    }
    if (data.commits?.length) {
      const reposWithCommits = [...new Set(data.commits.map((c: any) => c.repo))];
      for (const repo of reposWithCommits) {
        const count = data.commits.filter((c: any) => c.repo === repo).length;
        signals.push({ userId, source: 'github', type: 'significant_commits', title: `${count} new commits to ${repo}`, description: `Active development on ${repo}`, metadata: { repo, commitCount: count }, confidence: 0.8 });
      }
    }
    if (data.milestones?.length) {
      for (const m of data.milestones) {
        signals.push({ userId, source: 'github', type: 'milestone', title: `GitHub milestone: ${m.type}`, description: `Reached ${m.value} ${m.type}`, metadata: { milestone: m }, confidence: 0.9 });
      }
    }
    return signals;
  }

  private async detectResume(userId: mongoose.Types.ObjectId, data: any): Promise<Partial<IOpportunitySignal>[]> {
    const signals: Partial<IOpportunitySignal>[] = [];
    if (data.newRole) signals.push({ userId, source: 'resume', type: 'new_role', title: `New role: ${data.newRole}`, description: `Added new role to resume`, metadata: { role: data.newRole }, confidence: 0.95 });
    if (data.newSkills?.length) signals.push({ userId, source: 'resume', type: 'skills_added', title: `${data.newSkills.length} new skills on resume`, description: `Skills: ${data.newSkills.join(', ')}`, metadata: { skills: data.newSkills }, confidence: 0.8 });
    if (data.newProjects?.length) {
      for (const p of data.newProjects) {
        signals.push({ userId, source: 'resume', type: 'project_added', title: `Project: ${p.name}`, description: p.description, metadata: { project: p }, confidence: 0.85 });
      }
    }
    if (data.achievements?.length) {
      for (const a of data.achievements) {
        signals.push({ userId, source: 'resume', type: 'achievement', title: `Achievement: ${a}`, description: a, metadata: { achievement: a }, confidence: 0.9 });
      }
    }
    return signals;
  }

  private async detectPortfolio(userId: mongoose.Types.ObjectId, data: any): Promise<Partial<IOpportunitySignal>[]> {
    const signals: Partial<IOpportunitySignal>[] = [];
    if (data.newProjects?.length) {
      for (const p of data.newProjects) {
        signals.push({ userId, source: 'portfolio', type: 'portfolio_project', title: `Portfolio: ${p.title}`, description: p.description, metadata: { project: p }, confidence: 0.85 });
      }
    }
    if (data.caseStudies?.length) {
      for (const cs of data.caseStudies) {
        signals.push({ userId, source: 'portfolio', type: 'case_study', title: `Case study: ${cs.title}`, description: cs.summary, metadata: { caseStudy: cs }, confidence: 0.9 });
      }
    }
    if (data.blogs?.length) {
      for (const b of data.blogs) {
        signals.push({ userId, source: 'blog', type: 'new_blog', title: `New blog: ${b.title}`, description: b.title, metadata: { blog: b }, confidence: 0.85 });
      }
    }
    return signals;
  }

  private async detectCertifications(userId: mongoose.Types.ObjectId, data: any[]): Promise<Partial<IOpportunitySignal>[]> {
    return data.map(c => ({
      userId, source: 'certification' as const, type: 'certification_earned', title: `Certification: ${c.name}`, description: `Earned ${c.name} from ${c.issuer}`, metadata: { certification: c }, confidence: 0.95,
    }));
  }

  private async detectProjects(userId: mongoose.Types.ObjectId, data: any[]): Promise<Partial<IOpportunitySignal>[]> {
    return data.map(p => ({
      userId, source: 'project' as const, type: 'new_project', title: `Project: ${p.title}`, description: p.description, metadata: { project: p }, confidence: 0.9,
    }));
  }
}

export const signalDetectionEngine = new SignalDetectionEngine();
