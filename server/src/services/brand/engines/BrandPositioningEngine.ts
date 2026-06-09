import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';
import type { IPositioning } from '../../../models/brand/BrandDNA';

const logger = pino();

export class BrandPositioningEngine {

  analyze(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): IPositioning {
    const current = this.detectCurrentPositioning(report, parsed);
    const future = this.detectFuturePositioning(report, parsed);
    const statement = this.generatePositioningStatement(report, parsed, current, future);

    return {
      currentRole: report.identity.detectedRole || parsed.profile.headline || 'Professional',
      currentPositioning: current,
      futurePositioning: future,
      positioningStatement: statement,
    };
  }

  private detectCurrentPositioning(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): string[] {
    const identity = report.identity;
    const headline = parsed.profile.headline || '';
    const about = parsed.profile.about || '';
    const all = `${headline} ${about}`.toLowerCase();
    const positions: string[] = [];

    const patterns: Array<{ label: string; test: string | (() => boolean); priority: number }> = [
      { label: `${identity.detectedRole || 'Professional'}`, test: identity.detectedRole || '', priority: 1 },
    ];

    if (/student/.test(all) || parsed.summary.profileType === 'student') {
      positions.push('Student');
    }
    if (/developer|engineer|programmer|coder|software/.test(all)) {
      positions.push('Software Developer');
    }
    if (/full.?stack/.test(all)) {
      positions.push('Full Stack Developer');
    }
    if (/front.?end|frontend/.test(all)) {
      positions.push('Frontend Developer');
    }
    if (/back.?end|backend/.test(all)) {
      positions.push('Backend Developer');
    }
    if (/android|ios|mobile/.test(all)) {
      positions.push('Mobile Developer');
    }
    if (/ai|machine learning|deep learning|llm|generative/.test(all)) {
      positions.push('AI/ML Engineer');
    }
    if (/data.?scientist|data.?engineer|analytics/.test(all)) {
      positions.push('Data Professional');
    }
    if (/founder|co.?founder|ceo|entrepreneur/.test(all)) {
      positions.push('Founder');
    }
    if (/product.?manager|pm/.test(all)) {
      positions.push('Product Manager');
    }
    if (/designer|ux|ui/.test(all)) {
      positions.push('Designer');
    }
    if (/consultant|consulting/.test(all)) {
      positions.push('Consultant');
    }
    if (/researcher|research|scientist|phd/.test(all)) {
      positions.push('Researcher');
    }
    if (/writer|content|creator|blogger|journalist/.test(all)) {
      positions.push('Content Creator');
    }
    if (/teacher|professor|instructor|mentor|coach/.test(all)) {
      positions.push('Educator');
    }

    if (parsed.summary.profileType === 'founder') {
      if (!positions.some(p => p.includes('Founder'))) positions.push('Startup Builder');
    }
    if (parsed.summary.profileType === 'influencer') {
      positions.push('Thought Leader');
    }

    const unique = [...new Set(positions)].slice(0, 4);
    if (unique.length === 0) {
      unique.push('Professional');
    }

    return unique;
  }

  private detectFuturePositioning(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): string[] {
    const identity = report.identity;
    const career = report.career;
    const growthPaths = career?.growthPaths || [];
    const current = this.detectCurrentPositioning(report, parsed);
    const future: string[] = [];

    if (identity.growthDirection) {
      future.push(identity.growthDirection);
    }

    for (const path of growthPaths) {
      if (path.probability > 0.5) {
        future.push(path.title);
        if (future.length >= 3) break;
      }
    }

    const progressionMap: Record<string, string[]> = {
      'Student': ['Software Engineer', 'AI Engineer', 'Tech Founder'],
      'Software Developer': ['Senior Engineer', 'Tech Lead', 'Engineering Manager'],
      'Full Stack Developer': ['Senior Full Stack', 'Architect', 'CTO'],
      'Mobile Developer': ['Senior Mobile Dev', 'Mobile Architect', 'Product Lead'],
      'AI/ML Engineer': ['Senior AI Engineer', 'AI Researcher', 'AI Product Lead'],
      'Founder': ['Serial Founder', 'CEO', 'Investor'],
      'Product Manager': ['Senior PM', 'Director of Product', 'CPO'],
      'Content Creator': ['Thought Leader', 'Author', 'Speaker'],
      'Consultant': ['Senior Consultant', 'Practice Lead', 'Independent Advisor'],
    };

    if (future.length < 2) {
      for (const pos of current) {
        const mapped = progressionMap[pos];
        if (mapped) {
          for (const m of mapped) {
            if (!future.includes(m)) future.push(m);
            if (future.length >= 3) break;
          }
        }
        if (future.length >= 3) break;
      }
    }

    return future.slice(0, 4);
  }

  private generatePositioningStatement(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    currentPos: string[],
    futurePos: string[]
  ): string {
    const identity = report.identity;
    const firstName = parsed.profile.firstName || 'This professional';
    const currentRole = currentPos[0] || 'professional';
    const futureRole = futurePos[0] || 'industry leader';
    const topSkill = parsed.skills.topSkills[0] || 'their expertise';
    const industry = parsed.summary.industry || 'technology';

    const templates = [
      `${firstName} is a ${currentRole} building ${topSkill} ${industry} solutions while growing toward becoming a ${futureRole}.`,
      `A ${currentRole} focused on ${topSkill} in ${industry}, ${firstName} is on a path to become a ${futureRole}.`,
      `${firstName} combines ${currentRole} skills in ${topSkill} with a drive to become a ${futureRole} in ${industry}.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }
}

export const brandPositioningEngine = new BrandPositioningEngine();
