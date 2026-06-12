import axios from 'axios';
import pino from 'pino';

const logger = pino({ name: 'profile-extractor' });

export interface LinkedInProfileData {
  connected: boolean;
  username: string;
  fullName: string;
  headline: string;
  about: string;
  location: string;
  industry: string;
  profilePicture: string;
  experience: { title: string; organization: string; location: string; description: string; startDate: string; endDate: string; current: boolean }[];
  education: { schoolName: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string }[];
  skills: string[];
  certifications: { name: string; authority: string; url: string }[];
  projects: { name: string; description: string; url: string }[];
  featured: { title: string; description: string; url: string }[];
  connections: number;
}

export interface GitHubProfileData {
  connected: boolean;
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  languages: string[];
  topRepos: { name: string; description: string; stars: number; forks: number; language: string; url: string; topics: string[] }[];
  pinnedRepos: { name: string; description: string; stars: number; forks: number; language: string; url: string }[];
  totalStars: number;
  totalForks: number;
  contributionStreak: number;
  recentActivity: { type: string; repo: string; date: string }[];
}

export interface ResumeData {
  skills: string[];
  experience: { title: string; organization: string; location: string; description: string; startDate: string; endDate: string; current: boolean }[];
  education: { institution: string; degree: string; field: string; startDate: string; endDate: string }[];
  certifications: { name: string; issuer: string; date: string }[];
  projects: { name: string; description: string; technologies: string[]; url: string }[];
  summary: string;
  totalExperienceYears: number;
  currentRole: string;
  industries: string[];
}

export class ProfileDataExtractor {

  async extractLinkedInData(pdfParsedData: any, linkedinUrl: string): Promise<LinkedInProfileData> {
    logger.info({ hasPdfData: !!pdfParsedData, type: typeof pdfParsedData }, 'Extracting LinkedIn data from PDF');

    if (pdfParsedData) {
      logger.info({
        fullName: pdfParsedData.fullName || '(empty)',
        headline: pdfParsedData.headline || '(empty)',
        aboutLength: pdfParsedData.about?.length || 0,
        experienceCount: pdfParsedData.experience?.length || 0,
        educationCount: pdfParsedData.education?.length || 0,
        skillsCount: pdfParsedData.skills?.length || 0,
        certificationsCount: pdfParsedData.certifications?.length || 0,
      }, 'PDF parsed data contents');

      const linkedinData: LinkedInProfileData = {
        connected: true,
        username: this.extractLinkedInUsername(linkedinUrl),
        fullName: pdfParsedData.fullName || '',
        headline: pdfParsedData.headline || '',
        about: pdfParsedData.about || '',
        location: pdfParsedData.location || '',
        industry: '',
        profilePicture: '',
        experience: (pdfParsedData.experience || []).map((e: any) => ({
          title: e.title || '',
          organization: e.organization || '',
          location: e.location || '',
          description: e.description || '',
          startDate: e.startDate || '',
          endDate: e.endDate || '',
          current: e.current || false,
        })),
        education: (pdfParsedData.education || []).map((e: any) => ({
          schoolName: e.schoolName || '',
          degree: e.degree || '',
          fieldOfStudy: e.fieldOfStudy || '',
          startDate: e.startDate || '',
          endDate: e.endDate || '',
        })),
        skills: pdfParsedData.skills || [],
        certifications: (pdfParsedData.certifications || []).map((c: any) => ({
          name: c.name || '',
          authority: c.authority || '',
          url: c.url || '',
        })),
        projects: (pdfParsedData.projects || []).map((p: any) => ({
          name: p.name || p.title || '',
          description: p.description || '',
          url: p.url || p.link || '',
        })),
        featured: (pdfParsedData.featured || []).map((f: any) => ({
          title: f.title || '',
          description: f.description || '',
          url: f.url || '',
        })),
        connections: parseInt(pdfParsedData.connections) || 0,
      };

      logger.info({
        name: linkedinData.fullName,
        headline: linkedinData.headline.substring(0, 50),
        experience: linkedinData.experience.length,
        skills: linkedinData.skills.length,
      }, 'LinkedIn PDF data extracted');

      return linkedinData;
    }

    logger.warn('No LinkedIn PDF data provided');
    return this.emptyLinkedInData();
  }

  async extractGitHubData(githubUrl: string): Promise<GitHubProfileData> {
    const username = this.extractGitHubUsername(githubUrl);
    logger.info({ username }, 'Starting GitHub data extraction');

    const emptyData: GitHubProfileData = {
      connected: false,
      username,
      name: '',
      bio: '',
      avatarUrl: '',
      publicRepos: 0,
      followers: 0,
      following: 0,
      languages: [],
      topRepos: [],
      pinnedRepos: [],
      totalStars: 0,
      totalForks: 0,
      contributionStreak: 0,
      recentActivity: [],
    };

    if (!username) {
      logger.warn('No GitHub username extracted');
      return emptyData;
    }

    try {
      const userRes = await axios.get(`https://api.github.com/users/${username}`, {
        headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'PersonaOS-Analysis' },
        timeout: 10000,
      });

      const userData = userRes.data;
      emptyData.connected = true;
      emptyData.name = userData.name || '';
      emptyData.bio = userData.bio || '';
      emptyData.avatarUrl = userData.avatar_url || '';
      emptyData.publicRepos = userData.public_repos || 0;
      emptyData.followers = userData.followers || 0;
      emptyData.following = userData.following || 0;
      logger.info({ name: userData.name, repos: userData.public_repos }, 'GitHub user profile fetched');

      const reposRes = await axios.get(`https://api.github.com/users/${username}/repos?sort=stars&per_page=30`, {
        headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'PersonaOS-Analysis' },
        timeout: 10000,
      });

