import mongoose from 'mongoose';
import pino from 'pino';
import { User } from '../../models/identity/User';
import { OnboardingState } from '../../models/onboarding/OnboardingState';
import { ResumeData } from '../../models/onboarding/ResumeData';

const logger = pino();

export interface AnalysisResult {
  scores: {
    technicalLeadership: number;
    contentReadiness: number;
    industryAuthority: number;
    personalBrand: number;
    careerOpportunity: number;
  };
  contentPillars: string[];
  quickWins: { action: string; impact: string; effort: string }[];
  strategy90Day: { week: string; focus: string; tasks: string[] }[];
  profileSummary: {
    headline: string;
    experience: string;
    skills: string[];
    education: string;
    strengths: string[];
    weaknesses: string[];
  };
  linkedinData?: any;
  resumeData?: any;
  githubData?: any;
}

const toObjectId = (id: string) => new mongoose.Types.ObjectId(id);

const TECH_SKILLS = /python|java|javascript|typescript|react|node|go|rust|kubernetes|docker|aws|gcp|azure|terraform|kafka|graphql|sql|nosql|machine.?learning|deep.?learning|ai|devops|ci\/cd|microservices/i;
const LEADERSHIP_KEYWORDS = /lead|manager|director|vp|head|principal|staff|senior|architect/i;
const INDUSTRY_KEYWORDS = /fintech|healthtech|edtech|saas|e-commerce|enterprise|startup|agency|consulting/i;

export class BrandAnalysisEngine {

  async runFullAnalysis(userId: string): Promise<AnalysisResult> {
    const state = await OnboardingState.findOne({ userId: toObjectId(userId) });
    if (!state) throw new Error('Onboarding state not found');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const resume = state.connectedSources.resume?.connected
      ? await ResumeData.findOne({ onboardingStateId: state._id }).lean()
      : null;

    const linkedinUrl = (state as any).linkedinUrl || '';
    const githubUrl = (state as any).githubUrl || '';
    const careerGoals = state.careerGoals || [];

    const resumeData = resume ? this.extractResumeData(resume) : null;
    const linkedinData = linkedinUrl ? this.parseLinkedInUrl(linkedinUrl) : null;
    const githubData = githubUrl ? this.parseGitHubUrl(githubUrl) : null;

    const scores = this.calculateScores(resumeData, linkedinData, githubData, careerGoals);
    const contentPillars = this.generateContentPillars(resumeData, linkedinData, githubData, careerGoals);
    const quickWins = this.generateQuickWins(resumeData, linkedinData, githubData, scores);
    const strategy90Day = this.generate90DayStrategy(scores, careerGoals, resumeData);
    const profileSummary = this.generateProfileSummary(resumeData, linkedinData, githubData);

    return {
      scores,
      contentPillars,
      quickWins,
      strategy90Day,
      profileSummary,
      linkedinData,
      resumeData,
      githubData,
    };
  }

  private extractResumeData(resume: any): any {
    const parsed = resume.parsed || {};
    return {
      skills: parsed.skills || [],
      experience: parsed.experience || [],
      education: parsed.education || [],
      certifications: parsed.certifications || [],
      projects: parsed.projects || [],
      summary: parsed.summary || '',
      languages: parsed.languages || [],
      rawText: resume.rawText || '',
      totalExperienceYears: this.calculateExperienceYears(parsed.experience || []),
      currentRole: this.getCurrentRole(parsed.experience || []),
      industries: this.extractIndustries(parsed.experience || []),
    };
  }

  private calculateExperienceYears(experience: any[]): number {
    if (!experience.length) return 0;
    let totalMonths = 0;
    for (const exp of experience) {
      const start = exp.startDate ? new Date(exp.startDate) : null;
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      if (start) {
        totalMonths += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      }
    }
    return Math.round(totalMonths / 12);
  }

  private getCurrentRole(experience: any[]): string {
    const current = experience.find((e: any) => e.current || !e.endDate);
    return current ? `${current.title || ''} at ${current.organization || ''}`.trim() : '';
  }

  private extractIndustries(experience: any[]): string[] {
    const industries = new Set<string>();
    for (const exp of experience) {
      if (exp.industry) industries.add(exp.industry);
    }
    return Array.from(industries);
  }

  private parseLinkedInUrl(url: string): any {
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
    return {
      username: match ? match[1] : '',
      url: url,
      connected: true,
    };
  }

  private parseGitHubUrl(url: string): any {
    const match = url.match(/github\.com\/([^/?]+)/);
    return {
      username: match ? match[1] : '',
      url: url,
      connected: true,
    };
  }

