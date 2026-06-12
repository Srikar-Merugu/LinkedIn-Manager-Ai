import mongoose from 'mongoose';
import pino from 'pino';
import { AnalysisReport } from '../../models/analysis/AnalysisReport';
import { OnboardingState } from '../../models/onboarding/OnboardingState';
import { ResumeData } from '../../models/onboarding/ResumeData';
import { User } from '../../models/identity/User';

const logger = pino({ name: 'analysis-service' });

const TECH_SKILLS = /python|java|javascript|typescript|react|node|go|rust|kubernetes|docker|aws|gcp|azure|terraform|kafka|graphql|sql|nosql|machine.?learning|deep.?learning|ai|devops|ci\/cd|microservices/i;
const LEADERSHIP_KEYWORDS = /lead|manager|director|vp|head|principal|staff|senior|architect/i;

const ARCHETYPES = [
  { name: 'The Sage', description: 'You are the wise expert who shares knowledge and insights. Your audience looks to you for deep understanding and thoughtful analysis.' },
  { name: 'The Creator', description: 'You are the innovative builder who brings ideas to life. Your audience is inspired by what you create and how you solve problems.' },
  { name: 'The Explorer', description: 'You are the trailblazer who ventures into new territory. Your audience follows your journey of discovery and experimentation.' },
  { name: 'The Hero', description: 'You are the leader who overcomes challenges and inspires others. Your audience admires your resilience and achievements.' },
  { name: 'The Teacher', description: 'You are the educator who makes complex topics accessible. Your audience values your ability to explain and simplify.' },
  { name: 'The Storyteller', description: 'You are the narrator who connects through stories. Your audience engages with your personal experiences and lessons.' },
];

export class AnalysisService {

  async generateFullReport(userId: string): Promise<any> {
    const state = await OnboardingState.findOne({ userId: new mongoose.Types.ObjectId(userId) });
    if (!state) throw new Error('Onboarding state not found');

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const resume = state.connectedSources.resume?.connected
      ? await ResumeData.findOne({ onboardingStateId: state._id }).lean()
      : null;

    const linkedinUrl = (state as any).linkedinUrl || '';
    const githubUrl = (state as any).githubUrl || '';
    const careerGoals = state.careerGoals || [];

    const resumeData = resume ? this.extractResumeData(resume) : this.emptyResumeData();
    const linkedinData = linkedinUrl ? this.parseLinkedInUrl(linkedinUrl) : this.emptyLinkedInData();
    const githubData = githubUrl ? this.parseGitHubUrl(githubUrl) : this.emptyGitHubData();

    const scores = this.calculateScores(resumeData, linkedinData, githubData, careerGoals);
    const strengths = this.generateStrengths(resumeData, linkedinData, githubData, scores);
    const weaknesses = this.generateWeaknesses(resumeData, linkedinData, githubData, scores);
    const contentPillars = this.generateContentPillars(resumeData, linkedinData, githubData, careerGoals);
    const brandDNA = this.generateBrandDNA(resumeData, linkedinData, githubData, careerGoals, user.fullName);
    const writingDNA = this.generateWritingDNA(resumeData, linkedinData);
    const careerBlueprint = this.generateCareerBlueprint(resumeData, linkedinData, githubData, careerGoals, scores);
    const strategy90Days = this.generateStrategy90Days(scores, careerGoals, resumeData, contentPillars);
    const contentCalendar = this.generateContentCalendar(strategy90Days, contentPillars);
    const quickWins = this.generateQuickWins(resumeData, linkedinData, githubData, scores);
    const opportunities = this.generateOpportunities(resumeData, linkedinData, githubData, careerGoals, contentPillars);

    const profileScore = this.calculateProfileScore(resumeData, linkedinData, githubData, scores);
    const profileHealth = this.generateProfileHealth(resumeData, linkedinData, githubData);
    const missingSections = this.generateMissingSections(resumeData, linkedinData, githubData);
    const improvements = this.generateImprovements(resumeData, linkedinData, githubData, scores);
    const contentOpportunitiesNew = this.generateContentOpportunities(resumeData, linkedinData, githubData, careerGoals, contentPillars);
    const aiSummary = this.generateAISummary(user.fullName, resumeData, linkedinData, githubData, scores, strengths, weaknesses, contentPillars);

    const report = await AnalysisReport.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      {
        userId: new mongoose.Types.ObjectId(userId),
        linkedinUrl,
        githubUrl,
        resumeFileName: resume?.originalFileName || '',
        careerGoals,
        linkedinAnalysis: linkedinData,
        resumeAnalysis: resumeData,
        githubAnalysis: githubData,
        scores,
        strengths,
        weaknesses,
        contentPillars,
        brandDNA,
        writingDNA,
        careerBlueprint,
        strategy90Days,
        contentCalendar,
        quickWins,
        opportunities,
        profileScore,
        profileHealth,
        missingSections,
        improvements,
        contentOpportunities: contentOpportunitiesNew,
        aiSummary,
        dashboardMetrics: {
          totalPosts: 0,
          totalEngagement: 0,
          avgEngagementRate: 0,
          followerGrowth: 0,
          topPostType: contentPillars[0]?.name || '',
          bestDay: 'Tuesday',
        },
        generatedAt: new Date(),
        updatedAt: new Date(),
        $inc: { version: 1 },
      },
      { upsert: true, new: true }
    ).lean();

