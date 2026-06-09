import pino from 'pino';
import {
  LinkedInUserProfile,
  ParsedProfileResult,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInSkill,
  LinkedInCertification,
  LinkedInProject,
  LinkedInActivity,
  CareerStage,
  ProfileType,
} from '../../types/linkedin';

const logger = pino();

export interface ParsedProfile {
  profile: LinkedInUserProfile;
  summary: {
    totalExperienceYears: number;
    totalSkills: number;
    totalCertifications: number;
    totalProjects: number;
    totalActivities: number;
    careerStabilityScore: number;
    skillRelevanceScore: number;
    profileType: ProfileType;
    careerStage: CareerStage;
    industry: string;
    yearsOfExperience: number;
    educationLevel: string;
    averageTenure: number;
    roleProgressionScore: number;
  };
  experience: {
    totalRoles: number;
    uniqueCompanies: number;
    industries: string[];
    averageRoleDuration: number;
    hasGaps: boolean;
    gapMonths: number;
    careerProgression: string[];
  };
  education: {
    highestDegree: string;
    fieldOfStudy: string[];
    universities: string[];
    totalEducation: number;
  };
  skills: {
    total: number;
    topSkills: string[];
    endorsedSkills: number;
    averageEndorsements: number;
    skillCategories: string[];
    skillGaps: string[];
    industryRelevantSkills: string[];
  };
  content: {
    totalPosts: number;
    totalArticles: number;
    totalEngagements: number;
    averageEngagement: number;
    topTopics: string[];
    contentConsistency: number;
  };
}

export class ProfileParser {
  parse(profile: LinkedInUserProfile): ParsedProfile {
    const summary = this.computeSummary(profile);
    const experience = this.analyzeExperience(profile.experience);
    const education = this.analyzeEducation(profile.education);
    const skills = this.analyzeSkills(profile.skills);
    const content = this.analyzeContent(profile.activity);

    return {
      profile,
      summary,
      experience,
      education,
      skills,
      content,
    };
  }

  private computeSummary(profile: LinkedInUserProfile): ParsedProfile['summary'] {
    const totalExperienceYears = this.calculateTotalExperienceYears(profile.experience);
    const yearsOfExperience = totalExperienceYears;
    const careerStabilityScore = this.calculateCareerStability(profile.experience);
    const averageTenure = this.calculateAverageTenure(profile.experience);
    const roleProgressionScore = this.calculateRoleProgression(profile.experience);
    const profileType = this.determineProfileType(profile);
    const careerStage = this.determineCareerStage(yearsOfExperience, profileType);
    const industry = this.extractPrimaryIndustry(profile.experience);
    const educationLevel = this.getHighestEducationLevel(profile.education);

    return {
      totalExperienceYears,
      totalSkills: profile.skills?.length || 0,
      totalCertifications: profile.certifications?.length || 0,
      totalProjects: profile.projects?.length || 0,
      totalActivities: profile.activity?.length || 0,
      careerStabilityScore: Math.round(careerStabilityScore * 100),
      skillRelevanceScore: 0,
      profileType,
      careerStage,
      industry,
      yearsOfExperience,
      educationLevel,
      averageTenure,
      roleProgressionScore: Math.round(roleProgressionScore * 100),
    };
  }

  private analyzeExperience(experience: LinkedInExperience[]): ParsedProfile['experience'] {
    const uniqueCompanies = new Set(experience.map(e => e.company));
    const industries = [...new Set(experience.filter(e => e.industry).map(e => e.industry!))];
    const averageRoleDuration = this.calculateAverageTenure(experience);

    const dates = experience
      .filter(e => e.startDate)
      .sort((a, b) => (b.startDate?.year || 0) - (a.startDate?.year || 0));

    const careerProgression: string[] = dates.map(e => `${e.title} @ ${e.company}`);
    const gapMonths = this.calculateGaps(experience);

    return {
      totalRoles: experience.length,
      uniqueCompanies: uniqueCompanies.size,
      industries,
      averageRoleDuration,
      hasGaps: gapMonths > 6,
      gapMonths,
      careerProgression,
    };
  }

