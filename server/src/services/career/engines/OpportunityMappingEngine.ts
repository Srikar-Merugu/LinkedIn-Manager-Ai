import pino from 'pino';

const logger = pino();

export interface OpportunityMapResult {
  currentPosition: string;
  targetPosition: string;
  careerStage: string;
  gaps: Array<{
    category: 'skill' | 'experience' | 'network' | 'credential' | 'visibility';
    gap: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
    suggestedActions: string[];
  }>;
  transitionPaths: string[];
  recommendedRoles: string[];
  confidence: number;
}

interface ProfileInput {
  experience?: Array<{ title: string; company?: string; currentlyWorking?: boolean; endDate?: string }>;
  skills?: Array<{ name: string }>;
  headline?: string;
  about?: string;
  currentRole?: string;
  targetRole?: string;
}

const ROLE_TRANSITIONS: Record<string, string[]> = {
  'student': ['intern', 'graduate_trainee', 'associate', 'junior_developer'],
  'graduate': ['junior_developer', 'analyst', 'associate_engineer', 'consultant'],
  'junior_developer': ['mid_level_developer', 'senior_developer', 'lead_developer'],
  'mid_level_developer': ['senior_developer', 'tech_lead', 'architect', 'engineering_manager'],
  'senior_developer': ['tech_lead', 'architect', 'engineering_manager', 'cto', 'vp_engineering'],
  'analyst': ['senior_analyst', 'manager', 'consultant', 'director'],
  'consultant': ['senior_consultant', 'manager', 'engagement_manager', 'partner'],
  'designer': ['senior_designer', 'lead_designer', 'design_director', 'creative_director'],
  'product_manager': ['senior_pm', 'lead_pm', 'director_of_product', 'cpmo'],
  'founder': ['ceo', 'cto', 'co-founder', 'founder_in_residence'],
  'freelancer': ['consultant', 'agency_founder', 'studio_owner', 'senior_contractor'],
};

const ROLE_TO_STAGE: Record<string, string> = {
  'intern': 'entry',
  'graduate_trainee': 'entry',
  'junior_developer': 'entry',
  'associate': 'entry',
  'associate_engineer': 'entry',
  'mid_level_developer': 'mid',
  'analyst': 'mid',
  'consultant': 'mid',
  'product_manager': 'mid',
  'designer': 'mid',
  'senior_developer': 'senior',
  'senior_analyst': 'senior',
  'senior_consultant': 'senior',
  'senior_designer': 'senior',
  'senior_pm': 'senior',
  'tech_lead': 'senior',
  'engineering_manager': 'senior',
  'architect': 'senior',
  'director': 'executive',
  'vp_engineering': 'executive',
  'cto': 'executive',
  'ceo': 'executive',
  'partner': 'executive',
};

export class OpportunityMappingEngine {

  map(
    profile: ProfileInput,
    targetRole?: string
  ): OpportunityMapResult {
    const currentRole = this.detectCurrentRole(profile);
    const target = targetRole || this.suggestTargetRole(currentRole);

    const currentStage = ROLE_TO_STAGE[currentRole] || 'entry';
    const targetStage = ROLE_TO_STAGE[target] || 'mid';

    const gaps = this.identifyGaps(profile, currentRole, target);
    const transitionPaths = ROLE_TRANSITIONS[currentRole] || [];
    const recommendedRoles = this.findRecommendedRoles(currentRole);

    const confidence = this.calculateConfidence(profile, currentRole);

    logger.info({ currentRole, targetRole: target, gapCount: gaps.length }, 'Opportunity map generated');

    return {
      currentPosition: currentRole,
      targetPosition: target,
      careerStage: currentStage,
      gaps,
      transitionPaths,
      recommendedRoles,
      confidence,
    };
  }

  private detectCurrentRole(profile: ProfileInput): string {
    if (profile.currentRole) return profile.currentRole;

    const exp = profile.experience || [];
    const current = exp.find(e => e.currentlyWorking || (!e.endDate));
    const title = (current?.title || profile.headline || '').toLowerCase();

    if (title.includes('founder') || title.includes('ceo') || title.includes('co-founder')) return 'founder';
    if (title.includes('freelance') || title.includes('self-employed')) return 'freelancer';
    if (title.includes('intern')) return 'intern';
    if (title.includes('junior') || title.includes('graduate') || title.includes('associate')) return 'junior_developer';
    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) return 'senior_developer';
    if (title.includes('manager') || title.includes('director') || title.includes('head')) return 'engineering_manager';
    if (title.includes('architect') || title.includes('staff')) return 'architect';
    if (title.includes('product') || title.includes('pm')) return 'product_manager';
    if (title.includes('design')) return 'designer';
    if (title.includes('consultant')) return 'consultant';
    if (title.includes('analyst')) return 'analyst';
    if (title.includes('cto') || title.includes('vp') || title.includes('chief')) return 'cto';