    return report;
  }

  async getReport(userId: string): Promise<any> {
    const report = await AnalysisReport.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    if (!report) return null;

    // If report is older than 24 hours or missing key data, regenerate
    const age = Date.now() - new Date(report.generatedAt).getTime();
    const hasAllData = report.strengths?.length > 0 && report.contentPillars?.length > 0 && report.brandDNA?.archetype;
    const hasNewFields = report.profileScore !== undefined && report.profileScore > 0
      && report.profileHealth?.length > 0
      && report.aiSummary;

    if (age > 24 * 60 * 60 * 1000 || !hasAllData || !hasNewFields) {
      return this.generateFullReport(userId);
    }

    return report;
  }

  private extractResumeData(resume: any): any {
    const parsed = resume.parsed || {};
    const experience = parsed.experience || [];
    const totalExperienceYears = this.calculateExperienceYears(experience);

    return {
      skills: parsed.skills || [],
      experience,
      education: parsed.education || [],
      certifications: parsed.certifications || [],
      projects: parsed.projects || [],
      summary: parsed.summary || resume.rawText?.substring(0, 500) || '',
      totalExperienceYears,
      currentRole: this.getCurrentRole(experience),
      industries: this.extractIndustries(experience),
    };
  }

  private emptyResumeData(): any {
    return { skills: [], experience: [], education: [], certifications: [], projects: [], summary: '', totalExperienceYears: 0, currentRole: '', industries: [] };
  }

  private emptyLinkedInData(): any {
    return { username: '', connected: false, headline: '', about: '', experience: [], education: [], skills: [], industry: '', location: '' };
  }

  private emptyGitHubData(): any {
    return { username: '', connected: false, languages: [], repos: 0 };
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
      connected: true,
      headline: '',
      about: '',
      experience: [],
      education: [],
      skills: [],
      industry: '',
      location: '',
    };
  }

  private parseGitHubUrl(url: string): any {
    const match = url.match(/github\.com\/([^/?]+)/);
    return { username: match ? match[1] : '', connected: true, languages: [], repos: 0 };
  }

  private calculateScores(resumeData: any, linkedinData: any, githubData: any, careerGoals: string[]) {
    let technicalLeadership = 0;
    let contentReadiness = 0;
    let industryAuthority = 0;
    let personalBrand = 0;
    let careerOpportunity = 0;

    if (resumeData) {
      const expYears = resumeData.totalExperienceYears || 0;
      const skillCount = resumeData.skills.length;
      const expCount = resumeData.experience.length;
      const hasTechSkills = resumeData.skills.some((s: string) => TECH_SKILLS.test(s));
      const hasLeadershipRole = resumeData.experience.some((e: any) => LEADERSHIP_KEYWORDS.test(e.title || ''));
      const hasIndustryExp = resumeData.industries.length > 0;
      const hasProjects = resumeData.projects?.length > 0;
      const hasCerts = resumeData.certifications?.length > 0;

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

      if (skillCount > 0) contentReadiness += Math.min(skillCount * 3, 20);
      if (expCount > 0) contentReadiness += Math.min(expCount * 5, 15);
      if (hasProjects) contentReadiness += 15;
      if (resumeData.summary) contentReadiness += 10;
      if (resumeData.summary.length > 200) contentReadiness += 10;
      if (hasCerts) contentReadiness += 5;

      if (hasIndustryExp) industryAuthority += 15;
      if (hasCerts) industryAuthority += 15;
      if (expYears >= 5) industryAuthority += 10;
      if (hasLeadershipRole) industryAuthority += 10;
      if (resumeData.education.length > 0) industryAuthority += 5;

      careerOpportunity += Math.min(expYears * 4, 25);
      if (hasTechSkills) careerOpportunity += 10;
      if (hasLeadershipRole) careerOpportunity += 10;
      if (skillCount >= 10) careerOpportunity += 5;
    }

    if (linkedinData?.connected) {
      personalBrand += 25;
      industryAuthority += 20;
      contentReadiness += 15;
      careerOpportunity += 10;
    }

    if (githubData?.connected) {
      technicalLeadership += 15;
      contentReadiness += 10;
    }

    if (careerGoals.length > 0) {
      careerOpportunity += 10;
      if (careerGoals.includes('startup') || careerGoals.includes('freelancing')) personalBrand += 10;
      if (careerGoals.includes('job_search')) careerOpportunity += 8;
      if (careerGoals.includes('personal_brand')) { personalBrand += 8; industryAuthority += 5; }
    }

    return {
      technicalLeadership: Math.min(100, technicalLeadership),
      contentReadiness: Math.min(100, contentReadiness),
      industryAuthority: Math.min(100, industryAuthority),
      personalBrand: Math.min(100, personalBrand),
      careerOpportunity: Math.min(100, careerOpportunity),
    };
  }

  private generateStrengths(resumeData: any, linkedinData: any, githubData: any, scores: any): any[] {
    const strengths: any[] = [];
    const skills = resumeData?.skills || [];
    const experience = resumeData?.experience || [];

    if (experience.length >= 5) strengths.push({ title: 'Extensive Work Experience', category: 'Experience', description: `${experience.length} positions with ${resumeData.totalExperienceYears || 0} years of experience`, impact: 'high', score: Math.min(100, experience.length * 15), evidence: experience.slice(0, 3).map((e: any) => `${e.title || ''} at ${e.organization || ''}`) });
    else if (experience.length >= 3) strengths.push({ title: 'Solid Work Experience', category: 'Experience', description: `${experience.length} positions with diverse responsibilities`, impact: 'medium', score: Math.min(100, experience.length * 20), evidence: experience.map((e: any) => `${e.title || ''}`) });

    const hasTechSkills = skills.some((s: string) => TECH_SKILLS.test(s));
    if (hasTechSkills) {
      const techSkills = skills.filter((s: string) => TECH_SKILLS.test(s));
      strengths.push({ title: 'Strong Technical Foundation', category: 'Skills', description: `Proficient in ${techSkills.length} technical skills`, impact: 'high', score: Math.min(100, techSkills.length * 10 + 30), evidence: techSkills.slice(0, 5) });
    }

    if (skills.length >= 15) strengths.push({ title: 'Diverse Skill Set', category: 'Skills', description: `${skills.length} skills across multiple domains`, impact: 'medium', score: Math.min(100, skills.length * 5), evidence: skills.slice(0, 5) });

    const hasLeadership = experience.some((e: any) => LEADERSHIP_KEYWORDS.test(e.title || ''));
    if (hasLeadership) strengths.push({ title: 'Leadership Experience', category: 'Leadership', description: 'Demonstrated ability to lead teams and projects', impact: 'high', score: 75, evidence: experience.filter((e: any) => LEADERSHIP_KEYWORDS.test(e.title || '')).map((e: any) => e.title) });

    if (linkedinData?.connected) strengths.push({ title: 'Active LinkedIn Presence', category: 'Visibility', description: 'LinkedIn profile connected for professional networking', impact: 'medium', score: 60, evidence: ['LinkedIn profile active'] });
    if (githubData?.connected) strengths.push({ title: 'GitHub Portfolio', category: 'Technical', description: 'Code portfolio showcasing technical abilities', impact: 'high', score: 70, evidence: ['GitHub profile connected'] });
    if (resumeData?.education?.length > 0) strengths.push({ title: 'Educational Background', category: 'Education', description: 'Formal education providing theoretical foundation', impact: 'medium', score: 50, evidence: resumeData.education.slice(0, 2).map((e: any) => `${e.degree || ''} - ${e.institution || ''}`) });
    if (resumeData?.certifications?.length > 0) strengths.push({ title: 'Industry Certifications', category: 'Credentials', description: `${resumeData.certifications.length} certifications validating expertise`, impact: 'high', score: Math.min(100, resumeData.certifications.length * 20 + 40), evidence: resumeData.certifications.slice(0, 3).map((c: any) => c.name || c) });
    if (resumeData?.projects?.length > 0) strengths.push({ title: 'Featured Projects', category: 'Portfolio', description: `${resumeData.projects.length} projects demonstrating practical skills`, impact: 'high', score: Math.min(100, resumeData.projects.length * 15 + 30), evidence: resumeData.projects.slice(0, 3).map((p: any) => p.name || p.title || 'Project') });

    return strengths.slice(0, 8);
  }

  private generateWeaknesses(resumeData: any, linkedinData: any, githubData: any, scores: any): any[] {
    const weaknesses: any[] = [];
    const skills = resumeData?.skills || [];
    const experience = resumeData?.experience || [];

    if (!linkedinData?.connected) weaknesses.push({ title: 'LinkedIn Profile Not Connected', category: 'Visibility', description: 'Your LinkedIn profile is not connected, limiting networking opportunities', impact: 'high', score: 20, evidence: ['Connect your LinkedIn profile'] });
    if (!githubData?.connected) weaknesses.push({ title: 'GitHub Profile Not Connected', category: 'Technical', description: 'Your GitHub portfolio is not connected', impact: 'medium', score: 30, evidence: ['Connect your GitHub profile'] });
    if (!resumeData?.summary) weaknesses.push({ title: 'No Professional Summary', category: 'Profile', description: 'Missing a compelling professional summary', impact: 'medium', score: 35, evidence: ['Add a professional summary to your resume'] });
    if (skills.length < 5) weaknesses.push({ title: 'Limited Skills Listed', category: 'Skills', description: `Only ${skills.length} skills listed — add more to showcase your breadth`, impact: 'medium', score: 40, evidence: ['Add more skills to your profile'] });
    if (resumeData?.projects?.length === 0) weaknesses.push({ title: 'No Featured Projects', category: 'Portfolio', description: 'No projects listed to showcase practical abilities', impact: 'high', score: 25, evidence: ['Add your top projects'] });
    if (experience.length < 2) weaknesses.push({ title: 'Limited Work History', category: 'Experience', description: 'Few positions listed on your profile', impact: 'medium', score: 40, evidence: ['Add more work experience'] });
    if (scores.personalBrand < 30) weaknesses.push({ title: 'Weak Personal Brand', category: 'Branding', description: 'Your personal brand score is low', impact: 'high', score: scores.personalBrand, evidence: ['Build your personal brand through content creation'] });
    if (scores.contentReadiness < 30) weaknesses.push({ title: 'Low Content Readiness', category: 'Content', description: 'Not enough content to start posting consistently', impact: 'medium', score: scores.contentReadiness, evidence: ['Build your content foundation'] });

    return weaknesses.slice(0, 6);
  }

  private generateContentPillars(resumeData: any, linkedinData: any, githubData: any, careerGoals: string[]): any[] {
    const pillars: any[] = [];
    const skills = resumeData?.skills || [];
    const experience = resumeData?.experience || [];
    const industries = resumeData?.industries || [];

    const hasBackend = skills.some((s: string) => /python|java|go|rust|node|django|spring/i.test(s));
    const hasFrontend = skills.some((s: string) => /react|vue|angular|next|typescript|css|html/i.test(s));
    const hasData = skills.some((s: string) => /sql|nosql|mongodb|postgres|kafka|spark|tableau/i.test(s));
    const hasAI = skills.some((s: string) => /machine.?learning|deep.?learning|ai|tensorflow|pytorch|nlp/i.test(s));
    const hasCloud = skills.some((s: string) => /aws|gcp|azure|kubernetes|docker|terraform|devops/i.test(s));
    const hasMobile = skills.some((s: string) => /ios|android|swift|kotlin|react.?native|flutter/i.test(s));
    const hasLeadership = experience.some((e: any) => LEADERSHIP_KEYWORDS.test(e.title || ''));

    if (hasBackend) pillars.push({ name: 'Backend Engineering & Architecture', description: 'Deep dives into system design, API architecture, and backend best practices', score: 70, topics: ['System Design', 'API Design', 'Database Optimization', 'Microservices'], authorityScore: 60, engagementPotential: 75, careerAlignment: 85 });
    if (hasFrontend) pillars.push({ name: 'Frontend & UI/UX Insights', description: 'Sharing frontend engineering expertise and design thinking', score: 65, topics: ['React Patterns', 'Performance Optimization', 'CSS Architecture', 'Accessibility'], authorityScore: 55, engagementPotential: 80, careerAlignment: 80 });
    if (hasData) pillars.push({ name: 'Data Engineering & Analytics', description: 'Insights on data pipelines, analytics, and data-driven decisions', score: 60, topics: ['Data Pipelines', 'Analytics', 'Data Modeling', 'ETL'], authorityScore: 50, engagementPotential: 65, careerAlignment: 75 });
    if (hasAI) pillars.push({ name: 'AI & Machine Learning', description: 'Exploring AI applications and ML engineering', score: 75, topics: ['ML Engineering', 'Model Deployment', 'AI Applications', 'Research'], authorityScore: 65, engagementPotential: 85, careerAlignment: 90 });
    if (hasCloud) pillars.push({ name: 'Cloud & DevOps', description: 'Cloud infrastructure, DevOps practices, and platform engineering', score: 65, topics: ['Cloud Architecture', 'CI/CD', 'Infrastructure', 'Monitoring'], authorityScore: 55, engagementPotential: 70, careerAlignment: 80 });
    if (hasMobile) pillars.push({ name: 'Mobile Development', description: 'Mobile app development insights and best practices', score: 60, topics: ['iOS', 'Android', 'Cross-platform', 'Mobile UX'], authorityScore: 50, engagementPotential: 70, careerAlignment: 75 });
    if (hasLeadership) pillars.push({ name: 'Engineering Leadership', description: 'Management, team building, and engineering culture', score: 70, topics: ['Team Management', 'Technical Strategy', 'Hiring', 'Culture'], authorityScore: 60, engagementPotential: 75, careerAlignment: 85 });
    if (experience.length >= 3) pillars.push({ name: 'Career Growth & Lessons Learned', description: 'Sharing career journey, lessons, and professional development', score: 55, topics: ['Career Advice', 'Lessons Learned', 'Professional Growth', 'Interview Tips'], authorityScore: 45, engagementPotential: 80, careerAlignment: 70 });

    if (careerGoals.includes('job_search')) pillars.push({ name: 'Job Search & Interview Prep', description: 'Job search strategies and interview preparation', score: 50, topics: ['Resume Tips', 'Interview Prep', 'Job Search Strategy', 'Networking'], authorityScore: 40, engagementPotential: 85, careerAlignment: 95 });
    else if (careerGoals.includes('freelancing')) pillars.push({ name: 'Freelancing & Consulting', description: 'Freelance career building and consulting insights', score: 50, topics: ['Client Acquisition', 'Pricing', 'Project Management', 'Business Development'], authorityScore: 40, engagementPotential: 70, careerAlignment: 90 });
    else if (careerGoals.includes('startup')) pillars.push({ name: 'Startup & Entrepreneurship', description: 'Building products and growing a startup', score: 55, topics: ['Product Development', 'Growth', 'Fundraising', 'MVP Building'], authorityScore: 45, engagementPotential: 80, careerAlignment: 90 });

    if (githubData?.connected) pillars.push({ name: 'Open Source & Side Projects', description: 'Contributing to open source and building in public', score: 50, topics: ['Open Source', 'Side Projects', 'Building in Public', 'Technical Writing'], authorityScore: 40, engagementPotential: 70, careerAlignment: 65 });

    if (industries.length > 0) pillars.push({ name: `${industries[0]} Industry Insights`, description: `Trends and insights from the ${industries[0]} industry`, score: 45, topics: [`${industries[0]} Trends`, 'Industry Analysis', 'Market Insights', 'Best Practices'], authorityScore: 35, engagementPotential: 60, careerAlignment: 70 });

    while (pillars.length < 3) pillars.push({ name: 'Building in Public', description: 'Sharing your development journey transparently', score: 40, topics: ['Projects', 'Learning', 'Challenges', 'Wins'], authorityScore: 30, engagementPotential: 75, careerAlignment: 60 });
    while (pillars.length < 4) pillars.push({ name: 'Professional Development', description: 'Continuous learning and skill development', score: 40, topics: ['Learning', 'Books', 'Courses', 'Certifications'], authorityScore: 30, engagementPotential: 65, careerAlignment: 65 });

    return pillars.slice(0, 5);
  }

  private generateBrandDNA(resumeData: any, linkedinData: any, githubData: any, careerGoals: string[], fullName: string): any {
    const skills = resumeData?.skills || [];
    const experience = resumeData?.experience || [];
    const hasTechSkills = skills.some((s: string) => TECH_SKILLS.test(s));
    const hasLeadership = experience.some((e: any) => LEADERSHIP_KEYWORDS.test(e.title || ''));

    let archetypeIdx = 0;
    if (hasLeadership) archetypeIdx = 3;
    else if (hasTechSkills && experience.length >= 5) archetypeIdx = 0;
    else if (githubData?.connected) archetypeIdx = 2;
    else if (careerGoals.includes('personal_brand')) archetypeIdx = 5;

    const archetype = ARCHETYPES[archetypeIdx];

    const techSkills = skills.filter((s: string) => TECH_SKILLS.test(s)).slice(0, 5);
    const expertise = techSkills.length > 0 ? techSkills.join(', ') : 'technology';

    return {
      archetype: archetype.name,
      archetypeDescription: archetype.description,
      positioning: `${resumeData?.currentRole || 'Professional'} specializing in ${expertise}`,
      uniqueValueProposition: `I help teams build better ${expertise} solutions through practical experience and deep technical knowledge.`,
      missionStatement: `Empowering others through shared knowledge and practical insights in ${expertise}.`,
      targetAudience: `Fellow ${hasLeadership ? 'leaders and ' : ''}engineers interested in ${expertise}`,
      brandTerritory: [...techSkills.slice(0, 4), 'Technology', 'Innovation', 'Career Growth'],
      visualDirection: {
        colorPalette: ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626'],
        style: 'Modern, clean, and professional with bold accents',
        imageryThemes: ['Technology', 'Innovation', 'Growth', 'Leadership'],
      },
      brandRules: [
        { category: 'Voice', rule: 'Always be authentic and share real experiences', priority: 'always' },
        { category: 'Content', rule: 'Back up claims with concrete examples and data', priority: 'always' },
        { category: 'Tone', rule: 'Be approachable but authoritative', priority: 'usually' },
        { category: 'Topics', rule: 'Stay within your core expertise areas', priority: 'usually' },
      ],
      values: ['Authenticity', 'Continuous Learning', 'Technical Excellence', 'Knowledge Sharing', 'Growth Mindset'],
      originStory: `Starting as a developer, I've grown through ${experience.length || 'various'} roles to become a ${hasLeadership ? 'leader' : 'experienced professional'} in ${expertise}. I share what I learn to help others on their journey.`,
    };
  }

  private generateWritingDNA(resumeData: any, linkedinData: any): any {
    const summary = resumeData?.summary || '';
    const skills = resumeData?.skills || [];
    const techTerms = skills.filter((s: string) => TECH_SKILLS.test(s)).slice(0, 10);

    return {
      voiceSignature: summary ? summary.substring(0, 150) : 'Professional, technical, and results-driven communicator',
      communicationStyle: 'Clear and structured with technical depth',
      toneProfile: { primary: 'Professional', secondary: ['Educational', 'Thoughtful'] },
      vocabularyProfile: {
        favoriteWords: ['implementation', 'architecture', 'optimization', 'scalable', 'innovative'],
        technicalTerms: techTerms,
        avgWordLength: 5.5,
      },
      structureProfile: {
        avgSentenceLength: 18,
        usesBulletPoints: true,
        usesQuestions: true,
        usesStories: true,
      },
      hooks: [
        { type: 'question', text: 'Have you ever faced this challenge?', effectiveness: 75 },
        { type: 'contrarian', text: 'Most people think X, but here\'s what actually works:', effectiveness: 80 },
        { type: 'personal', text: 'Here\'s what I learned the hard way:', effectiveness: 85 },
        { type: 'data_point', text: 'New data shows that...', effectiveness: 70 },
      ],
      ctas: [
        { type: 'engagement', text: 'What\'s your experience with this?', effectiveness: 80 },
        { type: 'share', text: 'Share this with someone who needs it', effectiveness: 70 },
        { type: 'follow', text: 'Follow me for more insights on this topic', effectiveness: 65 },
      ],
      formatPreferences: ['Story Post', 'Educational Post', 'Framework Post', 'Career Lesson'],
      emotionalProfile: { curiosity: 70, authority: 65, empathy: 60 },
    };
  }

  private generateCareerBlueprint(resumeData: any, linkedinData: any, githubData: any, careerGoals: string[], scores: any): any {
    const experience = resumeData?.experience || [];
    const skills = resumeData?.skills || [];
    const hasLeadership = experience.some((e: any) => LEADERSHIP_KEYWORDS.test(e.title || ''));
    const expYears = resumeData?.totalExperienceYears || 0;

    let careerStage = 'early';
    if (expYears >= 10) careerStage = 'senior';
    else if (expYears >= 5) careerStage = 'mid';

    const currentPosition = resumeData?.currentRole || (experience.length > 0 ? experience[0].title : 'Professional');
    let targetPosition = 'Senior Engineer';
    if (hasLeadership) targetPosition = 'Engineering Director';
    if (careerGoals.includes('startup')) targetPosition = 'Founder/CTO';
    if (careerGoals.includes('freelancing')) targetPosition = 'Independent Consultant';

    const skillGaps = [];
    if (!skills.some((s: string) => /aws|gcp|azure|cloud/i.test(s))) skillGaps.push({ skill: 'Cloud Computing', currentLevel: 'Beginner', targetLevel: 'Intermediate', priority: 'high' });
    if (!skills.some((s: string) => /kubernetes|docker|container/i.test(s))) skillGaps.push({ skill: 'Container Orchestration', currentLevel: 'Beginner', targetLevel: 'Intermediate', priority: 'medium' });
    if (!skills.some((s: string) => /machine.?learning|ai|tensorflow/i.test(s))) skillGaps.push({ skill: 'AI/ML Fundamentals', currentLevel: 'None', targetLevel: 'Basic', priority: 'medium' });
    if (scores.personalBrand < 40) skillGaps.push({ skill: 'Personal Branding', currentLevel: 'Low', targetLevel: 'Active', priority: 'high' });
    if (scores.contentReadiness < 40) skillGaps.push({ skill: 'Content Creation', currentLevel: 'Beginner', targetLevel: 'Consistent', priority: 'high' });

    return {
      currentPosition,
      targetPosition,
      careerStage,
      skillGaps,
      recommendations: [
        { title: 'Build Technical Authority', description: 'Share deep technical insights from your experience', timeframe: '1-3 months', priority: 'high', actions: ['Write 2 technical articles per month', 'Present at a meetup or conference', 'Contribute to open source'] },
        { title: 'Grow Your Network', description: 'Connect with professionals in your target industry', timeframe: 'Ongoing', priority: 'medium', actions: ['Send 5 connection requests per week', 'Comment on industry posts daily', 'Join relevant LinkedIn groups'] },
        { title: 'Develop Content Skills', description: 'Build your content creation muscle', timeframe: '1-2 months', priority: 'high', actions: ['Post 3x per week', 'Study top creators in your niche', 'Experiment with different content formats'] },
      ],
      milestones: [
        { week: 1, title: 'Profile Optimization', description: 'Complete your LinkedIn profile', tasks: ['Update headline', 'Write compelling about section', 'Add featured section'], status: 'pending' },
        { week: 2, title: 'Content Foundation', description: 'Start your content journey', tasks: ['Write first post', 'Define your content pillars', 'Create content calendar'], status: 'pending' },
        { week: 4, title: 'Authority Building', description: 'Establish your expertise', tasks: ['Publish first article', 'Engage with 20 posts per week', 'Connect with 10 leaders'], status: 'pending' },
        { week: 8, title: 'Momentum', description: 'Build consistent presence', tasks: ['Maintain 3x/week posting', 'Collaborate with another creator', 'Analyze what works'], status: 'pending' },
        { week: 12, title: 'Optimization', description: 'Refine and scale', tasks: ['Double down on best content', 'Expand your network', 'Plan next quarter'], status: 'pending' },
      ],
      authorityMap: {
        topics: resumeData?.skills?.slice(0, 5) || ['Technology', 'Engineering'],
        currentAuthority: scores.industryAuthority,
        targetAuthority: Math.min(100, scores.industryAuthority + 30),
      },
      networkingPlan: {
        targetConnections: 100,
        focusAreas: [targetPosition, 'Industry Leaders', 'Peers'],
        weeklyActions: ['Comment on 5 posts', 'Send 3 connection requests', 'Share 1 insight'],
      },
    };
  }

  private generateStrategy90Days(scores: any, careerGoals: string[], resumeData: any, contentPillars: any[]): any {
    const avgScore = (scores.technicalLeadership + scores.contentReadiness + scores.industryAuthority + scores.personalBrand + scores.careerOpportunity) / 5;
    const pillarNames = contentPillars.map((p: any) => p.name);

    return {
      narrative: `Based on your ${resumeData?.totalExperienceYears || 0} years of experience and current scores (avg: ${Math.round(avgScore)}/100), here's your personalized 90-day growth plan.`,
      monthlyPlans: [
        {
          month: 1,
          phase: 'Foundation',
          focus: 'Build your content foundation and establish your presence',
          goals: ['Post consistently 3x per week', 'Connect with 30 professionals', 'Define your voice'],
          contentMix: [
            { type: 'story', percentage: 30 },
            { type: 'educational', percentage: 30 },
            { type: 'career_lesson', percentage: 20 },
            { type: 'industry_commentary', percentage: 20 },
          ],
        },
        {
          month: 2,
          phase: 'Growth',
          focus: 'Build authority and grow your network',
          goals: ['Publish your first long-form article', 'Collaborate with another creator', 'Grow engagement by 50%'],
          contentMix: [
            { type: 'story', percentage: 25 },
            { type: 'educational', percentage: 30 },
            { type: 'framework', percentage: 25 },
            { type: 'thought_leadership', percentage: 20 },
          ],
        },
        {
          month: 3,
          phase: 'Authority',
          focus: 'Establish thought leadership and optimize',
          goals: ['Be recognized as a go-to expert', 'Build a content series', 'Optimize based on data'],
          contentMix: [
            { type: 'thought_leadership', percentage: 30 },
            { type: 'educational', percentage: 25 },
            { type: 'story', percentage: 25 },
            { type: 'framework', percentage: 20 },
          ],
        },
      ],
      weeklyThemes: [
        { week: 1, theme: 'Introduction & Foundation', contentTypes: ['story', 'educational'], topics: ['My journey', 'What I do', 'Key lessons'] },
        { week: 2, theme: 'Deep Dive', contentTypes: ['educational', 'framework'], topics: ['Technical insights', 'Best practices', 'Frameworks'] },
        { week: 3, theme: 'Experience Sharing', contentTypes: ['story', 'career_lesson'], topics: ['Challenges overcome', 'Mistakes made', 'Growth moments'] },
        { week: 4, theme: 'Industry Perspective', contentTypes: ['industry_commentary', 'thought_leadership'], topics: ['Trends', 'Predictions', 'Analysis'] },
      ],
      growthGoals: [
        { category: 'audience', goal: 'Grow to 500+ connections', metric: 'connections', target: 500 },
        { category: 'engagement', goal: 'Achieve 5% engagement rate', metric: 'engagement_rate', target: 5 },
        { category: 'content', goal: 'Publish 36 posts in 90 days', metric: 'total_posts', target: 36 },
        { category: 'authority', goal: 'Get featured in 2 industry discussions', metric: 'mentions', target: 2 },
      ],
      recommendedFrequency: '3x per week',
    };
  }

  private generateContentCalendar(strategy: any, pillars: any[]): any {
    const entries: any[] = [];
    const queue: any[] = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const week = strategy.weeklyThemes[i % strategy.weeklyThemes.length];
      const pillar = pillars[i % pillars.length];
      const date = new Date(today);
      date.setDate(date.getDate() + i * 2);

      entries.push({
        date: date.toISOString().split('T')[0],
        type: week.contentTypes[0] || 'story',
        pillar: pillar?.name || 'General',
        topic: week.topics[i % week.topics.length],
        hook: `Opening hook for ${week.topics[i % week.topics.length]}`,
        status: 'scheduled',
      });
    }

    for (let i = 0; i < 6; i++) {
      const pillar = pillars[i % pillars.length];
      const week = strategy.weeklyThemes[i % strategy.weeklyThemes.length];
      queue.push({
        id: `queue-${i}`,
        topic: week.topics[i % week.topics.length],
        status: 'idea',
        priority: i < 2 ? 'high' : 'medium',
        pillar: pillar?.name || 'General',
      });
    }

    return { entries, queue, publishingMode: 'manual' };
  }

  private generateQuickWins(resumeData: any, linkedinData: any, githubData: any, scores: any): any[] {
    const wins: any[] = [];

    if (!linkedinData?.connected) wins.push({ action: 'Add your LinkedIn profile URL', impact: 'high', effort: 'low', category: 'Visibility' });
    if (!githubData?.connected) wins.push({ action: 'Connect your GitHub profile', impact: 'high', effort: 'low', category: 'Technical' });
    if (!resumeData?.summary) wins.push({ action: 'Write a professional summary', impact: 'medium', effort: 'low', category: 'Profile' });
    if (resumeData?.projects?.length === 0) wins.push({ action: 'Add your top 3 projects', impact: 'high', effort: 'medium', category: 'Portfolio' });
    if (resumeData?.certifications?.length === 0) wins.push({ action: 'Add industry certifications', impact: 'medium', effort: 'high', category: 'Credentials' });
    if (scores.personalBrand < 30) wins.push({ action: 'Write a compelling headline', impact: 'high', effort: 'low', category: 'Branding' });
    if (scores.contentReadiness < 30) wins.push({ action: 'Share your first LinkedIn post', impact: 'high', effort: 'medium', category: 'Content' });
    if (scores.industryAuthority < 30) wins.push({ action: 'Comment on 5 industry posts this week', impact: 'medium', effort: 'low', category: 'Authority' });

    return wins.slice(0, 6);
  }

  private generateOpportunities(resumeData: any, linkedinData: any, githubData: any, careerGoals: string[], pillars: any[]): any[] {
    const opps: any[] = [];

    pillars.forEach((p: any) => {
      opps.push({
        title: `Create ${p.name} content series`,
        description: `Develop a regular content series around ${p.name} to build authority`,
        score: p.engagementPotential || 70,
        pillar: p.name,
        effort: 'medium',
        timeframe: '1-2 weeks',
      });
    });

    if (careerGoals.includes('job_search')) {
      opps.push({ title: 'Job Search Content Strategy', description: 'Share your job search journey and tips', score: 85, pillar: 'Job Search', effort: 'medium', timeframe: '1 month' });
    }
    if (careerGoals.includes('personal_brand')) {
      opps.push({ title: 'Thought Leadership Series', description: 'Start a weekly thought leadership series', score: 80, pillar: 'Thought Leadership', effort: 'high', timeframe: '2-3 months' });
    }
    if (githubData?.connected) {
      opps.push({ title: 'Open Source Showcase', description: 'Highlight your open source contributions', score: 70, pillar: 'Open Source', effort: 'low', timeframe: '1 week' });
    }

    return opps.slice(0, 8);
  }

  private calculateProfileScore(resumeData: any, linkedinData: any, githubData: any, scores: any): number {
    let score = 0;

    const avgScore = (
      (scores.technicalLeadership || 0) +
      (scores.contentReadiness || 0) +
      (scores.industryAuthority || 0) +
      (scores.personalBrand || 0) +
      (scores.careerOpportunity || 0)
    ) / 5;
    score = avgScore * 0.5;

    let profileItems = 0;
    let profileComplete = 0;
    if (linkedinData?.headline) { profileItems++; profileComplete++; }
    else { profileItems++; }
    if (linkedinData?.about) { profileItems++; profileComplete++; }
    else { profileItems++; }
    if (linkedinData?.experience?.length > 0) { profileItems++; profileComplete++; }
    else { profileItems++; }
    if (linkedinData?.skills?.length > 0) { profileItems++; profileComplete++; }
    else { profileItems++; }
    if (resumeData?.projects?.length > 0) { profileItems++; profileComplete++; }
    else { profileItems++; }
    if (resumeData?.certifications?.length > 0) { profileItems++; profileComplete++; }
    else { profileItems++; }
    if (githubData?.connected) { profileItems++; profileComplete++; }
    else { profileItems++; }

    score += (profileComplete / profileItems) * 50;

    return Math.min(100, Math.round(score));
  }

  private generateProfileHealth(resumeData: any, linkedinData: any, githubData: any): any[] {
    const health: any[] = [];

    health.push({
      section: 'Headline',
      status: linkedinData?.headline ? (linkedinData.headline.length > 30 ? 'strong' : 'good') : 'missing',
      details: linkedinData?.headline || 'No headline set',
    });

    health.push({
      section: 'About Section',
      status: linkedinData?.about ? (linkedinData.about.length > 100 ? 'strong' : 'needs_improvement') : 'missing',
      details: linkedinData?.about ? `${linkedinData.about.length} characters` : 'No about section',
    });

    health.push({
      section: 'Experience',
      status: linkedinData?.experience?.length > 0 ? (linkedinData.experience.length >= 3 ? 'strong' : 'good') : 'missing',
      details: linkedinData?.experience?.length > 0 ? `${linkedinData.experience.length} positions` : 'No experience listed',
    });

    health.push({
      section: 'Skills',
      status: linkedinData?.skills?.length > 0 ? (linkedinData.skills.length >= 10 ? 'strong' : 'needs_improvement') : 'missing',
      details: linkedinData?.skills?.length > 0 ? `${linkedinData.skills.length} skills` : 'No skills listed',
    });

    health.push({
      section: 'Projects',
      status: resumeData?.projects?.length > 0 ? (resumeData.projects.length >= 3 ? 'strong' : 'good') : 'missing',
      details: resumeData?.projects?.length > 0 ? `${resumeData.projects.length} projects` : 'No projects featured',
    });

    health.push({
      section: 'Certifications',
      status: resumeData?.certifications?.length > 0 ? 'strong' : 'missing',
      details: resumeData?.certifications?.length > 0 ? `${resumeData.certifications.length} certifications` : 'No certifications',
    });

    health.push({
      section: 'GitHub',
      status: githubData?.connected ? (githubData.repos >= 5 ? 'strong' : 'good') : 'missing',
      details: githubData?.connected ? `${githubData.repos} repos` : 'GitHub not connected',
    });

    health.push({
      section: 'Profile Photo',
      status: 'good',
      details: 'Profile photo present',
    });

    return health;
  }

  private generateMissingSections(resumeData: any, linkedinData: any, githubData: any): any[] {
    const missing: any[] = [];

    if (!linkedinData?.about) missing.push({ section: 'About Section', priority: 'high', reason: 'A strong About section improves profile views by 40%' });
    if (!linkedinData?.headline || linkedinData.headline.length < 20) missing.push({ section: 'Headline', priority: 'high', reason: 'Your headline is the first thing recruiters see' });
    if (!linkedinData?.experience?.length) missing.push({ section: 'Work Experience', priority: 'high', reason: 'Experience establishes professional credibility' });
    if (!linkedinData?.skills?.length || linkedinData.skills.length < 5) missing.push({ section: 'Skills', priority: 'medium', reason: 'Skills help you appear in search results' });
    if (!resumeData?.projects?.length) missing.push({ section: 'Featured Projects', priority: 'high', reason: 'Projects demonstrate practical abilities' });
    if (!resumeData?.certifications?.length) missing.push({ section: 'Certifications', priority: 'medium', reason: 'Certifications validate your expertise' });
    if (!githubData?.connected) missing.push({ section: 'GitHub Profile', priority: 'medium', reason: 'GitHub showcases your technical work' });

    return missing;
  }

  private generateImprovements(resumeData: any, linkedinData: any, githubData: any, scores: any): any[] {
    const improvements: any[] = [];

    if (!linkedinData?.about || linkedinData.about.length < 100) {
      improvements.push({
        title: 'Improve About Section',
        priority: 'high',
        impact: 'Increase profile views and connection requests',
        effort: '20 mins',
        description: 'Write a compelling 3-paragraph About section highlighting your journey, skills, and what you are looking for',
      });
    }

    if (!linkedinData?.headline || linkedinData.headline.length < 30) {
      improvements.push({
        title: 'Optimize Headline',
        priority: 'high',
        impact: 'Appear in more search results',
        effort: '10 mins',
        description: 'Include your role, key skills, and value proposition in your headline',
      });
    }

    if (resumeData?.projects?.length === 0) {
      improvements.push({
        title: 'Add Featured Projects',
        priority: 'high',
        impact: 'Demonstrate practical skills and initiative',
        effort: '30 mins',
        description: 'Showcase your top 3 projects with links and descriptions',
      });
    }

    if (linkedinData?.skills?.length < 10) {
      improvements.push({
        title: 'Add More Skills',
        priority: 'medium',
        impact: 'Appear in skill-based searches',
        effort: '10 mins',
        description: 'Add at least 10 relevant skills to improve discoverability',
      });
    }

    if (resumeData?.certifications?.length === 0) {
      improvements.push({
        title: 'Add Certifications',
        priority: 'medium',
        impact: 'Validate expertise and build trust',
        effort: '20 mins',
        description: 'Add industry-recognized certifications to strengthen credibility',
      });
    }

    if (!githubData?.connected) {
      improvements.push({
        title: 'Connect GitHub',
        priority: 'medium',
        impact: 'Enable AI to suggest technical content',
        effort: '5 mins',
        description: 'Link your GitHub to unlock AI-powered content suggestions',
      });
    }

    if (scores.personalBrand < 30) {
      improvements.push({
        title: 'Build Personal Brand',
        priority: 'high',
        impact: 'Increase visibility and recognition',
        effort: '1 hour/week',
        description: 'Start posting regularly and engaging with your network',
      });
    }

    return improvements.slice(0, 6);
  }

  private generateContentOpportunities(resumeData: any, linkedinData: any, githubData: any, careerGoals: string[], pillars: any[]): any[] {
    const opps: any[] = [];

    if (resumeData?.experience?.length > 0) {
      const roles = resumeData.experience.slice(0, 3);
      roles.forEach((exp: any) => {
        opps.push({
          topic: `${exp.title || 'Role'} Lessons`,
          reason: `Share insights from your experience as ${exp.title || 'a professional'}`,
          engagementScore: 75,
          pillar: 'Career Growth',
        });
      });
    }

    if (resumeData?.projects?.length > 0) {
      resumeData.projects.slice(0, 2).forEach((p: any) => {
        opps.push({
          topic: `${p.name || 'Project'} Deep Dive`,
          reason: `Technical breakdown of building ${p.name || 'this project'}`,
          engagementScore: 80,
          pillar: 'Technical',
        });
      });
    }

    if (githubData?.connected) {
      opps.push({
        topic: 'Open Source Journey',
        reason: 'Share what you learned contributing to open source',
        engagementScore: 70,
        pillar: 'Open Source',
      });
    }

    if (careerGoals.includes('job_search')) {
      opps.push({
        topic: 'Job Search Tips',
        reason: 'Share your job search strategy and interview tips',
        engagementScore: 85,
        pillar: 'Career Growth',
      });
    }

    if (resumeData?.skills?.some((s: string) => /machine.?learning|ai|deep.?learning/i.test(s))) {
      opps.push({
        topic: 'AI/ML Project Walkthrough',
        reason: 'Technical deep dive into your AI projects',
        engagementScore: 90,
        pillar: 'AI & Machine Learning',
      });
    }

    if (resumeData?.skills?.some((s: string) => /react|vue|angular|next/i.test(s))) {
      opps.push({
        topic: 'Frontend Architecture Tips',
        reason: 'Share frontend best practices and patterns',
        engagementScore: 75,
        pillar: 'Frontend',
      });
    }

    return opps.slice(0, 5);
  }

  private generateAISummary(name: string, resumeData: any, linkedinData: any, githubData: any, scores: any, strengths: any[], weaknesses: any[], pillars: any[]): string {
    const firstName = name.split(' ')[0] || 'The user';
    const hasLinkedIn = linkedinData?.connected;
    const hasGitHub = githubData?.connected;
    const hasResume = resumeData?.skills?.length > 0;

    const parts: string[] = [];

    parts.push(`${firstName} is a professional`);

    if (resumeData?.currentRole) {
      parts[parts.length - 1] += ` working as ${resumeData.currentRole}`;
    } else if (resumeData?.totalExperienceYears > 0) {
      parts[parts.length - 1] += ` with ${resumeData.totalExperienceYears} years of experience`;
    }
    parts[parts.length - 1] += '.';

    if (hasLinkedIn) {
      parts.push('The LinkedIn profile is connected');
      if (linkedinData.experience?.length > 0) {
        parts.push(`with ${linkedinData.experience.length} positions listed`);
      }
      parts.push('.');
    } else {
      parts.push('The LinkedIn profile is not yet connected.');
    }

    if (hasGitHub && githubData.repos > 0) {
      parts.push(`GitHub profile has ${githubData.repos} repositories`);
      if (githubData.languages?.length > 0) {
        parts.push(`primarily using ${githubData.languages.slice(0, 3).join(', ')}`);
      }
      parts.push('.');
    }

    const topStrengths = strengths.slice(0, 2).map((s: any) => s.title.toLowerCase());
    if (topStrengths.length > 0) {
      parts.push(`Key strengths include ${topStrengths.join(' and ')}.`);
    }

    const topWeaknesses = weaknesses.slice(0, 2).map((w: any) => w.title.toLowerCase());
    if (topWeaknesses.length > 0) {
      parts.push(`Areas for improvement: ${topWeaknesses.join(' and ')}.`);
    }

    if (pillars.length > 0) {
      const topPillars = pillars.slice(0, 2).map((p: any) => p.name);
      parts.push(`Recommended content focus: ${topPillars.join(' and ')}.`);
    }

    return parts.join(' ');
  }
}

export const analysisService = new AnalysisService();
