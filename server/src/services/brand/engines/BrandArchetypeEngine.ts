import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';

const logger = pino();

export interface ArchetypeResult {
  primary: { name: string; confidence: number; description: string; evidence: string[] };
  secondary?: { name: string; confidence: number; description: string; evidence: string[] };
}

interface ArchetypeDef {
  name: string;
  evaluate: (all: string, report: ExpandedIntelligenceReport, parsed: ParsedProfile, expertiseNames: string[]) => { score: number; evidence: string[] };
  description: string;
}

export class BrandArchetypeEngine {

  analyze(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): ArchetypeResult {
    const identity = report.identity;
    const headline = parsed.profile.headline || '';
    const about = parsed.profile.about || '';
    const all = `${headline} ${about} ${identity.summary}`.toLowerCase();
    const expertiseNames = [
      ...(report.expertise?.primary || []),
      ...(report.expertise?.secondary || []),
    ].map(e => e.name.toLowerCase());

    const defs = this.getDefinitions();
    const scored = defs.map(d => {
      const result = d.evaluate(all, report, parsed, expertiseNames);
      return {
        name: d.name,
        description: d.description,
        confidence: Math.min(result.score, 1),
        evidence: result.evidence,
      };
    }).filter(a => a.confidence > 0.05)
      .sort((a, b) => b.confidence - a.confidence);

    if (scored.length === 0) {
      return {
        primary: {
          name: 'The Professional',
          confidence: 0.5,
          description: 'A dedicated professional committed to excellence and continuous growth.',
          evidence: ['Default archetype — experience detected but no strong archetype signals'],
        },
      };
    }

    const primary = scored[0];
    const secondary = scored.length > 1 && scored[1].confidence > 0.3 ? scored[1] : undefined;

    return {
      primary: {
        name: primary.name,
        confidence: primary.confidence,
        description: primary.description,
        evidence: primary.evidence,
      },
      secondary: secondary ? {
        name: secondary.name,
        confidence: secondary.confidence,
        description: secondary.description,
        evidence: secondary.evidence,
      } : undefined,
    };
  }

