import pino from 'pino';
import {
  ProfessionalIdentity,
  CareerStage,
  ProfileType,
  LinkedInUserProfile,
} from '../../types/linkedin';
import { ParsedProfile } from '../linkedin/ProfileParser';

const logger = pino();

const ROLE_PATTERNS: Array<{ pattern: RegExp; role: string; weight: number }> = [
  { pattern: /(?:chief|head|vp|vice president|director|principal)\s+(?:technology|engineering|product|data|ai)/i, role: 'Technology Executive', weight: 1.0 },
  { pattern: /(?:chief|head|vp|vice president|director|principal)\s+(?:marketing|sales|revenue|growth)/i, role: 'Business Executive', weight: 1.0 },
  { pattern: /(?:staff|principal|lead|senior)\s+(?:engineer|software engineer|developer)/i, role: 'Senior Engineer', weight: 0.95 },
  { pattern: /(?:full.stack|frontend|backend|software|systems?)\s*(?:engineer|developer)/i, role: 'Software Engineer', weight: 0.9 },
  { pattern: /data\s+(?:scientist|engineer|analyst)/i, role: 'Data Professional', weight: 0.9 },
  { pattern: /(?:ml|machine learning|ai|artificial intelligence)\s+(?:engineer|scientist|researcher)/i, role: 'AI/ML Engineer', weight: 0.95 },
  { pattern: /product\s+(?:manager|owner|director)/i, role: 'Product Manager', weight: 0.9 },
  { pattern: /(?:founder|co-founder|ceo|cto)/i, role: 'Founder/CEO', weight: 1.0 },
  { pattern: /designer|ux|product design/i, role: 'Designer', weight: 0.85 },
  { pattern: /consultant|advisor/i, role: 'Consultant', weight: 0.8 },
  { pattern: /freelance|self.employed|independent/i, role: 'Freelancer', weight: 0.8 },
  { pattern: /researcher|research\s+scientist/i, role: 'Researcher', weight: 0.85 },
  { pattern: /professor|lecturer|instructor|teacher/i, role: 'Educator', weight: 0.85 },
  { pattern: /student|intern/i, role: 'Student/Intern', weight: 0.9 },
  { pattern: /recruiter|talent|hr/i, role: 'Recruiter/HR', weight: 0.85 },
  { pattern: /marketer|marketing|growth|content\s+strategist/i, role: 'Marketer', weight: 0.85 },
  { pattern: /analyst|business\s+analyst|strategy/i, role: 'Analyst', weight: 0.8 },
  { pattern: /project\s+manager|program\s+manager|technical\s+project/i, role: 'Project Manager', weight: 0.8 },
  { pattern: /devops|site\s+reliability|platform\s+engineer|infrastructure/i, role: 'DevOps/SRE', weight: 0.9 },
  { pattern: /security|cybersecurity|infosec/i, role: 'Security Professional', weight: 0.9 },
  { pattern: /architect|solutions\s+architect|technical\s+architect/i, role: 'Architect', weight: 0.9 },
  { pattern: /manager\s+of|engineering\s+manager|team\s+lead/i, role: 'Engineering Manager', weight: 0.9 },
];

const SOFT_SKILLS = [
  'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
  'project management', 'mentoring', 'public speaking', 'writing', 'negotiation',
  'collaboration', 'adaptability', 'creativity', 'strategic planning', 'decision making',
  'conflict resolution', 'emotional intelligence', 'time management', 'stakeholder management',
  'cross-functional collaboration',
];

export class IdentityDetectionService {
  detectIdentity(parsed: ParsedProfile, profile: LinkedInUserProfile): ProfessionalIdentity {
    const headline = profile.headline || '';
    const about = profile.about || '';
    const allText = `${headline} ${about}`.toLowerCase();
    const titles = profile.experience?.map(e => e.title) || [];
    const currentTitle = titles.find((_, i) => profile.experience?.[i]?.currentlyWorking) || titles[0] || '';

    const detectedRole = this.detectRole(headline, currentTitle, allText);
    const roleConfidence = this.computeRoleConfidence(detectedRole, headline, currentTitle);
    const technicalSkills = this.extractTechnicalSkills(parsed, about);
    const softSkills = this.extractSoftSkills(about, parsed);
    const domainExpertise = this.extractDomainExpertise(parsed, profile);
    const interests = this.extractInterests(about, parsed);
    const audienceType = this.determineAudienceType(parsed, detectedRole);
    const growthDirection = this.determineGrowthDirection(parsed, detectedRole);
    const careerPaths = this.suggestCareerPaths(parsed, detectedRole);

    return {
      currentRole: currentTitle || detectedRole,
      careerStage: parsed.summary.careerStage,
      profileType: parsed.summary.profileType,
      industry: parsed.summary.industry,
      technicalSkills,
      softSkills,
      domainExpertise,
      professionalInterests: interests,
      audienceType,
      growthDirection,
      potentialCareerPaths: careerPaths,
      detectedRole,
      roleConfidence,
      summary: this.generateSummary(detectedRole, parsed, technicalSkills),
    };
  }

