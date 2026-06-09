import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';
import type { IStoryEntry } from '../../../models/brand/StoryBank';

const logger = pino();

export class StoryExtractionEngine {

  extract(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): IStoryEntry[] {
    const stories: IStoryEntry[] = [];
    const about = parsed.profile.about || '';

    const aboutStories = this.extractFromAbout(parsed, report);
    stories.push(...aboutStories);

    const experienceStories = this.extractFromExperience(parsed, report);
    stories.push(...experienceStories);

    const careerArcStories = this.extractCareerArcStories(parsed, report);
    stories.push(...careerArcStories);

    const journeyStories = this.extractJourneyStories(parsed, report);
    stories.push(...journeyStories);

    return stories
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 15);
  }

  private extractFromAbout(
    parsed: ParsedProfile,
    report: ExpandedIntelligenceReport
  ): IStoryEntry[] {
    const stories: IStoryEntry[] = [];
    const about = parsed.profile.about || '';
    if (!about || about.length < 50) return stories;

    const sentences = about.split(/[.!?]+/).filter(s => s.trim().length > 20);

    const storyPatterns: Array<{
      type: IStoryEntry['type'];
      keywords: RegExp;
      title: (match: string) => string;
    }> = [
      {
        type: 'challenge',
        keywords: /challenge|difficult|struggle|hardship|obstacle|setback|overcome/i,
        title: (m) => `Overcoming ${m.toLowerCase().split(' ').slice(0, 5).join(' ')}...`,
      },
      {
        type: 'lesson',
        keywords: /learned|lesson|taught|realized|discovered|insight/i,
        title: (m) => `The Lesson I Learned from ${m.toLowerCase().split(' ').slice(0, 5).join(' ')}`,
      },
      {
        type: 'milestone',
        keywords: /first|started|began|launched|founded|created|built|achieved|won|awarded|promoted|graduated/i,
        title: (m) => `My ${m.trim().split(' ').slice(0, 4).join(' ')} Milestone`,
      },
      {
        type: 'success',
        keywords: /success|achieved|accomplished|delivered|transformed|improved|increased|reduced/i,
        title: (m) => `How I ${m.trim().split(' ').slice(0, 5).join(' ')}`,
      },
    ];

    for (const sentence of sentences) {
      for (const pattern of storyPatterns) {
        if (pattern.keywords.test(sentence)) {
          const relevantPillars = this.matchPillars(sentence, parsed, report);
          stories.push({
            title: pattern.title(sentence),
            type: pattern.type,
            summary: sentence.trim(),
            tags: this.extractTags(sentence, parsed),
            emotions: this.extractEmotions(sentence),
            extractedFrom: 'linkedin_about',
            confidence: 0.6 + (sentence.length > 100 ? 0.2 : 0),
            applicablePillars: relevantPillars,
            contentIdeas: this.generateContentIdeas(sentence, pattern.type),
          });
          break;
        }
      }
    }

    return stories;
  }

  private extractFromExperience(
    parsed: ParsedProfile,
    report: ExpandedIntelligenceReport
  ): IStoryEntry[] {
    const stories: IStoryEntry[] = [];

    for (const exp of parsed.profile.experience || []) {
      if (exp.description && exp.description.length > 50) {
        const sentences = exp.description.split(/[.!?]+/).filter(s => s.trim().length > 30);

        for (const sentence of sentences.slice(0, 2)) {
          const relevantPillars = this.matchPillars(sentence, parsed, report);
          stories.push({
            title: `Building ${exp.title ? `as a ${exp.title}` : 'Experience'} at ${exp.company}`,
            type: 'success',
            summary: sentence.trim(),
            tags: [exp.company, exp.title || '', ...this.extractTags(sentence, parsed)].filter(Boolean),
            emotions: this.extractEmotions(sentence),
            extractedFrom: 'linkedin_experience',
            confidence: 0.5 + (sentence.length > 80 ? 0.2 : 0),
            applicablePillars: relevantPillars,
            contentIdeas: [
              `Deep dive: ${sentence.slice(0, 60)}...`,
              `What I learned working at ${exp.company}`,
            ],
          });
        }
      }

      if (!exp.currentlyWorking && exp.endDate) {
        const monthsAgo = this.monthsSince(exp.endDate);
        if (monthsAgo > 0 && monthsAgo < 24) {
          stories.push({
            title: `My Transition from ${exp.title || 'Role'} at ${exp.company}`,
            type: 'career_turn',
            summary: `Transitioning from ${exp.title || 'my role'} at ${exp.company}`,
            tags: [exp.company, exp.title || '', 'career transition'],
            emotions: ['reflective', 'growth'],
            extractedFrom: 'linkedin_experience',
            confidence: 0.5,
            applicablePillars: ['Career Growth & Learning'],
            contentIdeas: [
              `Why I left ${exp.company}`,
              `What ${exp.company} taught me about ${parsed.summary.industry || 'work'}`,
            ],
          });
        }
      }
    }

    return stories;
  }

  private extractCareerArcStories(
    parsed: ParsedProfile,
    report: ExpandedIntelligenceReport
  ): IStoryEntry[] {
    const stories: IStoryEntry[] = [];
    const progression = parsed.experience.careerProgression;

    if (progression.length >= 2) {
      const first = progression[progression.length - 1];
      const current = progression[0];

      stories.push({
        title: `From ${first.split('@')[0]?.trim() || 'Start'} to ${current.split('@')[0]?.trim() || 'Now'}`,
        type: 'career_turn',
        summary: `My career journey from ${first} to ${current}`,
        tags: ['career journey', 'growth', parsed.summary.industry || 'professional'].filter(Boolean),
        emotions: ['growth', 'pride', 'reflective'],
        extractedFrom: 'linkedin_about',
        confidence: 0.75,
        applicablePillars: ['Career Growth & Learning'],
        contentIdeas: [
          `My ${parsed.experience.totalRoles}-role journey across ${parsed.experience.uniqueCompanies} companies`,
          `The biggest lesson from each role in my career`,
        ],
      });
    }

    if (parsed.experience.hasGaps) {
      stories.push({
        title: 'Navigating a Career Gap',
        type: 'challenge',
        summary: `Taking ${parsed.experience.gapMonths} months to navigate a career transition`,
        tags: ['career gap', 'transition', 'growth'],
        emotions: ['challenging', 'growth'],
        extractedFrom: 'linkedin_about',
        confidence: 0.6,
        applicablePillars: ['Career Growth & Learning'],
        contentIdeas: [
          'What I did during my career gap',
          'How career gaps can be opportunities',
        ],
      });
    }

    return stories;
  }

  private extractJourneyStories(
    parsed: ParsedProfile,
    report: ExpandedIntelligenceReport
  ): IStoryEntry[] {
    const stories: IStoryEntry[] = [];

    if (parsed.summary.totalProjects > 0) {
      const projectTitles = parsed.profile.projects?.map(p => p.title).filter(Boolean) || [];
      for (const title of projectTitles.slice(0, 2)) {
        stories.push({
          title: `Building ${title}`,
          type: 'milestone',
          summary: `The journey of building ${title} from idea to completion`,
          tags: [title, 'project', 'building'],
          emotions: ['excited', 'proud', 'creative'],
          extractedFrom: 'linkedin_about',
          confidence: 0.65,
          applicablePillars: ['Project Showcase', 'Building In Public'],
          contentIdeas: [
            `How I built ${title}: architecture, challenges, and lessons`,
            `The tech stack behind ${title}`,
            `What ${title} taught me about building products`,
          ],
        });
      }
    }

    if (parsed.summary.totalCertifications > 0) {
      const certNames = parsed.profile.certifications?.map(c => c.name).filter(Boolean) || [];
      for (const name of certNames.slice(0, 2)) {
        stories.push({
          title: `Getting ${name} Certified`,
          type: 'milestone',
          summary: `The preparation journey and lessons from earning the ${name} certification`,
          tags: [name, 'certification', 'learning'],
          emotions: ['determined', 'accomplished'],
          extractedFrom: 'linkedin_about',
          confidence: 0.6,
          applicablePillars: ['Career Growth & Learning'],
          contentIdeas: [
            `How I prepared for the ${name} exam`,
            `Is the ${name} certification worth it?`,
            `What I learned getting ${name} certified`,
          ],
        });
      }
    }

    if (parsed.content.totalPosts > 5) {
      stories.push({
        title: 'Starting My Content Creation Journey',
        type: 'experiment',
        summary: `Starting to create content on LinkedIn — the experiment, the fears, and the growth`,
        tags: ['content creation', 'linkedin', 'building in public'],
        emotions: ['vulnerable', 'excited', 'growth'],
        extractedFrom: 'linkedin_post',
        confidence: 0.55,
        applicablePillars: ['Building In Public'],
        contentIdeas: [
          'Why I started creating content',
          `My top ${parsed.content.totalPosts} posts: what worked and what didn't`,
          'How content creation changed my career',
        ],
      });
    }

    return stories;
  }

  private matchPillars(text: string, parsed: ParsedProfile, report: ExpandedIntelligenceReport): string[] {
    const pillars: string[] = [];
    const lower = text.toLowerCase();

    if (/student|intern|learn|campus|college|university/i.test(lower)) pillars.push('Student Journey');
    if (/project|build|create|develop|architect/i.test(lower)) pillars.push('Project Showcase');
    if (/open.?source|public|share|content|write|blog/i.test(lower)) pillars.push('Building In Public');
    if (/founder|startup|venture|company|product/i.test(lower)) pillars.push('Startup Building');
    if (/career|growth|skill|learn|certify|promot/i.test(lower)) pillars.push('Career Growth & Learning');
    if (/ai|machine learning|data|tech/i.test(lower)) pillars.push('AI & Technology');

    const topSkills = parsed.skills.topSkills;
    for (const skill of topSkills.slice(0, 3)) {
      if (lower.includes(skill.toLowerCase())) {
        pillars.push(`${skill} Deep Dive`);
        break;
      }
    }

    return [...new Set(pillars)];
  }

  private extractTags(text: string, parsed: ParsedProfile): string[] {
    const tags: string[] = [];
    const lower = text.toLowerCase();

    const keywordTags = [
      'leadership', 'innovation', 'technology', 'growth', 'learning',
      'building', 'design', 'engineering', 'product', 'strategy',
    ];

    for (const kw of keywordTags) {
      if (lower.includes(kw)) tags.push(kw);
    }

    const skills = parsed.skills.topSkills.filter(s => lower.includes(s.toLowerCase()));
    tags.push(...skills);

    return [...new Set(tags)].slice(0, 8);
  }

  private extractEmotions(text: string): string[] {
    const emotions: string[] = [];
    const lower = text.toLowerCase();

    const emotionMap: Record<string, string[]> = {
      'excited': ['excited', 'thrilled', 'energized', 'enthusiastic'],
      'proud': ['proud', 'accomplished', 'achieved', 'honored'],
      'grateful': ['grateful', 'thankful', 'appreciate', 'blessed'],
      'challenged': ['challenging', 'difficult', 'struggle', 'hard'],
      'growth': ['growth', 'learned', 'developed', 'progress'],
      'vulnerable': ['vulnerable', 'fear', 'scared', 'anxious', 'imposter'],
      'inspired': ['inspired', 'motivated', 'inspiring', 'driven'],
      'curious': ['curious', 'fascinated', 'interested', 'exploring'],
    };

    for (const [emotion, keywords] of Object.entries(emotionMap)) {
      if (keywords.some(k => lower.includes(k))) {
        emotions.push(emotion);
      }
    }

    return [...new Set(emotions)].slice(0, 4);
  }

  private generateContentIdeas(text: string, type: IStoryEntry['type']): string[] {
    const ideas: string[] = [];
    const truncated = text.slice(0, 80);

    switch (type) {
      case 'challenge':
        ideas.push(`How I overcame ${truncated}...`);
        ideas.push(`The biggest challenge I faced and what it taught me`);
        break;
      case 'lesson':
        ideas.push(`3 lessons from ${truncated}...`);
        ideas.push(`What ${truncated} taught me about growth`);
        break;
      case 'success':
        ideas.push(`How I achieved ${truncated}...`);
        ideas.push(`The strategy behind ${truncated}...`);
        break;
      case 'milestone':
        ideas.push(`Celebrating ${truncated}...`);
        ideas.push(`My journey to ${truncated}...`);
        break;
      case 'experiment':
        ideas.push(`I tried ${truncated}... here's what happened`);
        ideas.push(`Experimenting with ${truncated}...`);
        break;
      case 'career_turn':
        ideas.push(`Why I made the move: ${truncated}...`);
        ideas.push(`From "${truncated}" to now: my career evolution`);
        break;
    }

    return ideas;
  }

  private monthsSince(date: { year: number; month?: number }): number {
    const now = new Date();
    const then = new Date(date.year, (date.month || 1) - 1);
    return (now.getFullYear() - then.getFullYear()) * 12 + now.getMonth() - then.getMonth();
  }
}

export const storyExtractionEngine = new StoryExtractionEngine();
