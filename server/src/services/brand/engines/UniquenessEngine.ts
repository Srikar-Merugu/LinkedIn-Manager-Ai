import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';
import type { IUniquenessFactor } from '../../../models/brand/BrandDNA';

const logger = pino();

export class UniquenessEngine {

  analyze(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): {
    factors: IUniquenessFactor[];
    uniqueValueProposition: string;
  } {
    const factors: IUniquenessFactor[] = [];
    const about = parsed.profile.about || '';
    const headline = parsed.profile.headline || '';
    const currentRole = parsed.experience.careerProgression[0] || '';
    const prevRole = parsed.experience.careerProgression[parsed.experience.careerProgression.length - 1] || '';

    const skillCombinations = this.findUniqueSkillCombinations(parsed);
    for (const combo of skillCombinations) {
      factors.push({
        factor: combo,
        evidence: [`Skills in ${parsed.skills.topSkills.slice(0, 3).join(', ')}`],
        category: 'skill_combination',
        weight: 0.8,
      });
    }

    const careerArc = this.analyzeCareerArc(parsed, report);
    if (careerArc) {
      factors.push(careerArc);
    }

    const perspective = this.findPerspective(parsed, report);
    if (perspective) {
      factors.push(perspective);
    }

    const achievements = this.findAchievements(parsed, report);
    for (const a of achievements) {
      factors.push(a);
    }

    const approach = this.findUniqueApproach(parsed, report);
    if (approach) {
      factors.push(approach);
    }

    if (factors.length === 0) {
      factors.push({
        factor: `${parsed.summary.totalExperienceYears}+ years of diverse experience across ${parsed.experience.uniqueCompanies} organizations`,
        evidence: [`Career spanning ${parsed.experience.totalRoles} roles`],
        category: 'journey',
        weight: 0.5,
      });
    }

    factors.sort((a, b) => b.weight - a.weight);

    const uvp = this.generateUVP(report, parsed, factors);

    return { factors, uniqueValueProposition: uvp };
  }

  private findUniqueSkillCombinations(parsed: ParsedProfile): string[] {
    const combos: string[] = [];
    const skills = parsed.skills.topSkills;
    const about = (parsed.profile.about || '').toLowerCase();

    if (skills.length >= 2) {
      combos.push(`Combines ${skills[0]} with ${skills[1]}`);
    }
    if (skills.length >= 3) {
      combos.push(`Unique blend of ${skills[0]}, ${skills[1]}, and ${skills.slice(2, 4).join(', ')}`);
    }

    const hasTechnical = skills.some(s => /react|python|java|javascript|typescript|node|go|rust|swift|kotlin|sql|aws|docker/i.test(s));
    const hasCreative = skills.some(s => /design|writing|content|product|strategy|marketing|brand/i.test(s));

    if (hasTechnical && hasCreative) {
      combos.push('Bridges technical execution with creative strategy');
    }

    const hasBuilder = skills.some(s => /founder|startup|entrepreneurship|product/i.test(s));
    const hasMaker = skills.some(s => /developer|engineer|architect|coder|programmer/i.test(s));

    if (hasBuilder && hasMaker) {
      combos.push('Builds and ships products end-to-end');
    }

    return combos;
  }

  private analyzeCareerArc(
    parsed: ParsedProfile,
    report: ExpandedIntelligenceReport
  ): IUniquenessFactor | null {
    const progression = parsed.experience.careerProgression;
    const identity = report.identity;

    if (progression.length >= 2) {
      const from = progression[progression.length - 1];
      const to = progression[0];

      if (this.isSignificantTransition(from, to)) {
        return {
          factor: `Career transition: from "${from}" to "${to}"`,
          evidence: [`${parsed.experience.totalRoles} roles across ${parsed.experience.uniqueCompanies} organizations`],
          category: 'journey',
          weight: 0.9,
        };
      }

      if (this.isRapidProgression(parsed)) {
        return {
          factor: `Rapid career growth: ${parsed.experience.totalRoles} roles in ${parsed.summary.totalExperienceYears} years`,
          evidence: [`Average tenure: ${Math.round(parsed.experience.averageRoleDuration)} months per role`],
          category: 'journey',
          weight: 0.75,
        };
      }
    }

    if (parsed.summary.profileType === 'founder' || identity.detectedRole?.toLowerCase().includes('founder')) {
      return {
        factor: `Startup founder building in ${parsed.summary.industry || 'technology'}`,
        evidence: [`Profile type identified as ${parsed.summary.profileType}`],
        category: 'journey',
        weight: 0.85,
      };
    }

    if (parsed.summary.profileType === 'student' && parsed.experience.totalRoles > 0) {
      return {
        factor: `Student with hands-on experience: already working while studying`,
        evidence: [`${parsed.experience.totalRoles} roles while in ${parsed.education.highestDegree || 'school'}`],
        category: 'journey',
        weight: 0.7,
      };
    }

    return null;
  }

