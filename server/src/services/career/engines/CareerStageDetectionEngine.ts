import pino from 'pino';

const logger = pino();

export interface CareerStageResult {
  primaryStage: string;
  confidence: number;
  stages: Array<{ stage: string; score: number; evidence: string[] }>;
}

interface ProfileInput {
  experience?: Array<{ title: string; currentlyWorking?: boolean; endDate?: string }>;
  education?: Array<{ degree?: string; fieldOfStudy?: string; endDate?: string }>;
  skills?: Array<{ name: string; endorsements?: number }>;
  headline?: string;
  about?: string;
  totalExperienceYears?: number;
  projects?: Array<{ title: string }>;
  certifications?: Array<{ name: string }>;
}

export class CareerStageDetectionEngine {

  detect(profile: ProfileInput): CareerStageResult {
    const stages: Array<{ stage: string; score: number; evidence: string[] }> = [];

    stages.push(this.detectStudent(profile));
    stages.push(this.detectGraduate(profile));
    stages.push(this.detectJunior(profile));
    stages.push(this.detectMidLevel(profile));
    stages.push(this.detectSenior(profile));
    stages.push(this.detectFounder(profile));
    stages.push(this.detectFreelancer(profile));
    stages.push(this.detectCreator(profile));

    stages.sort((a, b) => b.score - a.score);
    const top = stages[0];

    logger.info({ primaryStage: top.stage, confidence: top.score / 100 }, 'Career stage detected');

    return {
      primaryStage: top.stage,
      confidence: Math.round((top.score / 100) * 100) / 100,
      stages: stages.filter(s => s.score > 0),
    };
  }

  private detectStudent(profile: ProfileInput): { stage: string; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;

    const edu = profile.education || [];
    const currentEdu = edu.filter(e => !e.endDate || new Date(e.endDate) > new Date());

    if (currentEdu.length > 0) {
      score += 40;
      evidence.push(`Currently enrolled: ${currentEdu.map(e => e.degree || 'degree').join(', ')}`);
    }

    const exp = profile.experience || [];
    const internships = exp.filter(e => e.title.toLowerCase().includes('intern'));
    if (internships.length > 0) {
      score += 20;
      evidence.push(`Internship experience: ${internships.map(i => i.title).join(', ')}`);
    }

    if ((profile.totalExperienceYears || 0) < 1) {
      score += 20;
      evidence.push('Less than 1 year of professional experience');
    }

    if (profile.headline?.toLowerCase().includes('student')) {
      score += 20;
      evidence.push('Headline indicates student status');
    }

    return { stage: 'student', score: Math.min(score, 100), evidence };
  }

  private detectGraduate(profile: ProfileInput): { stage: string; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;

    const edu = profile.education || [];
    const recentGraduates = edu.filter(e => {
      if (!e.endDate) return false;
      const gradDate = new Date(e.endDate);
      const now = new Date();
      const diffMonths = (now.getFullYear() - gradDate.getFullYear()) * 12 + (now.getMonth() - gradDate.getMonth());
      return diffMonths >= 0 && diffMonths <= 12;
    });

    if (recentGraduates.length > 0) {
      score += 40;
      evidence.push(`Recently graduated: ${recentGraduates.map(e => e.degree || 'degree').join(', ')}`);
    }

    const exp = profile.experience || [];
    const fullTimeRoles = exp.filter(e => e.currentlyWorking && !e.title.toLowerCase().includes('intern'));
    if (fullTimeRoles.length === 0 && recentGraduates.length > 0) {
      score += 30;
      evidence.push('Recently graduated, seeking full-time role');
    }

    if ((profile.totalExperienceYears || 0) < 2) {
      score += 15;
    }

    if (profile.headline?.toLowerCase().includes('graduate') || profile.headline?.toLowerCase().includes('recent')) {
      score += 15;
      evidence.push('Headline indicates recent graduate status');
    }

    return { stage: 'graduate', score: Math.min(score, 100), evidence };
  }

  private detectJunior(profile: ProfileInput): { stage: string; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;
    const years = profile.totalExperienceYears || 0;

    if (years >= 1 && years <= 3) {
      score += 50;
      evidence.push(`${years} years of experience (junior range)`);
    } else if (years > 0 && years < 1) {
      score += 20;
    }

    const exp = profile.experience || [];
    const currentTitle = exp.find(e => e.currentlyWorking)?.title?.toLowerCase() || '';
    if (currentTitle.includes('junior') || currentTitle.includes('associate') || currentTitle.includes('entry')) {
      score += 30;
      evidence.push(`Current title indicates junior level: ${currentTitle}`);
    }

    if (profile.skills && profile.skills.length < 10) {
      score += 10;
      evidence.push('Limited skill set breadth');
    }

    if (profile.certifications && profile.certifications.length === 0) {
      score += 10;
    }

    return { stage: 'junior', score: Math.min(score, 100), evidence };
  }

  private detectMidLevel(profile: ProfileInput): { stage: string; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;
    const years = profile.totalExperienceYears || 0;

    if (years >= 3 && years <= 7) {
      score += 50;
      evidence.push(`${years} years of experience (mid-level range)`);
    } else if (years > 7 && years <= 10) {
      score += 20;
    }

    const exp = profile.experience || [];
    const currentTitle = exp.find(e => e.currentlyWorking)?.title?.toLowerCase() || '';
    if (currentTitle.includes('senior') || currentTitle.includes('lead') || currentTitle.includes('manager')) {
      score -= 20;
    } else if (currentTitle.includes('mid') || (!currentTitle.includes('junior') && !currentTitle.includes('senior'))) {
      score += 20;
      evidence.push('Mid-level title detected');
    }

    const totalRoles = exp.length;
    if (totalRoles >= 2) {
      score += 15;
      evidence.push(`Held ${totalRoles} roles`);
    }

    if (profile.skills && profile.skills.length >= 10 && profile.skills.length < 25) {
      score += 15;
    }

    return { stage: 'mid_level', score: Math.min(score, 100), evidence };
  }