  private calculateScores(
    resumeData: any,
    linkedinData: any,
    githubData: any,
    careerGoals: string[]
  ): AnalysisResult['scores'] {
    // All scores start at 0 — only increase from real data
    let technicalLeadership = 0;
    let contentReadiness = 0;
    let industryAuthority = 0;
    let personalBrand = 0;
    let careerOpportunity = 0;

    // === RESUME-BASED SCORING ===
    if (resumeData) {
      const expYears = resumeData.totalExperienceYears || 0;
      const skillCount = resumeData.skills.length;
      const expCount = resumeData.experience.length;
      const hasTechSkills = resumeData.skills.some((s: string) => TECH_SKILLS.test(s));
      const hasLeadershipRole = resumeData.experience.some((e: any) =>
        LEADERSHIP_KEYWORDS.test(e.title || '')
      );
      const hasIndustryExp = resumeData.industries.length > 0;
      const hasProjects = resumeData.projects && resumeData.projects.length > 0;
      const hasCerts = resumeData.certifications && resumeData.certifications.length > 0;

      // Technical Leadership (0-100)
      if (expYears >= 10) technicalLeadership += 30;
      else if (expYears >= 7) technicalLeadership += 25;
      else if (expYears >= 5) technicalLeadership += 20;
      else if (expYears >= 3) technicalLeadership += 15;
      else if (expYears >= 1) technicalLeadership += 8;

      if (hasTechSkills) technicalLeadership += 15;
      if (hasLeadershipRole) technicalLeadership += 15;
      if (skillCount >= 15) technicalLeadership += 12;
      else if (skillCount >= 10) technicalLeadership += 8;
      else if (skillCount >= 5) technicalLeadership += 5;
      if (hasProjects) technicalLeadership += 8;
      if (resumeData.education.length > 0) technicalLeadership += 5;

      // Content Readiness (0-100)
      if (skillCount > 0) contentReadiness += Math.min(skillCount * 3, 20);
      if (expCount > 0) contentReadiness += Math.min(expCount * 5, 15);
      if (hasProjects) contentReadiness += 15;
      if (resumeData.summary) contentReadiness += 10;
      if (resumeData.rawText && resumeData.rawText.length > 500) contentReadiness += 10;
      if (hasCerts) contentReadiness += 5;

      // Industry Authority (0-100)
      if (hasIndustryExp) industryAuthority += 15;
      if (hasCerts) industryAuthority += 15;
      if (expYears >= 5) industryAuthority += 10;
      if (hasLeadershipRole) industryAuthority += 10;
      if (resumeData.education.length > 0) industryAuthority += 5;

      // Career Opportunity (0-100)
      careerOpportunity += Math.min(expYears * 4, 25);
      if (hasTechSkills) careerOpportunity += 10;
      if (hasLeadershipRole) careerOpportunity += 10;
      if (skillCount >= 10) careerOpportunity += 5;
    }

    // === LINKEDIN-BASED SCORING ===
    if (linkedinData?.connected) {
      personalBrand += 25;
      industryAuthority += 20;
      contentReadiness += 15;
      careerOpportunity += 10;
    }

    // === GITHUB-BASED SCORING ===
    if (githubData?.connected) {
      technicalLeadership += 15;
      contentReadiness += 10;
    }

    // === CAREER GOALS SCORING ===
    if (careerGoals.length > 0) {
      careerOpportunity += 10;
      if (careerGoals.includes('startup') || careerGoals.includes('freelancing')) {
        personalBrand += 10;
      }
      if (careerGoals.includes('job_search')) {
        careerOpportunity += 8;
      }
      if (careerGoals.includes('personal_brand')) {
        personalBrand += 8;
        industryAuthority += 5;
      }
    }

    return {
      technicalLeadership: Math.min(100, Math.max(0, technicalLeadership)),
      contentReadiness: Math.min(100, Math.max(0, contentReadiness)),
      industryAuthority: Math.min(100, Math.max(0, industryAuthority)),
      personalBrand: Math.min(100, Math.max(0, personalBrand)),
      careerOpportunity: Math.min(100, Math.max(0, careerOpportunity)),
    };
  }

