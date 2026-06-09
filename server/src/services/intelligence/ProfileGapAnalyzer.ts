import pino from 'pino';
import { ProfileGap, LinkedInUserProfile } from '../../types/linkedin';
import { ParsedProfile } from '../linkedin/ProfileParser';

const logger = pino();

export class ProfileGapAnalyzer {
  analyze(parsed: ParsedProfile, profile: LinkedInUserProfile): ProfileGap[] {
    const gaps: ProfileGap[] = [];

    this.analyzeHeadline(gaps, profile.headline);
    this.analyzeAbout(gaps, profile.about);
    this.analyzeExperience(gaps, parsed, profile);
    this.analyzeSkills(gaps, parsed);
    this.analyzeCertifications(gaps, parsed);
    this.analyzeFeatured(gaps, profile);
    this.analyzeEducation(gaps, parsed);
    this.analyzeActivity(gaps, parsed);

    return gaps.sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  private analyzeHeadline(gaps: ProfileGap[], headline?: string): void {
    if (!headline || headline.trim().length === 0) {
      gaps.push({
        category: 'missing_section',
        title: 'Missing Headline',
        description: 'Your profile has no professional headline. This is critical for search visibility.',
        severity: 'critical',
        impact: 'Your profile won\'t appear in LinkedIn searches. Recruiters can\'t find you.',
        recommendation: 'Add a headline that includes your current role, key skills, and value proposition.',
        effort: 'low',
      });
      return;
    }

    if (headline.length < 30) {
      gaps.push({
        category: 'weak_headline',
        title: 'Weak Headline',
        description: 'Your headline is too short to effectively communicate your expertise.',
        severity: 'major',
        impact: 'Lower search ranking and reduced click-through rates.',
        recommendation: `Expand your headline from ${headline.length} to 80-120 characters including your role, key skills, and value.`,
        effort: 'low',
      });
    }

    const hasRole = /(engineer|developer|designer|manager|director|founder|lead|head|vp|chief|consultant|analyst|specialist)/i.test(headline || '');
    if (!hasRole) {
      gaps.push({
        category: 'weak_headline',
        title: 'Unclear Role in Headline',
        description: 'Your headline doesn\'t clearly communicate your professional role.',
        severity: 'major',
        impact: 'Viewers won\'t immediately understand what you do.',
        recommendation: 'Add your current title or role descriptor to your headline.',
        effort: 'low',
      });
    }
  }

  private analyzeAbout(gaps: ProfileGap[], about?: string): void {
    if (!about || about.trim().length === 0) {
      gaps.push({
        category: 'missing_section',
        title: 'Missing About Section',
        description: 'Your profile is missing the About section, which is essential for telling your story.',
        severity: 'critical',
        impact: 'Visitors can\'t understand your background or motivation. Reduces connection acceptance rate.',
        recommendation: 'Write a 3-5 paragraph About section covering your journey, expertise, and what you\'re looking for.',
        effort: 'medium',
      });
      return;
    }

    if (about.length < 200) {
      gaps.push({
        category: 'incomplete_experience',
        title: 'Thin About Section',
        description: `Your About section is only ${about.length} characters. It should be at least 500+ characters.`,
        severity: 'major',
        impact: 'Doesn\'t provide enough context for AI analysis or human viewers.',
        recommendation: 'Expand your About section to 500-2000 characters with your professional story and value proposition.',
        effort: 'medium',
      });
    }
  }

  private analyzeExperience(gaps: ProfileGap[], parsed: ParsedProfile, profile: LinkedInUserProfile): void {
    if (parsed.experience.totalRoles === 0) {
      gaps.push({
        category: 'missing_section',
        title: 'No Experience Listed',
        description: 'Your profile has no work experience entries.',
        severity: 'critical',
        impact: 'Without experience, your profile appears incomplete and untrustworthy.',
        recommendation: 'Add all relevant professional experience with detailed descriptions.',
        effort: 'high',
      });
      return;
    }

    const entriesWithoutDescriptions = (profile.experience || []).filter(e => !e.description || e.description.length < 50);
    if (entriesWithoutDescriptions.length > 0) {
      gaps.push({
        category: 'incomplete_experience',
        title: 'Experience Entries Missing Descriptions',
        description: `${entriesWithoutDescriptions.length} experience entr${entriesWithoutDescriptions.length === 1 ? 'y is' : 'ies are'} missing detailed descriptions.`,
        severity: 'major',
        impact: 'Reduces the impact of your experience section. Recruiters want to see what you accomplished.',
        recommendation: 'Add 2-4 bullet points for each role describing your achievements and impact.',
        effort: 'high',
      });
    }

    if (!profile.experience?.some(e => e.currentlyWorking)) {
      gaps.push({
        category: 'incomplete_experience',
        title: 'No Current Position',
        description: 'Your profile doesn\'t indicate a current position.',
        severity: 'major',
        impact: 'May appear as if you\'re not actively working or not keeping your profile updated.',
        recommendation: 'Add your current role with the "currently working" flag enabled.',
        effort: 'medium',
      });
    }
  }

  private analyzeSkills(gaps: ProfileGap[], parsed: ParsedProfile): void {
    if (parsed.skills.total === 0) {
      gaps.push({
        category: 'missing_section',
        title: 'No Skills Listed',
        description: 'Your profile has no skills. Skills power LinkedIn search and recommendations.',
        severity: 'critical',
        impact: 'You won\'t appear in skill-based searches. Reduces profile discoverability by 70%.',
        recommendation: 'Add at least 10-15 relevant skills to your profile.',
        effort: 'low',
      });
      return;
    }

    if (parsed.skills.total < 10) {
      gaps.push({
        category: 'weak_skills',
        title: 'Too Few Skills',
        description: `Only ${parsed.skills.total} skills listed. LinkedIn recommends 15-20+ skills.`,
        severity: 'major',
        impact: 'Limits your appearance in skill-based searches and AI-powered job recommendations.',
        recommendation: `Add ${15 - parsed.skills.total} more relevant skills to reach the recommended minimum.`,
        effort: 'low',
      });
    }

    if (parsed.skills.endorsedSkills === 0) {
      gaps.push({
        category: 'weak_skills',
        title: 'No Skill Endorsements',
        description: 'None of your skills have endorsements from connections.',
        severity: 'minor',
        impact: 'Lower social proof for your listed expertise.',
        recommendation: 'Ask colleagues and managers to endorse your key skills.',
        effort: 'low',
      });
    }
  }

  private analyzeCertifications(gaps: ProfileGap[], parsed: ParsedProfile): void {
    if (parsed.skills.total > 5 && parsed.summary.totalCertifications === 0) {
      gaps.push({
        category: 'missing_certifications',
        title: 'No Certifications Listed',
        description: 'You have skills but no certifications to validate them.',
        severity: 'minor',
        impact: 'Missed opportunity to validate your skills with credentials.',
        recommendation: 'Add relevant certifications, especially in technical domains.',
        effort: 'medium',
      });
    }
  }

  private analyzeFeatured(gaps: ProfileGap[], profile: LinkedInUserProfile): void {
    if (!profile.projects || profile.projects.length === 0) {
      gaps.push({
        category: 'missing_featured',
        title: 'No Featured Section',
        description: 'No featured projects, posts, or media on your profile.',
        severity: 'minor',
        impact: 'Missed opportunity to showcase your best work prominently.',
        recommendation: 'Feature 3-5 top projects, posts, or articles at the top of your profile.',
        effort: 'medium',
      });
    }
  }

  private analyzeEducation(gaps: ProfileGap[], parsed: ParsedProfile): void {
    if (parsed.education.totalEducation === 0) {
      gaps.push({
        category: 'missing_section',
        title: 'No Education Listed',
        description: 'Your profile has no education entries.',
        severity: 'major',
        impact: 'Education is a key signal for recruiters and AI-powered candidate matching.',
        recommendation: 'Add your educational background including degree, institution, and field of study.',
        effort: 'low',
      });
    }
  }

  private analyzeActivity(gaps: ProfileGap[], parsed: ParsedProfile): void {
    if (parsed.content.totalPosts === 0) {
      gaps.push({
        category: 'inconsistent_activity',
        title: 'No LinkedIn Activity',
        description: 'No posts or articles found on your profile.',
        severity: 'minor',
        impact: 'No content history for AI to analyze your voice and expertise.',
        recommendation: 'Start posting about your professional interests and expertise regularly.',
        effort: 'high',
      });
    } else if (parsed.content.contentConsistency < 0.3) {
      gaps.push({
        category: 'inconsistent_activity',
        title: 'Inconsistent Posting Activity',
        description: 'Your posting history shows irregular activity patterns.',
        severity: 'minor',
        impact: 'Inconsistent posting reduces audience growth and engagement.',
        recommendation: 'Establish a consistent posting cadence of 2-3 times per week.',
        effort: 'high',
      });
    }
  }
}

export const profileGapAnalyzer = new ProfileGapAnalyzer();
