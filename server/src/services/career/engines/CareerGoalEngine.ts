import pino from 'pino';

const logger = pino();

export interface GoalSuggestion {
  type: string;
  label: string;
  description: string;
  confidence: number;
  evidence: string[];
}

interface ProfileInput {
  headline?: string;
  about?: string;
  experience?: Array<{ title: string }>;
  skills?: Array<{ name: string }>;
  education?: Array<{ fieldOfStudy?: string }>;
  projects?: Array<{ title: string }>;
}

const GOAL_DESCRIPTIONS: Record<string, string> = {
  'internship': 'Gain hands-on industry experience through structured programs',
  'job_search': 'Find full-time employment matching your skills and career aspirations',
  'career_change': 'Transition into a new industry, role, or career path',
  'freelancing': 'Build an independent career offering services to multiple clients',
  'startup': 'Grow your startup or build a new venture from scratch',
  'thought_leadership': 'Establish yourself as a recognized authority in your domain',
  'networking': 'Expand your professional network strategically',
  'personal_branding': 'Build a recognizable professional identity',
  'skill_development': 'Acquire new technical skills for career advancement',
};

export class CareerGoalEngine {

  suggest(profile: ProfileInput): GoalSuggestion[] {
    const suggestions: GoalSuggestion[] = [];
    const headline = profile.headline?.toLowerCase() || '';
    const about = profile.about?.toLowerCase() || '';
    const titles = (profile.experience || []).map(e => e.title.toLowerCase());
    const allSkills = (profile.skills || []).map(s => s.name.toLowerCase());
    const fields = (profile.education || []).map(e => e.fieldOfStudy?.toLowerCase() || '');

    // Student / Entry level
    if (headline.includes('student') || fields.some(f => f?.includes('student'))) {
      suggestions.push({
        type: 'internship',
        label: 'Internship Search',
        description: GOAL_DESCRIPTIONS['internship'],
        confidence: 0.8,
        evidence: ['Currently studying', 'Seeking industry exposure'],
      });
      suggestions.push({
        type: 'skill_development',
        label: 'Skill Development',
        description: GOAL_DESCRIPTIONS['skill_development'],
        confidence: 0.7,
        evidence: ['Building foundational skills', 'Preparing for industry work'],
      });
    }

    // Early career
    if (coversAny(titles, ['junior', 'graduate', 'associate', 'intern'])) {
      suggestions.push({
        type: 'job_search',
        label: 'Job Search',
        description: GOAL_DESCRIPTIONS['job_search'],
        confidence: 0.85,
        evidence: ['Early career professional', 'Likely seeking full-time advancement'],
      });
      suggestions.push({
        type: 'skill_development',
        label: 'Skill Development',
        description: GOAL_DESCRIPTIONS['skill_development'],
        confidence: 0.6,
        evidence: ['Building professional skills', 'Early stage career growth'],
      });
    }

    // Mid career
    const yearsExp = profile.experience?.length || 0;
    if (yearsExp >= 3 && yearsExp < 8) {
      suggestions.push({
        type: 'personal_branding',
        label: 'Personal Branding',
        description: GOAL_DESCRIPTIONS['personal_branding'],
        confidence: 0.7,
        evidence: ['Mid-career professional', 'Ready to build industry recognition'],
      });
      suggestions.push({
        type: 'thought_leadership',
        label: 'Thought Leadership',
        description: GOAL_DESCRIPTIONS['thought_leadership'],
        confidence: 0.6,
        evidence: [`${yearsExp} years of experience`, 'Domain expertise established'],
      });
    }

    // Senior/Leadership
    if (coversAny(titles, ['senior', 'lead', 'head', 'director', 'principal', 'manager'])) {
      suggestions.push({
        type: 'thought_leadership',
        label: 'Thought Leadership',
        description: GOAL_DESCRIPTIONS['thought_leadership'],
        confidence: 0.85,
        evidence: ['Senior/leadership role', 'Deep domain expertise'],
      });
      suggestions.push({
        type: 'personal_branding',
        label: 'Personal Branding',
        description: GOAL_DESCRIPTIONS['personal_branding'],
        confidence: 0.75,
        evidence: ['Leadership position', 'Built career capital'],
      });
    }

    // Entrepreneur signals
    if (coversAny(titles, ['founder', 'co-founder', 'ceo', 'owner']) || headline.includes('founder')) {
      suggestions.push({
        type: 'startup',
        label: 'Startup Growth',
        description: GOAL_DESCRIPTIONS['startup'],
        confidence: 0.9,
        evidence: ['Founder/CEO role', 'Building a venture'],
      });
      suggestions.push({
        type: 'networking',
        label: 'Strategic Networking',
        description: GOAL_DESCRIPTIONS['networking'],
        confidence: 0.7,
        evidence: ['Building startup requires network', 'Potential investors and partners'],
      });
    }

    // Freelancer signals
    if (coversAny(titles, ['freelance', 'self-employed', 'independent', 'contractor']) ||
        headline.includes('freelance') || headline.includes('independent')) {
      suggestions.push({
        type: 'freelancing',
        label: 'Freelancing Growth',
        description: GOAL_DESCRIPTIONS['freelancing'],
        confidence: 0.9,
        evidence: ['Freelance/independent professional', 'Building client base'],
      });
      suggestions.push({
        type: 'personal_branding',
        label: 'Personal Branding',
        description: GOAL_DESCRIPTIONS['personal_branding'],
        confidence: 0.8,
        evidence: ['Personal brand drives client acquisition', 'Need visibility for leads'],
      });
    }

    // General networking
    if (allSkills.length > 5 || yearsExp > 2) {
      suggestions.push({
        type: 'networking',
        label: 'Strategic Networking',
        description: GOAL_DESCRIPTIONS['networking'],
        confidence: 0.65,
        evidence: ['Professional with established skills', 'Network amplifies opportunities'],
      });
    }

    // Default fallback
    if (suggestions.length === 0) {
      suggestions.push({
        type: 'personal_branding',
        label: 'Personal Branding',
        description: GOAL_DESCRIPTIONS['personal_branding'],
        confidence: 0.6,
        evidence: ['Foundation for career growth', 'Universal career accelerator'],
      });
      suggestions.push({
        type: 'skill_development',
        label: 'Skill Development',
        description: GOAL_DESCRIPTIONS['skill_development'],
        confidence: 0.5,
        evidence: ['Continuous improvement', 'Market adaptability'],
      });
    }

    suggestions.sort((a, b) => b.confidence - a.confidence);

    logger.info({ suggestions: suggestions.length, top: suggestions[0]?.type }, 'Goal suggestions generated');

    return suggestions;
  }
}

function coversAny(terms: string[], patterns: string[]): boolean {
  return terms.some(t => patterns.some(p => t.includes(p)));
}

export const careerGoalEngine = new CareerGoalEngine();
