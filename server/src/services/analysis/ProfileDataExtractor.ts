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

  async extractLinkedInData(accessToken: string, linkedinUrl: string): Promise<LinkedInProfileData> {
    logger.info({ linkedinUrl }, 'Starting LinkedIn data extraction');

    const emptyData: LinkedInProfileData = {
      connected: false,
      username: this.extractLinkedInUsername(linkedinUrl),
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
      featured: [],
      connections: 0,
    };

    if (!accessToken) {
      logger.warn('No LinkedIn access token provided');
      return emptyData;
    }

    try {
      const headers = { Authorization: `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' };

      const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', { headers, timeout: 10000 }).catch(() => null);

      let profile: any = {};
      if (profileRes?.data) {
        profile = profileRes.data;
        logger.info({ sub: profile.sub, name: profile.name }, 'LinkedIn basic profile fetched');
      }

      let email = '';
      try {
        const emailRes = await axios.get('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', { headers, timeout: 10000 });
        email = emailRes.data?.elements?.[0]?.['handle~']?.emailAddress || '';
      } catch { logger.debug('Could not fetch LinkedIn email'); }

      let headline = '';
      let about = '';
      let location = '';
      let industry = '';
      let experience: any[] = [];
      let education: any[] = [];
      let skills: string[] = [];
      let certifications: any[] = [];
      let profilePicture = '';

      const legacyHeaders = { Authorization: `Bearer ${accessToken}` };

      try {
        const personRes = await axios.get('https://api.linkedin.com/v2/people/~:(id,headline,summary,location,industry,profilePicture(displayImage~:playableStreams))', { headers: legacyHeaders, timeout: 10000 }).catch(() => null);
        if (personRes?.data) {
          headline = personRes.data.headline || '';
          about = personRes.data.summary || '';
          location = personRes.data.location?.name || '';
          industry = personRes.data.industry || '';
          profilePicture = personRes.data.profilePicture?.displayImage?.elements?.slice(-1)?.[0]?.identifiers?.[0]?.identifier || '';
          logger.info({ headline: headline.substring(0, 50) }, 'LinkedIn person data fetched');
        }
      } catch (e: any) { logger.debug({ error: e.message }, 'Could not fetch LinkedIn person data'); }

      try {
        const positionsRes = await axios.get('https://api.linkedin.com/v2/people/~/positions?count=50', { headers: legacyHeaders, timeout: 10000 }).catch(() => null);
        if (positionsRes?.data?.values) {
          experience = positionsRes.data.values.map((pos: any) => ({
            title: pos.title || '',
            organization: pos.company?.name || '',
            location: pos.location?.name || '',
            description: pos.description || '',
            startDate: pos.startDate ? `${pos.startDate.year}-${String(pos.startDate.month || 1).padStart(2, '0')}` : '',
            endDate: pos.endDate ? `${pos.endDate.year}-${String(pos.endDate.month || 1).padStart(2, '0')}` : '',
            current: pos.isCurrent || false,
          }));
          logger.info({ count: experience.length }, 'LinkedIn positions fetched');
        }
      } catch (e: any) { logger.debug({ error: e.message }, 'Could not fetch LinkedIn positions'); }

      try {
        const eduRes = await axios.get('https://api.linkedin.com/v2/people/~/educations?count=50', { headers: legacyHeaders, timeout: 10000 }).catch(() => null);
        if (eduRes?.data?.values) {
          education = eduRes.data.values.map((edu: any) => ({
            schoolName: edu.schoolName || '',
            degree: edu.degree || '',
            fieldOfStudy: edu.fieldOfStudy || '',
            startDate: edu.startDate ? `${edu.startDate.year}` : '',
            endDate: edu.endDate ? `${edu.endDate.year}` : '',
          }));
          logger.info({ count: education.length }, 'LinkedIn education fetched');
        }
      } catch (e: any) { logger.debug({ error: e.message }, 'Could not fetch LinkedIn education'); }

      try {
        const skillsRes = await axios.get('https://api.linkedin.com/v2/people/~/skills?count=100', { headers: legacyHeaders, timeout: 10000 }).catch(() => null);
        if (skillsRes?.data?.values) {
          skills = skillsRes.data.values.map((s: any) => s.skill?.name || s.name || '').filter(Boolean);
          logger.info({ count: skills.length }, 'LinkedIn skills fetched');
        }
      } catch (e: any) { logger.debug({ error: e.message }, 'Could not fetch LinkedIn skills'); }

      return {
        connected: true,
        username: emptyData.username || profile.sub || '',
        fullName: profile.name || '',
        headline,
        about,
        location,
        industry,
        profilePicture,
        experience,
        education,
        skills,
        certifications,
        featured: [],
        connections: 0,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'LinkedIn data extraction failed');
      return emptyData;
    }
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