  private analyzeEducation(education: LinkedInEducation[]): ParsedProfile['education'] {
    const universities = education.map(e => e.school);
    const fieldsOfStudy = education.filter(e => e.fieldOfStudy).map(e => e.fieldOfStudy!);

    return {
      highestDegree: this.getHighestEducationLevel(education),
      fieldOfStudy: fieldsOfStudy,
      universities,
      totalEducation: education.length,
    };
  }

  private analyzeSkills(skills: LinkedInSkill[]): ParsedProfile['skills'] {
    const topSkills = skills.filter(s => s.isTopSkill).map(s => s.name);
    const endorsedSkillsList = skills.filter(s => (s.endorsements || 0) > 0);
    const totalEndorsements = endorsedSkillsList.reduce((sum, s) => sum + (s.endorsements || 0), 0);
    const categories = [...new Set(skills.filter(s => s.category).map(s => s.category!))];

    return {
      total: skills.length,
      topSkills: topSkills.length > 0 ? topSkills : skills.slice(0, 5).map(s => s.name),
      endorsedSkills: endorsedSkillsList.length,
      averageEndorsements: skills.length > 0 ? Math.round(totalEndorsements / skills.length) : 0,
      skillCategories: categories,
      skillGaps: [],
      industryRelevantSkills: [],
    };
  }