  private detectSenior(profile: ProfileInput): { stage: string; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;
    const years = profile.totalExperienceYears || 0;

    if (years >= 8) {
      score += 50;
      evidence.push(`${years} years of experience (senior range)`);
    } else if (years >= 5) {
      score += 20;
    }

    const exp = profile.experience || [];
    const currentTitle = exp.find(e => e.currentlyWorking)?.title?.toLowerCase() || '';
    if (currentTitle.includes('senior') || currentTitle.includes('lead') || currentTitle.includes('head') ||
        currentTitle.includes('director') || currentTitle.includes('principal') || currentTitle.includes('staff') ||
        currentTitle.includes('vp') || currentTitle.includes('chief') || currentTitle.includes('cto')) {
      score += 30;
      evidence.push(`Senior/leadership title: ${currentTitle}`);
    }

    if (profile.certifications && profile.certifications.length >= 3) {
      score += 10;
    }

    if (profile.skills && profile.skills.length >= 25) {
      score += 10;
      evidence.push('Extensive skill set');
    }

    if (profile.projects && profile.projects.length >= 3) {
      score += 10;
    }

    return { stage: 'senior', score: Math.min(score, 100), evidence };
  }

  private detectFounder(profile: ProfileInput): { stage: string; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;

    const exp = profile.experience || [];
    const currentTitle = exp.find(e => e.currentlyWorking)?.title?.toLowerCase() || '';
    const currentDesc = exp.find(e => e.currentlyWorking)?.title?.toLowerCase() || '';

    const founderKeywords = /founder|co-founder|ceo|owner|entrepreneur|startup/i;
    if (founderKeywords.test(currentTitle)) {
      score += 60;
      evidence.push(`Founder/CEO title: ${currentTitle}`);
    }

    if (profile.headline?.toLowerCase().includes('founder') || profile.headline?.toLowerCase().includes('building')) {
      score += 20;
      evidence.push('Headline indicates founder status');
    }

    if (profile.projects && profile.projects.length >= 2) {
      score += 10;
    }

    if (yearsSinceLastEdu(profile) <= 5 && score > 0) {
      score += 10;
    }

    return { stage: 'founder', score: Math.min(score, 100), evidence };
  }

  private detectFreelancer(profile: ProfileInput): { stage: string; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;

    const exp = profile.experience || [];
    const currentTitle = exp.find(e => e.currentlyWorking)?.title?.toLowerCase() || '';
    const allTitles = exp.map(e => e.title.toLowerCase()).join(' ');

    const freelanceKeywords = /freelance|freelancer|self-employed|independent|contractor|consultant/i;
    if (freelanceKeywords.test(currentTitle) || freelanceKeywords.test(allTitles)) {
      score += 50;
      evidence.push('Freelance/independent work detected');
    }

    if (profile.projects && profile.projects.length >= 3) {
      score += 15;
    }

    if (profile.skills && profile.skills.length >= 10) {
      score += 10;
    }

    const hasMultipleRoles = exp.filter(e => !e.currentlyWorking).length >= 3;
    if (hasMultipleRoles) {
      score += 15;
      evidence.push('Multiple past roles indicate varied client work');
    }

    if (profile.headline?.toLowerCase().includes('freelance') || profile.headline?.toLowerCase().includes('independent')) {
      score += 10;
    }

    return { stage: 'freelancer', score: Math.min(score, 100), evidence };
  }

  private detectCreator(profile: ProfileInput): { stage: string; score: number; evidence: string[] } {
    const evidence: string[] = [];
    let score = 0;

    const headline = profile.headline?.toLowerCase() || '';
    const about = profile.about?.toLowerCase() || '';

    const creatorKeywords = /creator|influencer|content|writer|speaker|author|educator|coach/i;
    if (creatorKeywords.test(headline)) {
      score += 40;
      evidence.push('Headline indicates creator role');
    }

    if (creatorKeywords.test(about)) {
      score += 15;
    }

    if (profile.projects && profile.projects.length >= 2) {
      score += 15;
    }

    if (profile.certifications && profile.certifications.length >= 2) {
      score += 10;
    }

    if (profile.skills && profile.skills.length >= 15) {
      score += 10;
    }

    if (profile.headline?.toLowerCase().includes('speaker') || profile.headline?.toLowerCase().includes('author')) {
      score += 10;
      evidence.push('Public speaking or authorship detected');
    }

    return { stage: 'creator', score: Math.min(score, 100), evidence };
  }
}

function yearsSinceLastEdu(profile: ProfileInput): number {
  const edu = profile.education || [];
  if (edu.length === 0) return 99;
  const lastEdu = edu.reduce((latest, e) => {
    if (!e.endDate) return latest;
    return !latest || new Date(e.endDate) > new Date(latest.endDate!) ? e : latest;
  });
  if (!lastEdu.endDate) return 99;
  return (new Date().getFullYear() - new Date(lastEdu.endDate).getFullYear());
}

export const careerStageDetectionEngine = new CareerStageDetectionEngine();