  private detectRole(headline: string, currentTitle: string, allText: string): string {
    const sources = [headline, currentTitle, allText];

    for (const { pattern, role, weight } of ROLE_PATTERNS) {
      for (const source of sources) {
        if (pattern.test(source)) {
          return role;
        }
      }
    }
    return 'Professional';
  }

  private computeRoleConfidence(role: string, headline: string, currentTitle: string): number {
    let confidence = 0.5;
    const headlineLower = headline.toLowerCase();
    const titleLower = currentTitle.toLowerCase();

    for (const { pattern, role: matchedRole, weight } of ROLE_PATTERNS) {
      if (pattern.test(headlineLower) && matchedRole === role) {
        confidence = Math.max(confidence, weight);
      }
      if (pattern.test(titleLower) && matchedRole === role) {
        confidence = Math.max(confidence, weight * 0.9);
      }
    }

    return Math.round(confidence * 100);
  }

  private extractTechnicalSkills(parsed: ParsedProfile, about: string): string[] {
    const skills = new Set<string>();
    const aboutLower = about.toLowerCase();

    for (const skill of parsed.skills.topSkills) {
      skills.add(skill);
    }

    const techKeywords = [
      'typescript', 'javascript', 'python', 'java', 'go', 'rust', 'c++', 'ruby', 'swift', 'kotlin',
      'react', 'angular', 'vue', 'node', 'next.js', 'express', 'django', 'flask', 'spring',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd',
      'sql', 'postgresql', 'mongodb', 'redis', 'kafka', 'graphql',
      'machine learning', 'deep learning', 'nlp', 'computer vision', 'llm',
      'tensorflow', 'pytorch', 'scikit-learn', 'pandas', 'numpy',
      'agile', 'scrum', 'jira', 'git', 'linux', 'rest', 'api',
    ];

    for (const keyword of techKeywords) {
      if (aboutLower.includes(keyword)) {
        skills.add(keyword);
      }
    }

    return Array.from(skills).slice(0, 20);
  }

  private extractSoftSkills(about: string, parsed: ParsedProfile): string[] {
    const found = new Set<string>();
    const aboutLower = about.toLowerCase();

    for (const skill of SOFT_SKILLS) {
      if (aboutLower.includes(skill)) {
        found.add(skill);
      }
    }

    const expDescriptions = parsed.profile.experience?.map(e => (e.description || '').toLowerCase()) || [];
    for (const desc of expDescriptions) {
      for (const skill of SOFT_SKILLS) {
        if (desc.includes(skill)) {
          found.add(skill);
        }
      }
    }

    return Array.from(found).slice(0, 10);
  }

