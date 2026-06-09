import pino from 'pino';

const logger = pino();

export interface EvolutionResult {
  version: number;
  changes: Array<{
    pillarName: string;
    from: string;
    to: string;
    reason: string;
  }>;
  allPillars: Array<{
    name: string;
    stage: 'emerging' | 'active' | 'maturing' | 'transitioning';
    estimatedDuration: string;
    nextEvolution: string;
  }>;
  recommendations: string[];
}

interface PreviousSnapshot {
  pillars: Array<{ name: string }>;
  generatedAt?: Date;
}

export class PillarEvolutionEngine {

  analyze(
    currentPillars: Array<{ name: string; description: string; category: string; confidence: number }>,
    previousSnapshots: PreviousSnapshot[]
  ): EvolutionResult {
    const version = previousSnapshots.length + 1;
    const lastSnapshot = previousSnapshots[previousSnapshots.length - 1];
    const changes: EvolutionResult['changes'] = [];

    if (lastSnapshot) {
      const previousNames = new Set(lastSnapshot.pillars.map(p => p.name.toLowerCase()));
      const currentNames = new Set(currentPillars.map(p => p.name.toLowerCase()));

      for (const p of currentPillars) {
        if (!previousNames.has(p.name.toLowerCase())) {
          changes.push({
            pillarName: p.name,
            from: '(new)',
            to: p.name,
            reason: this.generateEmergenceReason(p),
          });
        }
      }

      for (const prev of lastSnapshot.pillars) {
        if (!currentNames.has(prev.name.toLowerCase())) {
          changes.push({
            pillarName: prev.name,
            from: prev.name,
            to: '(archived)',
            reason: 'No longer aligns with current career trajectory',
          });
        }
      }
    }

    const allPillars = currentPillars.map(p => {
      const stage = this.determineStage(p, currentPillars);
      return {
        name: p.name,
        stage,
        estimatedDuration: this.estimateDuration(stage),
        nextEvolution: this.predictEvolution(p),
      };
    });

    const recommendations = this.generateRecommendations(currentPillars, changes, version);

    logger.info({ version, changes: changes.length, totalPillars: allPillars.length }, 'Pillar evolution analyzed');

    return { version, changes, allPillars, recommendations };
  }

  private generateEmergenceReason(pillar: { name: string; description: string; category: string }): string {
    if (pillar.category === 'core') return `New core pillar emerged from strengthening expertise in ${pillar.name}`;
    if (pillar.category === 'growth') return `Growth opportunity identified in ${pillar.name}`;
    return `Experimental pillar: ${pillar.name}`;
  }

  private determineStage(pillar: { name: string; confidence: number }, allPillars: Array<{ name: string }>): 'emerging' | 'active' | 'maturing' | 'transitioning' {
    if (pillar.confidence < 0.3) return 'emerging';
    if (pillar.confidence < 0.6) return 'active';
    if (pillar.confidence >= 0.6) return 'maturing';
    const index = allPillars.findIndex(p => p.name === pillar.name);
    if (index >= allPillars.length - 2 && pillar.confidence < 0.4) return 'transitioning';
    return 'active';
  }

  private estimateDuration(stage: string): string {
    if (stage === 'emerging') return '3-6 months';
    if (stage === 'active') return '6-12 months';
    if (stage === 'maturing') return '12-18 months';
    return 'Variable';
  }

  private predictEvolution(pillar: { name: string }): string {
    const name = pillar.name.toLowerCase();
    if (name.includes('internship')) return 'Career Growth & Development';
    if (name.includes('junior') || name.includes('entry')) return 'Senior-level Technical Leadership';
    if (name.includes('ai') || name.includes('machine learning')) return 'AI Strategy & Architecture';
    if (name.includes('startup')) return 'Startup Leadership & Scaling';
    if (name.includes('full stack')) return 'Architecture & Technical Strategy';
    if (name.includes('career')) return 'Thought Leadership & Industry Impact';
    return `${pillar.name} — Advanced & Strategic`;
  }

  private generateRecommendations(currentPillars: Array<{ name: string; category: string }>, changes: EvolutionResult['changes'], version: number): string[] {
    const recs: string[] = [];
    if (changes.filter(c => c.to !== '(archived)').length > 0) {
      recs.push('New pillars detected — review and integrate into content calendar');
    }
    const archiving = changes.filter(c => c.to === '(archived)');
    if (archiving.length > 0) {
      recs.push(`Consider archiving content from: ${archiving.map(c => c.from).join(', ')}`);
    }
    recs.push(`Version ${version} — track evolution over time for strategic insights`);
    return recs;
  }
}

export const pillarEvolutionEngine = new PillarEvolutionEngine();