  private generateContentPillars(
    resumeData: any,
    linkedinData: any,
    githubData: any,
    careerGoals: string[]
  ): string[] {
    const pillars: string[] = [];
    const skills = resumeData?.skills || [];
    const experience = resumeData?.experience || [];
    const industries = resumeData?.industries || [];

    // Skill-based pillars
    const hasBackend = skills.some((s: string) => /python|java|go|rust|node|django|spring/i.test(s));
    const hasFrontend = skills.some((s: string) => /react|vue|angular|next|typescript|css|html/i.test(s));
    const hasData = skills.some((s: string) => /sql|nosql|mongodb|postgres|kafka|spark|tableau|power.?bi/i.test(s));
    const hasAI = skills.some((s: string) => /machine.?learning|deep.?learning|ai|tensorflow|pytorch|nlp/i.test(s));
    const hasCloud = skills.some((s: string) => /aws|gcp|azure|kubernetes|docker|terraform|devops/i.test(s));
    const hasMobile = skills.some((s: string) => /ios|android|swift|kotlin|react.?native|flutter/i.test(s));

    if (hasBackend) pillars.push('Backend Engineering & Architecture');
    if (hasFrontend) pillars.push('Frontend & UI/UX Insights');
    if (hasData) pillars.push('Data Engineering & Analytics');
    if (hasAI) pillars.push('AI & Machine Learning');
    if (hasCloud) pillars.push('Cloud & DevOps');
    if (hasMobile) pillars.push('Mobile Development');

    // Experience-based pillars
    const hasLeadership = experience.some((e: any) => LEADERSHIP_KEYWORDS.test(e.title || ''));
    if (hasLeadership) pillars.push('Engineering Leadership');

    if (experience.length >= 3) {
      pillars.push('Career Growth & Lessons Learned');
    }

    // Goal-based pillars
    if (careerGoals.includes('job_search')) pillars.push('Job Search & Interview Prep');
    else if (careerGoals.includes('freelancing')) pillars.push('Freelancing & Consulting');
    else if (careerGoals.includes('startup')) pillars.push('Startup & Entrepreneurship');
    else if (careerGoals.includes('personal_brand')) pillars.push('Industry Thought Leadership');

    // Industry-based
    if (industries.length > 0) {
      pillars.push(`${industries[0]} Industry Insights`);
    }

    // GitHub presence
    if (githubData?.connected) {
      pillars.push('Open Source & Side Projects');
    }

    // Always ensure at least 3 pillars
    if (pillars.length < 3) pillars.push('Building in Public');
    if (pillars.length < 4) pillars.push('Professional Development');
    if (pillars.length < 5) pillars.push('Tech Community Engagement');

    return pillars.slice(0, 5);
  }

  private generateQuickWins(
    resumeData: any,
    linkedinData: any,
    githubData: any,
    scores: AnalysisResult['scores']
  ): AnalysisResult['quickWins'] {
    const wins: AnalysisResult['quickWins'] = [];

    // Data-driven quick wins based on actual weaknesses
    if (!linkedinData?.connected) {
      wins.push({ action: 'Add your LinkedIn profile URL to enable full analysis', impact: 'high', effort: 'low' });
    }
    if (!githubData?.connected) {
      wins.push({ action: 'Connect your GitHub to showcase your code portfolio', impact: 'high', effort: 'low' });
    }
    if (!resumeData?.summary && resumeData) {
      wins.push({ action: 'Add a professional summary to your resume', impact: 'medium', effort: 'low' });
    }
    if (resumeData?.projects?.length === 0) {
      wins.push({ action: 'Feature your top 3 projects on your profile', impact: 'high', effort: 'medium' });
    }
    if (resumeData?.certifications?.length === 0) {
      wins.push({ action: 'Add relevant certifications to boost credibility', impact: 'medium', effort: 'high' });
    }

    // Score-based quick wins
    if (scores.personalBrand < 30) {
      wins.push({ action: 'Write a compelling headline that showcases your expertise', impact: 'high', effort: 'low' });
    }
    if (scores.contentReadiness < 30) {
      wins.push({ action: 'Share your first LinkedIn post about a recent project', impact: 'high', effort: 'medium' });
    }
    if (scores.technicalLeadership < 40) {
      wins.push({ action: 'Write a technical article about a system you built', impact: 'high', effort: 'high' });
    }
    if (scores.industryAuthority < 30) {
      wins.push({ action: 'Comment on 5 trending industry posts this week', impact: 'medium', effort: 'low' });
    }

    return wins.slice(0, 6);
  }