  private isSignificantTransition(from: string, to: string): boolean {
    const categories: Record<string, string[]> = {
      engineering: ['engineer', 'developer', 'programmer', 'coder', 'architect', 'full stack'],
      design: ['designer', 'ux', 'ui', 'creative', 'art'],
      product: ['product manager', 'pm', 'product owner'],
      business: ['consultant', 'analyst', 'strategy', 'business'],
      founder: ['founder', 'co-founder', 'ceo', 'entrepreneur'],
      content: ['writer', 'content', 'creator', 'journalist', 'blogger'],
    };

    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    let fromCategory = '';
    let toCategory = '';

    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(k => fromLower.includes(k))) fromCategory = cat;
      if (keywords.some(k => toLower.includes(k))) toCategory = cat;
    }

    return fromCategory !== '' && toCategory !== '' && fromCategory !== toCategory;
  }

  private isRapidProgression(parsed: ParsedProfile): boolean {
    const roles = parsed.experience.totalRoles;
    const years = parsed.summary.totalExperienceYears;
    return roles >= 3 && years <= 6;
  }

  private findPerspective(
    parsed: ParsedProfile,
    report: ExpandedIntelligenceReport
  ): IUniquenessFactor | null {
    const about = (parsed.profile.about || '').toLowerCase();

    if (/building in public|learn in public|document.*journey|sharing.*process/i.test(about)) {
      return {
        factor: 'Builds in public and shares the journey transparently',
        evidence: ['About section emphasizes public learning and sharing'],
        category: 'approach',
        weight: 0.85,
      };
    }

    if (/first.?gen|first.?generation|immigrant|self.?taught/i.test(about)) {
      return {
        factor: 'First-generation perspective brings unique insights',
        evidence: ['Background mentioned in profile'],
        category: 'perspective',
        weight: 0.9,
      };
    }

    if (/open.?source|contributor|community/i.test(about)) {
      return {
        factor: 'Active open source contributor and community builder',
        evidence: ['Open source involvement mentioned in profile'],
        category: 'approach',
        weight: 0.75,
      };
    }

    if (parsed.content.totalPosts > 5) {
      return {
        factor: 'Documents and shares professional journey through content',
        evidence: [`${parsed.content.totalPosts} posts and articles published`],
        category: 'approach',
        weight: 0.7,
      };
    }

    return null;
  }

  private findAchievements(
    parsed: ParsedProfile,
    report: ExpandedIntelligenceReport
  ): IUniquenessFactor[] {
    const achievements: IUniquenessFactor[] = [];

    if (parsed.summary.totalCertifications > 3) {
      achievements.push({
        factor: `Certified professional with ${parsed.summary.totalCertifications} credentials`,
        evidence: [`${parsed.summary.totalCertifications} certifications`],
        category: 'achievement',
        weight: 0.7,
      });
    }

    if (parsed.summary.totalProjects > 3) {
      achievements.push({
        factor: `Built ${parsed.summary.totalProjects}+ projects showcasing practical skills`,
        evidence: [`${parsed.summary.totalProjects} projects listed`],
        category: 'achievement',
        weight: 0.75,
      });
    }

    if (parsed.experience.uniqueCompanies >= 3) {
      achievements.push({
        factor: `Diverse experience across ${parsed.experience.uniqueCompanies} different organizations`,
        evidence: [`Worked at ${parsed.experience.uniqueCompanies} companies`],
        category: 'achievement',
        weight: 0.6,
      });
    }

    if (parsed.education.universities.length > 0 && parsed.experience.totalRoles > 0) {
      achievements.push({
        factor: `Combines ${parsed.education.highestDegree || 'formal education'} in ${parsed.education.fieldOfStudy[0] || ''} with practical experience`,
        evidence: [`Education at ${parsed.education.universities[0]}`],
        category: 'achievement',
        weight: 0.65,
      });
    }

    return achievements;
  }

  private findUniqueApproach(
    parsed: ParsedProfile,
    report: ExpandedIntelligenceReport
  ): IUniquenessFactor | null {
    const about = (parsed.profile.about || '').toLowerCase();
    const skills = parsed.skills.topSkills;

    if (skills.length >= 5) {
      const skillRange = skills.length;
      return {
        factor: `Broad skill set spanning ${skillRange} different areas — from ${skills[0]} to ${skills[skillRange - 1]}`,
        evidence: [`${skillRange} skills in profile`],
        category: 'approach',
        weight: 0.6,
      };
    }

    if (/intersection|bridge|between|cross.?functional/i.test(about)) {
      return {
        factor: 'Works at the intersection of multiple disciplines',
        evidence: ['Profile emphasizes cross-functional work'],
        category: 'approach',
        weight: 0.8,
      };
    }

    return null;
  }

  private generateUVP(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    factors: IUniquenessFactor[]
  ): string {
    const identity = report.identity;
    const topSkill = parsed.skills.topSkills[0] || 'professional expertise';
    const topFactor = factors[0]?.factor || 'a unique professional background';
    const audience = identity.audienceType || 'professionals';

    const templates = [
      `${topFactor}. I help ${audience} achieve ${identity.growthDirection || 'career growth'} through ${topSkill.toLowerCase()}.`,
      `I combine ${parsed.skills.topSkills.slice(0, 2).join(' and ')} to help ${audience} ${identity.growthDirection?.toLowerCase() || 'succeed'}. ${topFactor}`,
      `As someone who ${topFactor.toLowerCase()}, I bring a unique perspective to ${identity.growthDirection?.toLowerCase() || 'helping others grow'} in ${parsed.summary.industry || 'technology'}.`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }
}

export const uniquenessEngine = new UniquenessEngine();