  private analyzeContent(activity: LinkedInActivity[]): ParsedProfile['content'] {
    const posts = activity.filter(a => a.type === 'post' || a.type === 'article');
    const totalEngagements = activity.reduce(
      (sum, a) => sum + (a.engagement?.likes || 0) + (a.engagement?.comments || 0) + (a.engagement?.shares || 0),
      0
    );

    const contentType = activity.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPosts: posts.length,
      totalArticles: activity.filter(a => a.type === 'article').length,
      totalEngagements,
      averageEngagement: posts.length > 0 ? Math.round(totalEngagements / posts.length) : 0,
      topTopics: [],
      contentConsistency: this.calculateContentConsistency(activity),
    };
  }

  determineProfileType(profile: LinkedInUserProfile): ProfileType {
    const headline = (profile.headline || '').toLowerCase();
    const about = (profile.about || '').toLowerCase();
    const titles = profile.experience?.map(e => e.title.toLowerCase()) || [];
    const companies = profile.experience?.map(e => e.company.toLowerCase()) || [];
    const hasEducation = (profile.education?.length || 0) > 0;
    const hasExperience = (profile.experience?.length || 0) > 0;

    if (headline.includes('founder') || headline.includes('co-founder') || headline.includes('ceo')) {
      return 'founder';
    }
    if (headline.includes('freelance') || headline.includes('self-employed') || headline.includes('independent')) {
      return 'freelancer';
    }
    if (hasEducation && !hasExperience && titles.length === 0) {
      return 'student';
    }
    if (headline.includes('recruiter') || headline.includes('talent') || headline.includes('hr')) {
      return 'recruiter';
    }
    if (headline.includes('influencer') || headline.includes('creator') || headline.includes('speaker')) {
      return 'influencer';
    }
    if (headline.includes('vp') || headline.includes('director') || headline.includes('chief') || headline.includes('head of')) {
      return 'executive';
    }

    return 'standard';
  }

  determineCareerStage(yearsOfExperience: number, profileType: ProfileType): CareerStage {
    if (profileType === 'founder') return 'founder';
    if (profileType === 'freelancer') return 'freelancer';
    if (profileType === 'student') return 'student';
    if (profileType === 'influencer') return 'entry-level';

    if (yearsOfExperience <= 2) return 'entry-level';
    if (yearsOfExperience <= 5) return 'mid-level';
    if (yearsOfExperience <= 10) return 'senior';
    if (yearsOfExperience <= 15) return 'leadership';
    return 'executive';
  }

  private calculateTotalExperienceYears(experience: LinkedInExperience[]): number {
    if (!experience.length) return 0;

    let totalMonths = 0;
    for (const exp of experience) {
      if (exp.startDate) {
        const end = exp.endDate || { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
        const startMonth = (exp.startDate.year * 12) + (exp.startDate.month || 1);
        const endMonth = (end.year * 12) + (end.month || 12);
        totalMonths += Math.max(0, endMonth - startMonth);
      }
    }

    return Math.round((totalMonths / 12) * 10) / 10;
  }

  private calculateCareerStability(experience: LinkedInExperience[]): number {
    if (experience.length === 0) return 0;

    let score = 0;
    const hasCurrentRole = experience.some(e => e.currentlyWorking);
    if (hasCurrentRole) score += 0.3;

    const avgDuration = this.calculateAverageTenure(experience);
    score += Math.min(avgDuration / 36, 0.4);

    const gaps = this.calculateGaps(experience);
    if (gaps === 0) score += 0.3;
    else if (gaps < 6) score += 0.15;

    return Math.min(score, 1);
  }

  private calculateAverageTenure(experience: LinkedInExperience[]): number {
    if (!experience.length) return 0;

    const durations = experience
      .map(e => e.durationInMonths || 0)
      .filter(d => d > 0);

    if (durations.length === 0) return 0;
    return durations.reduce((sum, d) => sum + d, 0) / durations.length;
  }

  private calculateGaps(experience: LinkedInExperience[]): number {
    const sorted = experience
      .filter(e => e.startDate)
      .sort((a, b) => (b.startDate?.year || 0) - (a.startDate?.year || 0));

    let totalGapMonths = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      if (current.startDate && next.endDate) {
        const currentStart = (current.startDate.year * 12) + (current.startDate.month || 1);
        const nextEnd = (next.endDate.year * 12) + (next.endDate.month || 12);
        const gap = nextEnd - currentStart;
        if (gap > 0) totalGapMonths += gap;
      }
    }

    return totalGapMonths;
  }

  private calculateRoleProgression(experience: LinkedInExperience[]): number {
    if (experience.length < 2) return 0.5;

    const titles = experience.map(e => e.title);
    let progressionCount = 0;

    for (let i = 0; i < titles.length - 1; i++) {
      if (this.isTitleProgression(titles[i], titles[i + 1])) {
        progressionCount++;
      }
    }

    return progressionCount / (titles.length - 1);
  }

  private isTitleProgression(older: string, newer: string): boolean {
    const seniorityKeywords = ['junior', 'senior', 'lead', 'principal', 'staff', 'head', 'director', 'vp', 'chief'];
    const olderLevel = seniorityKeywords.findIndex(k => older.toLowerCase().includes(k));
    const newerLevel = seniorityKeywords.findIndex(k => newer.toLowerCase().includes(k));
    return newerLevel > olderLevel;
  }

  private extractPrimaryIndustry(experience: LinkedInExperience[]): string {
    const industries = experience
      .filter(e => e.industry)
      .map(e => e.industry!);

    if (industries.length === 0) return 'Unknown';
    const industryCounts = industries.reduce((acc, ind) => {
      acc[ind] = (acc[ind] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(industryCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';
  }

  private getHighestEducationLevel(education: LinkedInEducation[]): string {
    const levels = [
      { keywords: ['phd', 'doctorate', 'ph.d'], level: 'PhD' },
      { keywords: ['master', 'mba', 'm.s', 'm.a', 'msc'], level: "Master's" },
      { keywords: ['bachelor', 'b.s', 'b.a', 'bsc', 'b.eng'], level: "Bachelor's" },
      { keywords: ['associate', 'a.s', 'a.a'], level: "Associate's" },
      { keywords: ['diploma', 'certificate'], level: 'Diploma' },
    ];

    for (const level of levels) {
      const hasDegree = education.some(e =>
        level.keywords.some(k => (e.degree || '').toLowerCase().includes(k))
      );
      if (hasDegree) return level.level;
    }

    return education.length > 0 ? 'Some Education' : 'No Education Listed';
  }

  private calculateContentConsistency(activity: LinkedInActivity[]): number {
    if (activity.length < 2) return 0;

    const sorted = [...activity].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const intervals: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      intervals.push(
        (sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;
    if (avgInterval <= 7) return 1;
    if (avgInterval <= 14) return 0.8;
    if (avgInterval <= 30) return 0.6;
    if (avgInterval <= 90) return 0.4;
    return 0.2;
  }
}