  private extractDomainExpertise(parsed: ParsedProfile, profile: LinkedInUserProfile): string[] {
    const expertise = new Set<string>();
    const allText = [
      profile.headline || '',
      profile.about || '',
      ...(profile.experience?.map(e => `${e.title} ${e.description || ''}`) || []),
    ].join(' ').toLowerCase();

    const domainKeywords: Record<string, string[]> = {
      'Software Engineering': ['software', 'engineering', 'development', 'programming'],
      'Data Science': ['data science', 'data', 'analytics', 'statistics'],
      'Artificial Intelligence': ['ai', 'artificial intelligence', 'machine learning', 'deep learning'],
      'Cloud Computing': ['cloud', 'aws', 'azure', 'gcp', 'infrastructure'],
      'Product Management': ['product', 'product management', 'roadmap'],
      'DevOps': ['devops', 'ci/cd', 'deployment', 'infrastructure'],
      'Cybersecurity': ['security', 'cybersecurity', 'infosec'],
      'Blockchain': ['blockchain', 'web3', 'crypto', 'smart contract'],
      'Mobile Development': ['mobile', 'ios', 'android', 'react native'],
      'UX/UI Design': ['ux', 'ui', 'user experience', 'design'],
    };

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(k => allText.includes(k))) {
        expertise.add(domain);
      }
    }

    const industries = parsed.experience.industries;
    for (const ind of industries) {
      if (ind && !expertise.has(ind)) {
        expertise.add(ind);
      }
    }

    return Array.from(expertise).slice(0, 8);
  }

  private extractInterests(about: string, parsed: ParsedProfile): string[] {
    const interests = new Set<string>();
    const aboutLower = about.toLowerCase();

    const interestKeywords = [
      'innovation', 'technology', 'leadership', 'mentoring', 'startups',
      'open source', 'community', 'education', 'research', 'writing',
      'speaking', 'consulting', 'entrepreneurship', 'blockchain', 'ai',
      'sustainability', 'diversity', 'remote work', 'future of work',
    ];

    for (const keyword of interestKeywords) {
      if (aboutLower.includes(keyword)) {
        interests.add(keyword);
      }
    }

    return Array.from(interests).slice(0, 8);
  }

  private determineAudienceType(parsed: ParsedProfile, role: string): string {
    if (parsed.summary.profileType === 'founder') return 'Investors, Customers, Talent';
    if (parsed.summary.profileType === 'influencer') return 'Industry Followers, Brands';
    if (parsed.summary.profileType === 'recruiter') return 'Job Seekers, Hiring Managers';
    if (role.includes('Executive')) return 'C-Suite, Board Members, Industry Peers';
    if (role.includes('Manager')) return 'Team Members, Stakeholders, Leadership';
    if (parsed.summary.careerStage === 'entry-level') return 'Recruiters, Mentors, Peers';
    return 'Industry Professionals, Recruiters, Peers';
  }

  private determineGrowthDirection(parsed: ParsedProfile, role: string): string {
    const stage = parsed.summary.careerStage;
    if (stage === 'entry-level') return 'Moving toward mid-level specialization';
    if (stage === 'mid-level') return 'Building toward senior leadership';
    if (stage === 'senior') return 'Transitioning to strategic leadership';
    if (stage === 'leadership') return 'Expanding executive influence';
    if (stage === 'executive') return 'Building industry-wide authority';
    if (parsed.summary.profileType === 'founder') return 'Scaling venture and personal brand';
    if (parsed.summary.profileType === 'freelancer') return 'Growing client base and rates';
    return 'Building professional authority';
  }

  private suggestCareerPaths(parsed: ParsedProfile, role: string): string[] {
    const stage = parsed.summary.careerStage;
    const paths: string[] = [];

    if (role.includes('Engineer') || role.includes('Developer')) {
      if (stage === 'entry-level' || stage === 'mid-level') {
        paths.push('Senior Software Engineer', 'Tech Lead', 'Engineering Manager');
      } else {
        paths.push('Principal Engineer', 'Engineering Director', 'CTO');
      }
    }

    if (role.includes('Data') || role.includes('AI')) {
      paths.push('Lead Data Scientist', 'AI Research Lead', 'Chief Data Officer');
    }

    if (role.includes('Product')) {
      paths.push('Senior Product Manager', 'Director of Product', 'CPO');
    }

    if (role.includes('Founder')) {
      paths.push('Scale-up CEO', 'Serial Entrepreneur', 'VC/Investor');
    }

    if (paths.length === 0) {
      paths.push('Senior Individual Contributor', 'Team Lead', 'Department Head');
    }

    return paths.slice(0, 5);
  }

  private generateSummary(role: string, parsed: ParsedProfile, skills: string[]): string {
    const stage = parsed.summary.careerStage;
    const skillList = skills.slice(0, 3).join(', ');
    const yearExp = parsed.summary.totalExperienceYears;

    return `${role} with ${yearExp} years of experience specializing in ${skillList}. ` +
      `Currently in ${stage} career stage within the ${parsed.summary.industry} industry. ` +
      `Demonstrated expertise across ${parsed.summary.totalSkills} skills with ${parsed.experience.totalRoles} roles across ${parsed.experience.uniqueCompanies} organizations.`;
  }
}

export const identityDetectionService = new IdentityDetectionService();
