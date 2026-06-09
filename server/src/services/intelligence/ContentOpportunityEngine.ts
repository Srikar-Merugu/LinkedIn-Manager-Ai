import pino from 'pino';
import { ContentOpportunity, LinkedInUserProfile } from '../../types/linkedin';
import { ParsedProfile } from '../linkedin/ProfileParser';

const logger = pino();

const TOPIC_TEMPLATES = [
  { category: 'teach' as const, pattern: 'How to {skill}', weight: 1.0 },
  { category: 'teach' as const, pattern: '{skill} best practices for {audience}', weight: 0.9 },
  { category: 'teach' as const, pattern: 'Understanding {concept} in {domain}', weight: 0.85 },
  { category: 'document' as const, pattern: 'My journey with {skill}', weight: 0.8 },
  { category: 'document' as const, pattern: 'Building {project} from scratch', weight: 0.9 },
  { category: 'debate' as const, pattern: 'Why {trend} is overhyped', weight: 0.75 },
  { category: 'debate' as const, pattern: 'The case against {commonPractice}', weight: 0.7 },
  { category: 'debate' as const, pattern: '{tech1} vs {tech2}: A honest comparison', weight: 0.8 },
  { category: 'share_experience' as const, pattern: 'What I learned from {experience}', weight: 0.85 },
  { category: 'share_experience' as const, pattern: '{years} years of {role}: Lessons learned', weight: 0.9 },
  { category: 'share_experience' as const, pattern: 'How I {achievement} in {domain}', weight: 0.85 },
  { category: 'build_authority' as const, pattern: 'The complete guide to {topic}', weight: 0.95 },
  { category: 'build_authority' as const, pattern: '{topic} roadmap for {year}', weight: 0.9 },
  { category: 'build_authority' as const, pattern: 'Why {domain} needs {change}', weight: 0.8 },
];

export class ContentOpportunityEngine {
  generate(parsed: ParsedProfile, profile: LinkedInUserProfile): ContentOpportunity[] {
    const opportunities = new Map<string, ContentOpportunity>();
    const skills = parsed.skills.topSkills;
    const industries = parsed.experience.industries;
    const titles = parsed.profile.experience?.map(e => e.title) || [];
    const totalYears = parsed.summary.totalExperienceYears;
    const careerStage = parsed.summary.careerStage;

    const context = {
      skills,
      industries,
      titles,
      totalYears,
      careerStage,
      headline: profile.headline || '',
      about: profile.about || '',
    };

    for (const skill of skills) {
      this.addOpportunitiesForSkill(opportunities, skill, context, parsed);
    }

    for (const title of titles.slice(0, 3)) {
      this.addRoleBasedOpportunities(opportunities, title, context);
    }

    this.addIndustryOpportunities(opportunities, industries, context);

    if (profile.about) {
      this.addAboutBasedOpportunities(opportunities, profile.about, context);
    }

    const ranked = Array.from(opportunities.values())
      .map(opp => ({
        ...opp,
        impact: opp.impact || 0,
        authority: opp.authority || 0,
        engagementPotential: opp.engagementPotential || 0,
        careerAlignment: opp.careerAlignment || 0,
        overallScore: Math.round(
          (opp.impact || 0) * 0.3 +
          (opp.authority || 0) * 0.25 +
          (opp.engagementPotential || 0) * 0.25 +
          (opp.careerAlignment || 0) * 0.2
        ),
      }))
      .sort((a, b) => b.overallScore - a.overallScore);

    return ranked.slice(0, 50);
  }

  private addOpportunitiesForSkill(
    map: Map<string, ContentOpportunity>,
    skill: string,
    context: any,
    parsed: ParsedProfile
  ): void {
    const lower = skill.toLowerCase();
    const isTechnical = /^(typescript|javascript|python|react|aws|docker|kubernetes|node|api|cloud|ai|ml|data)/i.test(lower);
    const domain = isTechnical ? 'technology' : 'professional development';
    const totalYears = context.totalYears;
    const seniority = totalYears > 5 ? 'senior' : totalYears > 2 ? 'mid' : 'junior';

    const id = (name: string) => `skill-${name.toLowerCase().replace(/\s+/g, '-')}`;

    if (!map.has(id(`${skill}-teach-1`))) {
      map.set(id(`${skill}-teach-1`), {
        id: id(`${skill}-teach-1`),
        category: 'teach',
        topic: skill,
        title: `${skill} Best Practices for ${seniority}-level ${domain} professionals`,
        hook: `Stop making these ${skill} mistakes. Here's what I've learned...`,
        format: 'post',
        reasoning: `You have demonstrated proficiency in ${skill}, making you credible to teach others.`,
        impact: 75 + Math.round(Math.random() * 15),
        authority: 70 + Math.round(Math.random() * 20),
        engagementPotential: 65 + Math.round(Math.random() * 25),
        careerAlignment: 80 + Math.round(Math.random() * 15),
        overallScore: 0,
        effort: 'low',
      });
    }

    if (totalYears > 3 && !map.has(id(`${skill}-experience`))) {
      map.set(id(`${skill}-experience`), {
        id: id(`${skill}-experience`),
        category: 'share_experience',
        topic: skill,
        title: `${Math.round(totalYears)} years of working with ${skill}: What I wish I knew`,
        hook: `If I could go back ${Math.round(totalYears)} years and give myself one piece of advice about ${skill}...`,
        format: 'article',
        reasoning: `Your ${Math.round(totalYears)} years of experience with ${skill} provides valuable perspective.`,
        impact: 70 + Math.round(Math.random() * 20),
        authority: 75 + Math.round(Math.random() * 20),
        engagementPotential: 80 + Math.round(Math.random() * 15),
        careerAlignment: 70 + Math.round(Math.random() * 20),
        overallScore: 0,
        effort: 'medium',
      });
    }
  }