  private getDefinitions(): ArchetypeDef[] {
    return [
      {
        name: 'The Builder',
        description: 'A hands-on creator who builds products, teams, and organizations from the ground up.',
        evaluate: (all, _r, parsed) => {
          let s = 0; const ev: string[] = [];
          if (/built|created|developed|architect|engineer|designed|ship|launch/i.test(all)) { s += 0.3; ev.push('Action-oriented building language detected'); }
          if (/founder|co-founder|cto|vp.engineering/i.test(all)) { s += 0.25; ev.push('Founder/CTO role'); }
          if (parsed.summary.profileType === 'founder') { s += 0.2; ev.push('Profile classified as founder'); }
          if (parsed.summary.totalProjects >= 3) { s += 0.1; ev.push(`${parsed.summary.totalProjects}+ projects`); }
          if (/building/i.test(all)) { s += 0.15; ev.push('Emphasizes building in profile'); }
          return { score: s, evidence: ev };
        },
      },
      {
        name: 'The Educator',
        description: 'A natural teacher who empowers others through knowledge sharing and mentorship.',
        evaluate: (all, _r, parsed, expertiseNames) => {
          let s = 0; const ev: string[] = [];
          if (/teach|mentor|coach|educat|train|guide|help|learn|share|tutorial/i.test(all)) { s += 0.3; ev.push('Teaching/mentoring language detected'); }
          if (/professor|instructor|teacher|faculty/i.test(all)) { s += 0.25; ev.push('Education role'); }
          if (parsed.content.totalPosts > 10 && parsed.content.averageEngagement > 50) { s += 0.2; ev.push('Active content creator with engagement'); }
          if (expertiseNames.some(n => /teach|educat|learn|coach/.test(n))) { s += 0.15; ev.push('Teaching-related expertise'); }
          return { score: s, evidence: ev };
        },
      },
      {
        name: 'The Innovator',
        description: 'A forward-thinking professional who drives change through innovation and novel approaches.',
        evaluate: (all, report, parsed) => {
          let s = 0; const ev: string[] = [];
          if (/innovate|disrupt|transform|cutting.edge|breakthrough|next.gen|future|novel/i.test(all)) { s += 0.35; ev.push('Innovation/disruption language'); }
          if (/startup|building|created|launched|founded|experiment/i.test(all)) { s += 0.2; ev.push('Startup/experimentation context'); }
          if (report.identity.growthDirection?.toLowerCase().includes('innovation')) { s += 0.2; ev.push('Growth direction: innovation'); }
          if (/patent|novel|pioneer|first/i.test(all)) { s += 0.2; ev.push('Pioneering contributions'); }
          return { score: s, evidence: ev };
        },
      },
      {
        name: 'The Authority',
        description: 'A recognized industry expert who sets standards and influences through deep knowledge.',
        evaluate: (all, report, parsed) => {
          let s = 0; const ev: string[] = [];
          if (/authority|thought.leader|industry expert|leading|top|recognized|award/i.test(all)) { s += 0.3; ev.push('Authority/recognition signals'); }
          if (report.scores?.authority?.current && report.scores.authority.current > 60) { s += 0.25; ev.push('High authority score'); }
          if (/speaker|keynote|panelist|moderator|published/i.test(all)) { s += 0.2; ev.push('Public speaking/publications'); }
          if (parsed.summary.totalExperienceYears > 10) { s += 0.15; ev.push(`${parsed.summary.totalExperienceYears}+ years experience`); }
          return { score: s, evidence: ev };
        },
      },
      {
        name: 'The Connector',
        description: 'A relationship-builder who thrives on creating meaningful connections and communities.',
        evaluate: (all, _r, parsed) => {
          let s = 0; const ev: string[] = [];
          if (/connect|network|community|relation|partner|collaborat|ecosystem/i.test(all)) { s += 0.3; ev.push('Community/connection language'); }
          if (/recruiter|talent|hr|people|community.manager/i.test(all)) { s += 0.25; ev.push('People-focused role'); }
          if (parsed.content.totalEngagements > 50) { s += 0.15; ev.push('High engagement activity'); }
          if (/alliance|partnership|ecosystem/i.test(all)) { s += 0.2; ev.push('Partnership/alliance language'); }
          return { score: s, evidence: ev };
        },
      },
      {
        name: 'The Storyteller',
        description: 'A compelling communicator who uses narrative to inspire, inform, and influence.',
        evaluate: (all, _r, parsed) => {
          let s = 0; const ev: string[] = [];
          if (/story|narrative|content|write|blog|article|author|journal/i.test(all)) { s += 0.3; ev.push('Storytelling/content language'); }
          if (parsed.content.totalPosts > 20) { s += 0.2; ev.push(`${parsed.content.totalPosts}+ posts`); }
          if (/storytelling|content.creator|writer|journalist/i.test(all)) { s += 0.2; ev.push('Content professional'); }
          if (parsed.content.averageEngagement > 100) { s += 0.2; ev.push('High content engagement'); }
          return { score: s, evidence: ev };
        },
      },
      {
        name: 'The Expert',
        description: 'A deep specialist with unparalleled expertise in their chosen domain.',
        evaluate: (all, report, parsed) => {
          let s = 0; const ev: string[] = [];
          if (report.expertise?.primary?.length >= 2) { s += 0.25; ev.push(`${report.expertise.primary.length}+ primary expertise areas`); }
          if (parsed.summary.totalSkills > 30) { s += 0.15; ev.push(`${parsed.summary.totalSkills}+ skills`); }
          if (parsed.summary.totalCertifications > 3) { s += 0.15; ev.push(`${parsed.summary.totalCertifications}+ certifications`); }
          if (parsed.summary.totalExperienceYears > 8) { s += 0.15; ev.push(`${parsed.summary.totalExperienceYears}+ years`); }
          if (/specialist|expert|senior|principal|staff/i.test(all)) { s += 0.2; ev.push('Seniority/expertise signals'); }
          return { score: s, evidence: ev };
        },
      },
      {
        name: 'The Visionary',
        description: 'A strategic leader who paints a compelling picture of what could be and inspires others to join.',
        evaluate: (all, report, parsed) => {
          let s = 0; const ev: string[] = [];
          if (/vision|future|trend|predict|movement|purpose|mission/i.test(all)) { s += 0.35; ev.push('Vision/mission language'); }
          if (/ceo|founder|director|head|lead/i.test(all)) { s += 0.2; ev.push('Leadership role'); }
          if (report.identity.growthDirection?.toLowerCase().includes('leadership')) { s += 0.2; ev.push('Growth direction: leadership'); }
          if (/strategic|roadmap|long.term|transform|pioneer/i.test(all)) { s += 0.2; ev.push('Strategic language'); }
          return { score: s, evidence: ev };
        },
      },
    ];
  }
}

export const brandArchetypeEngine = new BrandArchetypeEngine();