      const repos = reposRes.data || [];
      const langSet = new Set<string>();
      let totalStars = 0;
      let totalForks = 0;

      const topRepos = repos
        .filter((r: any) => !r.fork)
        .sort((a: any, b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        .slice(0, 10)
        .map((r: any) => {
          if (r.language) langSet.add(r.language);
          totalStars += r.stargazers_count || 0;
          totalForks += r.forks_count || 0;
          return {
            name: r.name || '',
            description: r.description || '',
            stars: r.stargazers_count || 0,
            forks: r.forks_count || 0,
            language: r.language || '',
            url: r.html_url || '',
            topics: r.topics || [],
          };
        });

      emptyData.topRepos = topRepos;
      emptyData.pinnedRepos = topRepos.slice(0, 6);
      emptyData.languages = Array.from(langSet);
      emptyData.totalStars = totalStars;
      emptyData.totalForks = totalForks;

      logger.info({ repoCount: repos.length, languages: Array.from(langSet), totalStars }, 'GitHub repos analyzed');

      try {
        const eventsRes = await axios.get(`https://api.github.com/users/${username}/events/public?per_page=30`, {
          headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'PersonaOS-Analysis' },
          timeout: 10000,
        });

        const events = eventsRes.data || [];
        const recentActivity = events.slice(0, 10).map((e: any) => ({
          type: e.type || '',
          repo: e.repo?.name || '',
          date: e.created_at || '',
        }));
        emptyData.recentActivity = recentActivity;

        const pushEvents = events.filter((e: any) => e.type === 'PushEvent');
        if (pushEvents.length > 0) {
          const dates = pushEvents.map((e: any) => new Date(e.created_at).toDateString());
          const uniqueDates = [...new Set(dates)];
          emptyData.contributionStreak = uniqueDates.length;
        }

        logger.info({ eventCount: events.length, streak: emptyData.contributionStreak }, 'GitHub activity fetched');
      } catch (e: any) { logger.debug({ error: e.message }, 'Could not fetch GitHub events'); }

      return emptyData;
    } catch (error: any) {
      logger.error({ error: error.message, username }, 'GitHub data extraction failed');
      return emptyData;
    }
  }

  extractResumeData(resumeModel: any): ResumeData {
    logger.info('Extracting resume data from model');
    const parsed = resumeModel?.parsed || {};
    const rawText = resumeModel?.rawText || '';

    const skills = parsed.skills || [];
    const experience = (parsed.experience || []).map((e: any) => ({
      title: e.title || e.role || '',
      organization: e.company || e.organization || e.companyName || '',
      location: e.location || '',
      description: e.description || e.details || '',
      startDate: e.startDate || e.start || '',
      endDate: e.endDate || e.end || '',
      current: e.current || e.isPresent || false,
    }));

    const education = (parsed.education || []).map((e: any) => ({
      institution: e.school || e.institution || e.schoolName || '',
      degree: e.degree || '',
      field: e.field || e.fieldOfStudy || e.major || '',
      startDate: e.startDate || '',
      endDate: e.endDate || e.graduationDate || '',
    }));

    const certifications = (parsed.certifications || []).map((c: any) => ({
      name: c.name || c.title || '',
      issuer: c.issuer || c.authority || c.organization || '',
      date: c.date || c.issueDate || '',
    }));

    const projects = (parsed.projects || []).map((p: any) => ({
      name: p.name || p.title || '',
      description: p.description || '',
      technologies: p.technologies || p.tech || p.skills || [],
      url: p.url || p.link || '',
    }));

    const summary = parsed.summary || parsed.objective || rawText.substring(0, 500) || '';

    let totalExperienceYears = 0;
    for (const exp of experience) {
      if (exp.startDate) {
        const start = new Date(exp.startDate);
        const end = exp.endDate ? new Date(exp.endDate) : new Date();
        totalExperienceYears += (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
      }
    }

    const currentExp = experience.find((e: any) => e.current);
    const currentRole = currentExp ? `${currentExp.title} at ${currentExp.organization}`.trim() : '';

    const industries = new Set<string>();
    for (const exp of experience) {
      if (exp.organization) industries.add(exp.organization);
    }

    const resumeData: ResumeData = {
      skills,
      experience,
      education,
      certifications,
      projects,
      summary,
      totalExperienceYears: Math.round(totalExperienceYears),
      currentRole,
      industries: Array.from(industries),
    };

    logger.info({
      skillCount: skills.length,
      expCount: experience.length,
      eduCount: education.length,
      certCount: certifications.length,
      projectCount: projects.length,
      totalYears: totalExperienceYears,
    }, 'Resume data extracted');

    return resumeData;
  }

  private extractLinkedInUsername(url: string): string {
    const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
    return match ? match[1] : '';
  }

  private extractGitHubUsername(url: string): string {
    const match = url.match(/github\.com\/([^/?]+)/);
    return match ? match[1] : '';
  }

  private emptyLinkedInData(): LinkedInProfileData {
    return {
      connected: false,
      username: '',
      fullName: '',
      headline: '',
      about: '',
      location: '',
      industry: '',
      profilePicture: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      projects: [],
      featured: [],
      connections: 0,
    };
  }

  decryptAccessToken(encrypted: string): string {
    try {
      const crypto = require('crypto');
      const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
      const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substring(0, 32);
      const parts = encrypted.split(':');
      if (parts.length !== 2) return '';
      const iv = Buffer.from(parts[0], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(parts[1], 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e: any) {
      logger.warn({ err: e.message }, 'Failed to decrypt access token');
      return '';
    }
  }
}

export const profileDataExtractor = new ProfileDataExtractor();
