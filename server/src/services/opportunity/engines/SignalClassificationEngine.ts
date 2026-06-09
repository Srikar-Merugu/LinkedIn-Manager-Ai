import pino from 'pino';
import { SignalCategory } from '../../../models/opportunity/OpportunitySignal';

const logger = pino();

interface SignalInput {
  source: string;
  type: string;
  title: string;
  description: string;
  metadata: Record<string, any>;
}

interface ClassificationResult {
  category: SignalCategory;
  subCategory: string;
  confidence: number;
  reasoning: string;
}

export class SignalClassificationEngine {
  classify(signal: SignalInput): ClassificationResult {
    const { source, type, title, description, metadata } = signal;
    const text = `${title} ${description}`.toLowerCase();

    if (source === 'linkedin' && (type === 'new_position' || type === 'new_role')) {
      return { category: 'career', subCategory: 'role_change', confidence: 0.95, reasoning: 'LinkedIn position change is a career signal' };
    }
    if (source === 'linkedin' && type === 'new_skills') {
      return { category: 'learning', subCategory: 'skill_acquisition', confidence: 0.85, reasoning: 'New skills indicate learning growth' };
    }
    if (type.includes('certification') || source === 'certification') {
      return { category: 'learning', subCategory: 'certification', confidence: 0.9, reasoning: 'Certification earned is a learning achievement' };
    }
    if (source === 'github' && type === 'new_repository') {
      return { category: 'technical', subCategory: 'new_project', confidence: 0.85, reasoning: 'New GitHub repository is a technical signal' };
    }
    if (source === 'github' && type === 'milestone') {
      return { category: 'achievement', subCategory: 'github_milestone', confidence: 0.9, reasoning: 'GitHub milestone reached is an achievement' };
    }
    if (source === 'github' && type === 'significant_commits') {
      return { category: 'technical', subCategory: 'active_development', confidence: 0.8, reasoning: 'Significant commit activity indicates active development' };
    }
    if (source === 'portfolio' || source === 'blog') {
      return { category: 'authority', subCategory: 'content_published', confidence: 0.85, reasoning: 'Portfolio or blog update builds authority' };
    }
    if (type === 'case_study') {
      return { category: 'authority', subCategory: 'case_study', confidence: 0.9, reasoning: 'Case study demonstrates expertise' };
    }
    if (type === 'project_added' || type === 'portfolio_project' || type === 'new_project') {
      return { category: 'technical', subCategory: 'project_completion', confidence: 0.8, reasoning: 'New project completion is a technical signal' };
    }
    if (type === 'achievement') {
      return { category: 'achievement', subCategory: 'general_achievement', confidence: 0.85, reasoning: 'Achievement detected from resume/profile' };
    }
    if (source === 'resume' && type === 'new_role') {
      return { category: 'career', subCategory: 'career_progression', confidence: 0.9, reasoning: 'New role on resume indicates career progression' };
    }
    if (source === 'linkedin' && type === 'headline_update') {
      return { category: 'career', subCategory: 'positioning_update', confidence: 0.7, reasoning: 'Headline update signals positioning change' };
    }

    if (text.includes('founder') || text.includes('startup') || text.includes('launch')) {
      return { category: 'founder', subCategory: 'founder_activity', confidence: 0.75, reasoning: 'Founder-related activity detected' };
    }
    if (text.includes('community') || text.includes('meetup') || text.includes('conference') || text.includes('speaking')) {
      return { category: 'community', subCategory: 'community_engagement', confidence: 0.8, reasoning: 'Community engagement detected' };
    }
    if (text.includes('network') || text.includes('connection') || text.includes('collaboration')) {
      return { category: 'networking', subCategory: 'networking_activity', confidence: 0.7, reasoning: 'Networking activity detected' };
    }

    return { category: 'achievement', subCategory: 'uncategorized', confidence: 0.5, reasoning: 'Default classification - uncategorized signal' };
  }

  batchClassify(signals: SignalInput[]): ClassificationResult[] {
    return signals.map(s => this.classify(s));
  }
}

export const signalClassificationEngine = new SignalClassificationEngine();
