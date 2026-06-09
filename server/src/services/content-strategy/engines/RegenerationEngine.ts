import pino from 'pino';

const logger = pino();

interface RegenerationTrigger {
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  changes: string[];
}

interface RegenerationDecision {
  shouldRegenerate: boolean;
  priority: 'high' | 'medium' | 'low';
  triggers: RegenerationTrigger[];
  changes: string[];
  reasoning: string;
}

export class RegenerationEngine {
  evaluate(changedSignals: Partial<{
    careerGoalChanged: boolean;
    newProjectAdded: boolean;
    newCertificationAdded: boolean;
    analyticsChanged: boolean;
    brandDNAUpdated: boolean;
    linkedInUpdated: boolean;
    writingDNAUpdated: boolean;
    contentPillarChanged: boolean;
    currentVersion: number;
    weeksSinceLastGeneration: number;
  }>): RegenerationDecision {
    logger.info({ signals: changedSignals }, 'Evaluating strategy regeneration need');
    const triggers: RegenerationTrigger[] = [];
    const changes: string[] = [];

    if (changedSignals.careerGoalChanged) {
      triggers.push({
        type: 'career_goal_change',
        description: 'Career goal or target role has been updated',
        priority: 'high',
        changes: ['Recalculate career alignment scores', 'Rebuild opportunity mapping', 'Update monthly phase objectives'],
      });
    }

    if (changedSignals.newProjectAdded) {
      triggers.push({
        type: 'new_project',
        description: 'New project has been added to profile',
        priority: 'high',
        changes: ['Integrate project into Month 1 positioning content', 'Add project to authority building case studies', 'Update content ideas with new project context'],
      });
    }

    if (changedSignals.newCertificationAdded) {
      triggers.push({
        type: 'new_certification',
        description: 'New certification has been added',
        priority: 'medium',
        changes: ['Add certification to authority building topics', 'Create content around certification learnings', 'Update skill inventory for content mix'],
      });
    }

    if (changedSignals.analyticsChanged) {
      triggers.push({
        type: 'analytics_change',
        description: 'Content performance analytics have been updated',
        priority: 'medium',
        changes: ['Adjust content mix based on top-performing formats', 'Refine weekly themes based on engagement data', 'Update frequency recommendation if needed'],
      });
    }

    if (changedSignals.brandDNAUpdated) {
      triggers.push({
        type: 'brand_dna_update',
        description: 'Brand DNA has been updated',
        priority: 'high',
        changes: ['Realign narrative arc with updated brand positioning', 'Update authority topics based on new brand focus', 'Regenerate content mix for brand consistency'],
      });
    }

    if (changedSignals.linkedInUpdated) {
      triggers.push({
        type: 'linkedin_update',
        description: 'LinkedIn profile has been updated',
        priority: 'medium',
        changes: ['Update networking targets based on new connections', 'Refresh industry analysis with new profile data', 'Adjust audience goals based on profile changes'],
      });
    }

    if (changedSignals.writingDNAUpdated) {
      triggers.push({
        type: 'writing_dna_update',
        description: 'Writing DNA has been updated with new samples',
        priority: 'low',
        changes: ['Refine content tone recommendations', 'Update post type distribution based on voice confidence'],
      });
    }

    if (changedSignals.contentPillarChanged) {
      triggers.push({
        type: 'content_pillar_change',
        description: 'Content pillars have been updated',
        priority: 'high',
        changes: ['Rebalance content mix across new pillars', 'Update authority roadmap with new pillar topics', 'Regenerate weekly themes referencing new pillars'],
      });
    }

    const weeksSinceLastGen = changedSignals.weeksSinceLastGeneration || 99;
    if (weeksSinceLastGen >= 4) {
      triggers.push({
        type: 'time_based',
        description: `Strategy was generated ${weeksSinceLastGen} weeks ago`,
        priority: 'medium',
        changes: ['Refresh content ideas for next monthly phase', 'Update competitive analysis', 'Regenerate opportunity forecast'],
      });
    }

    const highPriorityCount = triggers.filter(t => t.priority === 'high').length;
    const mediumPriorityCount = triggers.filter(t => t.priority === 'medium').length;

    const shouldRegenerate = highPriorityCount > 0 || mediumPriorityCount >= 2 || triggers.length >= 3;
    const priority: 'high' | 'medium' | 'low' = highPriorityCount > 0 ? 'high' : mediumPriorityCount >= 2 ? 'medium' : 'low';

    for (const t of triggers) {
      changes.push(...t.changes);
    }

    const reasoning = shouldRegenerate
      ? `Regeneration triggered by ${triggers.length} signal(s): ${triggers.map(t => t.type).join(', ')}. ${highPriorityCount} high-priority, ${mediumPriorityCount} medium-priority signals detected.`
      : `No regeneration needed. ${triggers.length} signal(s) detected but none require immediate strategy update.`;

    return { shouldRegenerate, priority, triggers, changes: [...new Set(changes)], reasoning };
  }
}

export const regenerationEngine = new RegenerationEngine();