    const headline = profile.headline?.toLowerCase() || '';
    if (headline.includes('student')) return 'student';
    if (headline.includes('graduate')) return 'graduate';

    return 'mid_level_developer';
  }

  private suggestTargetRole(currentRole: string): string {
    const transitions = ROLE_TRANSITIONS[currentRole];
    if (transitions && transitions.length > 0) {
      return transitions[0];
    }
    return 'senior_developer';
  }

  private identifyGaps(
    profile: ProfileInput,
    currentRole: string,
    targetRole: string
  ): OpportunityMapResult['gaps'] {
    const gaps: OpportunityMapResult['gaps'] = [];

    const skillsCount = profile.skills?.length || 0;
    const experienceCount = profile.experience?.length || 0;

    if (currentRole !== targetRole) {
      const stageDiff = (ROLE_TO_STAGE[targetRole] || 'mid') !== (ROLE_TO_STAGE[currentRole] || 'entry');

      if (stageDiff) {
        gaps.push({
          category: 'experience',
          gap: `Need experience at ${currentRole} level before transitioning to ${targetRole}`,
          severity: 'high',
          effort: 'high',
          suggestedActions: [
            `Seek stretch projects at current level`,
            `Find mentors at ${targetRole} level`,
            `Document measurable impact in current role`,
          ],
        });
      }

      gaps.push({
        category: 'skill',
        gap: `Skills required for ${targetRole} not yet demonstrated`,
        severity: 'critical',
        effort: 'medium',
        suggestedActions: [
          `Research top ${skillsCount > 0 ? skillsCount : 5} skills required for ${targetRole}`,
          `Identify skill gaps through job descriptions`,
          `Build portfolio projects demonstrating target skills`,
        ],
      });
    }

    if (skillsCount < 10) {
      gaps.push({
        category: 'skill',
        gap: 'Limited skill set breadth',
        severity: 'medium',
        effort: 'low',
        suggestedActions: [
          'Add skills to your profile',
          'Take online courses to expand expertise',
          'Get certifications in core competencies',
        ],
      });
    }

    if (experienceCount < 2) {
      gaps.push({
        category: 'experience',
        gap: 'Limited professional experience depth',
        severity: 'medium',
        effort: 'high',
        suggestedActions: [
          'Take on freelance or contract work',
          'Contribute to open source projects',
          'Build and ship personal projects',
        ],
      });
    }

    gaps.push({
      category: 'visibility',
      gap: 'Professional brand visibility needed for career advancement',
      severity: 'high',
      effort: 'medium',
      suggestedActions: [
        'Create content about your expertise',
        'Build a portfolio website',
        'Engage with relevant professional communities',
        'Publish case studies and project breakdowns',
      ],
    });

    gaps.push({
      category: 'network',
      gap: 'Strategic network building required',
      severity: 'medium',
      effort: 'medium',
      suggestedActions: [
        `Connect with professionals in ${targetRole} roles`,
        'Join industry-specific communities',
        'Attend relevant conferences and meetups',
        'Seek mentorship from experienced professionals',
      ],
    });

    return gaps;
  }

  private findRecommendedRoles(currentRole: string): string[] {
    const transitions = ROLE_TRANSITIONS[currentRole];
    if (transitions) return transitions.slice(0, 4);
    return ['mid_level_developer', 'senior_developer', 'tech_lead', 'engineering_manager'];
  }

  private calculateConfidence(profile: ProfileInput, currentRole: string): number {
    const hasSkills = (profile.skills?.length || 0) > 0;
    const hasExperience = (profile.experience?.length || 0) > 0;
    const hasHeadline = !!profile.headline;
    const hasAbout = !!profile.about;

    const signals = [hasSkills, hasExperience, hasHeadline, hasAbout].filter(Boolean).length;
    return Math.min(signals / 4 + 0.3, 0.95);
  }
}

export const opportunityMappingEngine = new OpportunityMappingEngine();