  private addRoleBasedOpportunities(
    map: Map<string, ContentOpportunity>,
    title: string,
    context: any
  ): void {
    const lower = title.toLowerCase();
    const role = lower.replace(/^(senior|lead|principal|staff|head of|vp of|director of)\s+/i, '');
    const isManager = /(manager|lead|head|director|vp|chief)/i.test(lower);
    const stage = context.careerStage;

    const id = (name: string) => `role-${name.toLowerCase().replace(/\s+/g, '-')}`;

    if (isManager && !map.has('role-leadership-lessons')) {
      map.set('role-leadership-lessons', {
        id: 'role-leadership-lessons',
        category: 'share_experience',
        topic: 'Engineering Leadership',
        title: `Lessons from transitioning from IC to ${role}`,
        hook: 'The hardest part of becoming a leader is unlearning being an IC.',
        format: 'thread',
        reasoning: 'Your leadership experience provides valuable content for aspiring managers.',
        impact: 85,
        authority: 80,
        engagementPotential: 90,
        careerAlignment: 85,
        overallScore: 0,
        effort: 'medium',
      });
    }

    if (stage === 'entry-level' || stage === 'mid-level') {
      if (!map.has('role-career-advice')) {
        map.set('role-career-advice', {
          id: 'role-career-advice',
          category: 'share_experience',
          topic: 'Career Growth',
          title: `How I progressed to ${title}: A career roadmap`,
          hook: 'Here is exactly what I did to level up my career in tech.',
          format: 'carousel',
          reasoning: 'Your career progression story is valuable content for others at earlier stages.',
          impact: 80,
          authority: 75,
          engagementPotential: 85,
          careerAlignment: 90,
          overallScore: 0,
          effort: 'medium',
        });
      }
    }
  }

  private addIndustryOpportunities(
    map: Map<string, ContentOpportunity>,
    industries: string[],
    context: any
  ): void {
    for (const industry of industries.slice(0, 2)) {
      if (!industry) continue;

      const idBase = `industry-${industry.toLowerCase().replace(/\s+/g, '-')}`;

      if (!map.has(`${idBase}-future`)) {
        map.set(`${idBase}-future`, {
          id: `${idBase}-future`,
          category: 'build_authority',
          topic: industry,
          title: `The future of ${industry}: Trends shaping ${new Date().getFullYear()}`,
          hook: `${industry} is changing faster than ever. Here's what every professional needs to know.`,
          format: 'article',
          reasoning: `Your experience in ${industry} positions you as a credible voice on industry trends.`,
          impact: 70 + Math.round(Math.random() * 20),
          authority: 65 + Math.round(Math.random() * 25),
          engagementPotential: 75 + Math.round(Math.random() * 20),
          careerAlignment: 80 + Math.round(Math.random() * 15),
          overallScore: 0,
          effort: 'high',
        });
      }
    }
  }

  private addAboutBasedOpportunities(
    map: Map<string, ContentOpportunity>,
    about: string,
    context: any
  ): void {
    const lower = about.toLowerCase();

    const topicMatches = [
      { keyword: 'mentor', topic: 'Mentorship', title: 'Why I mentor and why you should too' },
      { keyword: 'startup', topic: 'Startups', title: 'Building startups: lessons from the trenches' },
      { keyword: 'open source', topic: 'Open Source', title: 'How contributing to open source transformed my career' },
      { keyword: 'diversity', topic: 'Diversity in Tech', title: 'Building more inclusive engineering teams' },
      { keyword: 'remote', topic: 'Remote Work', title: 'Remote work: best practices from years of distributed work' },
      { keyword: 'writing', topic: 'Technical Writing', title: 'How writing made me a better engineer' },
      { keyword: 'speaking', topic: 'Public Speaking', title: 'From terrified to TEDx: my public speaking journey' },
    ];

    for (const match of topicMatches) {
      if (lower.includes(match.keyword)) {
        const id = `about-${match.keyword}`;
        if (!map.has(id)) {
          map.set(id, {
            id,
            category: 'share_experience',
            topic: match.topic,
            title: match.title,
            hook: `This is why ${match.topic.toLowerCase()} matters more than you think.`,
            format: 'post',
            reasoning: `Your about section mentions ${match.topic}, indicating this is a topic you care about.`,
            impact: 70 + Math.round(Math.random() * 20),
            authority: 65 + Math.round(Math.random() * 25),
            engagementPotential: 75 + Math.round(Math.random() * 20),
            careerAlignment: 70 + Math.round(Math.random() * 20),
            overallScore: 0,
            effort: 'low',
          });
        }
      }
    }
  }
}

export const contentOpportunityEngine = new ContentOpportunityEngine();
