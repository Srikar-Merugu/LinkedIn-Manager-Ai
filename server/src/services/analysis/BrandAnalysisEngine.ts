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
    const contentPillars = this.generateContentPillars(resumeData, linkedinData, careerGoals);
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
    let technicalLeadership = 30;
    let contentReadiness = 20;
    let industryAuthority = 25;
    let personalBrand = 20;
    let careerOpportunity = 35;

    if (resumeData) {
      const expYears = resumeData.totalExperienceYears || 0;
      if (expYears >= 10) technicalLeadership += 25;
      else if (expYears >= 5) technicalLeadership += 18;
      else if (expYears >= 2) technicalLeadership += 10;

      if (resumeData.skills.length >= 10) technicalLeadership += 10;
      else if (resumeData.skills.length >= 5) technicalLeadership += 5;

      if (resumeData.experience.length >= 3) technicalLeadership += 10;
      else if (resumeData.experience.length >= 2) technicalLeadership += 5;

      if (resumeData.education.length > 0) technicalLeadership += 5;

      if (resumeData.skills.length > 0) contentReadiness += 10;
      if (resumeData.experience.length > 0) contentReadiness += 5;
      if (resumeData.projects && resumeData.projects.length > 0) contentReadiness += 10;

      if (resumeData.certifications && resumeData.certifications.length > 0) {
        industryAuthority += 10;
      }

      if (resumeData.summary) contentReadiness += 5;

      careerOpportunity += Math.min(expYears * 3, 20);
    }

    if (linkedinData?.connected) {
      personalBrand += 20;
      industryAuthority += 15;
      contentReadiness += 10;
    }

    if (githubData?.connected) {
      technicalLeadership += 10;
      contentReadiness += 5;
    }

    if (careerGoals.length > 0) {
      careerOpportunity += 10;
      if (careerGoals.includes('startup') || careerGoals.includes('freelancing')) {
        personalBrand += 10;
      }
      if (careerGoals.includes('job_search')) {
        careerOpportunity += 5;
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
    careerGoals: string[]
  ): string[] {
    const pillars: string[] = [];
    const skills = resumeData?.skills || [];
    const experience = resumeData?.experience || [];
    const currentRole = resumeData?.currentRole || '';

    if (skills.some((s: string) => /python|java|javascript|typescript|react|node|go|rust/i.test(s))) {
      pillars.push('Technical Deep Dives');
    }

    if (experience.length >= 2) {
      pillars.push('Career Growth & Lessons');
    }

    if (careerGoals.includes('job_search')) {
      pillars.push('Job Search Journey');
    } else if (careerGoals.includes('freelancing')) {
      pillars.push('Freelancing Insights');
    } else if (careerGoals.includes('startup')) {
      pillars.push('Startup Journey');
    } else if (careerGoals.includes('personal_brand')) {
      pillars.push('Industry Thought Leadership');
    }

    if (skills.length > 0) {
      pillars.push('Tool & Framework Reviews');
    }

    if (pillars.length < 3) {
      pillars.push('Building in Public');
    }

    if (pillars.length < 4) {
      pillars.push('Professional Development');
    }

    return pillars.slice(0, 5);
  }

  private generateQuickWins(
    resumeData: any,
    linkedinData: any,
    githubData: any,
    scores: AnalysisResult['scores']
  ): AnalysisResult['quickWins'] {
    const wins: AnalysisResult['quickWins'] = [];

    if (!linkedinData?.connected) {
      wins.push({
        action: 'Add your LinkedIn profile URL',
        impact: 'high',
        effort: 'low',
      });
    }

    if (!githubData?.connected) {
      wins.push({
        action: 'Connect your GitHub profile',
        impact: 'medium',
        effort: 'low',
      });
    }

    if (scores.personalBrand < 40) {
      wins.push({
        action: 'Write a compelling headline that showcases your expertise',
        impact: 'high',
        effort: 'low',
      });
    }

    if (scores.contentReadiness < 40) {
      wins.push({
        action: 'Share your first LinkedIn post about a recent project',
        impact: 'high',
        effort: 'medium',
      });
    }

    if (!resumeData?.summary) {
      wins.push({
        action: 'Add a professional summary to your resume',
        impact: 'medium',
        effort: 'low',
      });
    }

    if (resumeData?.projects && resumeData.projects.length === 0) {
      wins.push({
        action: 'Feature your top 3 projects on your profile',
        impact: 'high',
        effort: 'medium',
      });
    }

    if (resumeData?.certifications && resumeData.certifications.length === 0) {
      wins.push({
        action: 'Add relevant certifications to boost credibility',
        impact: 'medium',
        effort: 'high',
      });
    }

    if (scores.technicalLeadership < 50) {
      wins.push({
        action: 'Write a technical article about a system you built',
        impact: 'high',
        effort: 'high',
      });
    }

    return wins.slice(0, 6);
  }

  private generate90DayStrategy(
    scores: AnalysisResult['scores'],
    careerGoals: string[],
    resumeData: any
  ): AnalysisResult['strategy90Day'] {
    const avgScore = (scores.technicalLeadership + scores.contentReadiness + scores.industryAuthority + scores.personalBrand + scores.careerOpportunity) / 5;

    const strategy: AnalysisResult['strategy90Day'] = [
      {
        week: 'Weeks 1-2',
        focus: 'Foundation',
        tasks: [
          'Optimize your LinkedIn headline and about section',
          'Share your first post introducing yourself',
          'Connect with 10 people in your industry',
        ],
      },
      {
        week: 'Weeks 3-4',
        focus: 'Content Creation',
        tasks: [
          'Publish your first technical article',
          'Share a project you built and lessons learned',
          'Engage with 5 posts from industry leaders',
        ],
      },
      {
        week: 'Weeks 5-8',
        focus: 'Authority Building',
        tasks: [
          'Publish a deep-dive article on a technical topic',
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

    if (avgScore < 40) {
      strategy[0].tasks.unshift('Complete your profile with all missing sections');
      strategy[0].tasks.unshift('Upload a professional profile photo');
    }

    if (careerGoals.includes('job_search')) {
      strategy[3].tasks.push('Reach out to recruiters and hiring managers');
    }

    if (careerGoals.includes('startup')) {
      strategy[2].tasks.push('Share your startup journey and learnings');
    }

    return strategy;
  }

  private generateProfileSummary(
    resumeData: any,
    linkedinData: any,
    githubData: any
  ): AnalysisResult['profileSummary'] {
    const skills = resumeData?.skills || [];
    const experience = resumeData?.experience || [];
    const education = resumeData?.education || [];

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (experience.length >= 3) strengths.push('Extensive work experience');
    if (skills.length >= 8) strengths.push('Diverse technical skill set');
    if (linkedinData?.connected) strengths.push('Active LinkedIn presence');
    if (githubData?.connected) strengths.push('GitHub portfolio connected');
    if (education.length > 0) strengths.push('Strong educational background');
    if (resumeData?.certifications?.length > 0) strengths.push('Industry certifications');

    if (experience.length < 2) weaknesses.push('Limited work experience on file');
    if (skills.length < 5) weaknesses.push('Few skills listed');
    if (!linkedinData?.connected) weaknesses.push('LinkedIn profile not connected');
    if (!githubData?.connected) weaknesses.push('GitHub profile not connected');
    if (!resumeData?.summary) weaknesses.push('No professional summary');
    if (resumeData?.projects?.length === 0) weaknesses.push('No featured projects');

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
