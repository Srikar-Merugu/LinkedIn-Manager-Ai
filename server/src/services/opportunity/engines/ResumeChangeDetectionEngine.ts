import pino from 'pino';

const logger = pino();

interface ResumeData {
  role?: string;
  company?: string;
  skills?: string[];
  projects?: Array<{ name: string; description: string }>;
  achievements?: string[];
  education?: string;
  certifications?: string[];
}

interface ResumeChange {
  type: 'role_change' | 'skills_added' | 'project_added' | 'achievement_added' | 'education_update' | 'certification_added';
  label: string;
  description: string;
  significance: 'high' | 'medium' | 'low';
  suggestedHook: string;
  suggestedAngle: string;
}

export class ResumeChangeDetectionEngine {
  detectChanges(current: ResumeData, previous?: ResumeData): ResumeChange[] {
    logger.info('Detecting resume changes');
    const changes: ResumeChange[] = [];

    if (current.role && (!previous?.role || current.role !== previous.role)) {
      changes.push({
        type: 'role_change', label: `New role: ${current.role}`, description: `Updated resume with new role${current.company ? ` at ${current.company}` : ''}`, significance: 'high',
        suggestedHook: `I updated my resume with a new role. Here's what my career journey looks like now.`,
        suggestedAngle: 'Share your career progression and the skills that made the transition possible.',
      });
    }

    if (current.skills?.length && (!previous?.skills?.length || current.skills.length > previous.skills.length)) {
      const newSkills = previous?.skills ? current.skills.filter(s => !previous.skills?.includes(s)) : current.skills;
      if (newSkills.length > 0) {
        changes.push({
          type: 'skills_added', label: `${newSkills.length} new skills added to resume`, description: `Added: ${newSkills.join(', ')}`, significance: 'medium',
          suggestedHook: `I added ${newSkills[0]} to my resume. Here's why I invested in this skill and how it's changing my work.`,
          suggestedAngle: 'Share your learning journey and how new skills complement your existing expertise.',
        });
      }
    }

    if (current.projects?.length) {
      const newProjects = previous?.projects
        ? current.projects.filter(p => !previous.projects?.find(pp => pp.name === p.name))
        : current.projects;

      for (const proj of newProjects.slice(0, 3)) {
        changes.push({
          type: 'project_added', label: `Project: ${proj.name}`, description: proj.description, significance: 'high',
          suggestedHook: `I added ${proj.name} to my portfolio. Here's why this project matters.`,
          suggestedAngle: 'Share the project story — the problem, the build process, and the results.',
        });
      }
    }

    if (current.achievements?.length) {
      const newAchievements = previous?.achievements
        ? current.achievements.filter(a => !previous.achievements?.includes(a))
        : current.achievements;

      for (const achievement of newAchievements.slice(0, 3)) {
        changes.push({
          type: 'achievement_added', label: `Achievement: ${achievement}`, description: achievement, significance: 'high',
          suggestedHook: `Proud to share this achievement: ${achievement}. Here's the story behind it.`,
          suggestedAngle: 'Share what it took to achieve this milestone and what it means for your career.',
        });
      }
    }

    if (current.certifications?.length && (!previous?.certifications?.length)) {
      for (const cert of current.certifications) {
        changes.push({
          type: 'certification_added', label: `Certification: ${cert}`, description: `Added ${cert} certification to resume`, significance: 'high',
          suggestedHook: `I earned my ${cert} certification. Here's why I pursued it and what I learned.`,
          suggestedAngle: 'Share your certification journey and how it builds your professional authority.',
        });
      }
    }

    return changes;
  }
}

export const resumeChangeDetectionEngine = new ResumeChangeDetectionEngine();
