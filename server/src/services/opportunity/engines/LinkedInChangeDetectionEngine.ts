import pino from 'pino';

const logger = pino();

interface LinkedInProfileSnapshot {
  headline?: string;
  position?: string;
  company?: string;
  skills?: string[];
  certifications?: string[];
  featured?: string[];
  activity?: Array<{ type: string; content: string; date: string }>;
}

interface LinkedInChange {
  type: 'headline' | 'position' | 'skill' | 'certification' | 'featured' | 'activity';
  previousValue?: string;
  newValue: string;
  significance: 'high' | 'medium' | 'low';
  suggestedOpportunity: string;
  suggestedHook: string;
}

export class LinkedInChangeDetectionEngine {
  detectChanges(current: LinkedInProfileSnapshot, previous?: LinkedInProfileSnapshot): LinkedInChange[] {
    logger.info('Detecting LinkedIn profile changes');
    const changes: LinkedInChange[] = [];

    if (previous?.headline && current.headline && current.headline !== previous.headline) {
      changes.push({
        type: 'headline', previousValue: previous.headline, newValue: current.headline, significance: 'medium',
        suggestedOpportunity: `Share why you updated your headline to "${current.headline}" and what it says about your current focus`,
        suggestedHook: `I updated my LinkedIn headline. Here's the strategy behind it.`,
      });
    }

    if (current.position && (!previous?.position || current.position !== previous.position)) {
      changes.push({
        type: 'position', previousValue: previous?.position, newValue: current.position, significance: 'high',
        suggestedOpportunity: `Share your new role at ${current.company || current.position} and what excites you about it`,
        suggestedHook: `Excited to share that I'm starting a new chapter as ${current.position}${current.company ? ` at ${current.company}` : ''}!`,
      });
    }

    if (current.skills?.length && (!previous?.skills?.length || current.skills.length > previous.skills.length)) {
      const newSkills = previous?.skills ? current.skills.filter(s => !previous.skills?.includes(s)) : current.skills;
      if (newSkills.length > 0) {
        changes.push({
          type: 'skill', newValue: newSkills.join(', '), significance: 'medium',
          suggestedOpportunity: `Share what you learned acquiring ${newSkills[0]} and how it's changing your work`,
          suggestedHook: `I added ${newSkills[0]} to my profile. Here's why I invested in this skill.`,
        });
      }
    }

    if (current.certifications?.length && (!previous?.certifications?.length || current.certifications.length > previous.certifications.length)) {
      const newCerts = previous?.certifications ? current.certifications.filter(c => !previous.certifications?.includes(c)) : current.certifications;
      if (newCerts.length > 0) {
        changes.push({
          type: 'certification', newValue: newCerts[0], significance: 'high',
          suggestedOpportunity: `Share your certification journey and what it means for your expertise`,
          suggestedHook: `Just earned my ${newCerts[0]} certification! Here's what it took.`,
        });
      }
    }

    return changes;
  }

  detectActivitySignals(activities: LinkedInProfileSnapshot['activity']): LinkedInChange[] {
    const changes: LinkedInChange[] = [];
    if (!activities?.length) return changes;

    for (const activity of activities) {
      if (activity.type === 'milestone' || activity.type === 'work_anniversary') {
        changes.push({
          type: 'activity', newValue: activity.content, significance: 'high',
          suggestedOpportunity: `Share reflections on your journey and what you've learned`,
          suggestedHook: activity.content.length > 50 ? activity.content.slice(0, 50) + '...' : activity.content,
        });
      }
    }

    return changes;
  }
}

export const linkedInChangeDetectionEngine = new LinkedInChangeDetectionEngine();