  private generate90DayStrategy(
    scores: AnalysisResult['scores'],
    careerGoals: string[],
    resumeData: any
  ): AnalysisResult['strategy90Day'] {
    const avgScore = (scores.technicalLeadership + scores.contentReadiness + scores.industryAuthority + scores.personalBrand + scores.careerOpportunity) / 5;
    const weakest = this.getWeakestScore(scores);
    const strongest = this.getStrongestScore(scores);

    const strategy: AnalysisResult['strategy90Day'] = [
      {
        week: 'Weeks 1-2',
        focus: 'Profile Foundation',
        tasks: [
          'Optimize your LinkedIn headline and about section',
          'Add a professional photo and banner image',
          `Strengthen your ${weakest} — this is your biggest gap`,
        ],
      },
      {
        week: 'Weeks 3-4',
        focus: 'Content Launch',
        tasks: [
          'Share your first post introducing yourself and your expertise',
          'Write about a project you built and lessons learned',
          'Connect with 10 people in your target industry',
        ],
      },
      {
        week: 'Weeks 5-8',
        focus: 'Authority Building',
        tasks: [
          `Publish a deep-dive article on your ${strongest} expertise`,
          'Share weekly insights about your work',
          'Comment thoughtfully on trending industry discussions',
        ],
      },
      {
        week: 'Weeks 9-12',
        focus: 'Growth & Optimization',
        tasks: [
          'Analyze what content performs best and double down',
          'Collaborate with another professional on a post',
          'Review and update your profile with new achievements',
        ],
      },
    ];

    // Personalize based on score level
    if (avgScore < 30) {
      strategy[0].tasks.unshift('Complete all missing profile sections');
      strategy[0].tasks.unshift('Upload a professional profile photo');
    }

    // Personalize based on goals
    if (careerGoals.includes('job_search')) {
      strategy[2].tasks.push('Share job search tips and interview experiences');
      strategy[3].tasks.push('Reach out to recruiters and hiring managers');
    }
    if (careerGoals.includes('startup')) {
      strategy[1].tasks.push('Share your startup journey and learnings');
      strategy[2].tasks.push('Document building a product in public');
    }
    if (careerGoals.includes('personal_brand')) {
      strategy[1].tasks.push('Start a content series on your area of expertise');
      strategy[2].tasks.push('Guest post on industry publications');
    }

    return strategy;
  }

  private getWeakestScore(scores: AnalysisResult['scores']): string {
    const entries = Object.entries(scores) as [string, number][];
    const weakest = entries.reduce((min, curr) => curr[1] < min[1] ? curr : min);
    const labels: Record<string, string> = {
      technicalLeadership: 'technical leadership',
      contentReadiness: 'content readiness',
      industryAuthority: 'industry authority',
      personalBrand: 'personal brand',
      careerOpportunity: 'career opportunity',
    };
    return labels[weakest[0]] || weakest[0];
  }

  private getStrongestScore(scores: AnalysisResult['scores']): string {
    const entries = Object.entries(scores) as [string, number][];
    const strongest = entries.reduce((max, curr) => curr[1] > max[1] ? curr : max);
    const labels: Record<string, string> = {
      technicalLeadership: 'technical leadership',
      contentReadiness: 'content readiness',
      industryAuthority: 'industry authority',
      personalBrand: 'personal brand',
      careerOpportunity: 'career opportunity',
    };
    return labels[strongest[0]] || strongest[0];
  }

  private generateProfileSummary(
    resumeData: any,
    linkedinData: any,
    githubData: any
  ): AnalysisResult['profileSummary'] {
    const skills = resumeData?.skills || [];
    const experience = resumeData?.experience || [];
    const education = resumeData?.education || [];
    const hasTechSkills = skills.some((s: string) => TECH_SKILLS.test(s));
    const hasLeadership = experience.some((e: any) => LEADERSHIP_KEYWORDS.test(e.title || ''));

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    // Data-driven strengths
    if (experience.length >= 5) strengths.push('Extensive work experience across multiple roles');
    else if (experience.length >= 3) strengths.push('Solid work experience');
    if (skills.length >= 15) strengths.push('Highly diverse technical skill set');
    else if (skills.length >= 8) strengths.push('Diverse technical skill set');
    if (hasTechSkills) strengths.push('Strong technical foundation');
    if (hasLeadership) strengths.push('Leadership experience');
    if (linkedinData?.connected) strengths.push('Active LinkedIn presence');
    if (githubData?.connected) strengths.push('GitHub portfolio connected');
    if (education.length > 0) strengths.push('Educational background');
    if (resumeData?.certifications?.length > 0) strengths.push('Industry certifications');
    if (resumeData?.projects?.length > 0) strengths.push('Featured projects');

    // Data-driven weaknesses
    if (experience.length < 2) weaknesses.push('Limited work experience on file');
    if (skills.length < 5) weaknesses.push('Few skills listed — add more to showcase breadth');
    if (!hasTechSkills) weaknesses.push('No recognizable technical skills found');
    if (!linkedinData?.connected) weaknesses.push('LinkedIn profile not connected');
    if (!githubData?.connected) weaknesses.push('GitHub profile not connected');
    if (!resumeData?.summary) weaknesses.push('No professional summary');
    if (resumeData?.projects?.length === 0) weaknesses.push('No featured projects');
    if (!hasLeadership) weaknesses.push('No leadership roles identified');

    return {
      headline: resumeData?.currentRole || 'Professional',
      experience: `${experience.length} positions, ${resumeData?.totalExperienceYears || 0} years`,
      skills: skills.slice(0, 10),
      education: education.map((e: any) => `${e.degree || ''} - ${e.institution || ''}`).filter(Boolean).join('; ') || 'Not specified',
      strengths,
      weaknesses,
    };
  }
}

export const brandAnalysisEngine = new BrandAnalysisEngine();
