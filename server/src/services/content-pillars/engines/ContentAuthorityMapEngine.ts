import pino from 'pino';
import type { IAuthorityMap } from '../../../models/content-pillars/AuthorityMap';

const logger = pino();

export class ContentAuthorityMapEngine {

  generate(
    pillarScores: Array<{
      name: string;
      authorityScore: number;
      engagementScore: number;
    }>,
    topicClusters: Array<{ pillarName: string; nodes: Array<{ name: string; relevanceScore: number }> }>
  ): Pick<IAuthorityMap, 'areas' | 'summary' | 'visualMap' | 'recommendations'> {
    const areas: IAuthorityMap['areas'] = [];

    for (const ps of pillarScores) {
      const cluster = topicClusters.find(tc => tc.pillarName === ps.name);
      const topicNames = cluster?.nodes?.map(n => n.name) || [];

      const status = ps.authorityScore >= 70 ? 'strong' as const :
                     ps.authorityScore >= 45 ? 'growing' as const :
                     ps.authorityScore >= 20 ? 'weak' as const : 'future' as const;

      for (const topic of topicNames.slice(0, 5)) {
        areas.push({
          topic,
          status,
          currentScore: ps.authorityScore,
          targetScore: Math.min(100, ps.authorityScore + 20),
          pillar: ps.name,
          trends: this.getTrends(topic),
          opportunities: this.getOpportunities(topic, status),
          competingVoices: [],
          uniqueAngle: this.getUniqueAngle(topic, ps.name),
        });
      }
    }

    const strong = areas.filter(a => a.status === 'strong').length;
    const growing = areas.filter(a => a.status === 'growing').length;
    const weak = areas.filter(a => a.status === 'weak').length;
    const future = areas.filter(a => a.status === 'future').length;
    const scores = areas.map(a => a.currentScore);

    const visualMap: IAuthorityMap['visualMap'] = {
      concentric: [
        { ring: 1, label: 'Strong Authority', topics: areas.filter(a => a.status === 'strong').slice(0, 5).map(a => a.topic) },
        { ring: 2, label: 'Growing Authority', topics: areas.filter(a => a.status === 'growing').slice(0, 8).map(a => a.topic) },
        { ring: 3, label: 'Developing Authority', topics: areas.filter(a => a.status === 'weak').slice(0, 8).map(a => a.topic) },
        { ring: 4, label: 'Future Opportunities', topics: areas.filter(a => a.status === 'future').slice(0, 5).map(a => a.topic) },
      ],
    };

    const recommendations = [
      strong > 0 ? `Leverage your ${strong} strong areas for high-impact thought leadership content` : 'Focus on building authority in at least one core pillar',
      growing > 0 ? `Nurture your ${growing} growing areas with consistent weekly content` : 'Identify growing topics to expand your authority footprint',
      `Consider exploring underserved angles in ${areas.filter(a => a.status === 'weak').slice(0, 2).map(a => a.topic).join(', ')}`,
    ];

    logger.info({ totalAreas: areas.length, strong, growing, weak, future }, 'Authority map generated');

    return {
      areas,
      summary: {
        strongAreas: strong,
        growingAreas: growing,
        weakAreas: weak,
        futureAreas: future,
        totalAreas: areas.length,
        highestScore: Math.max(...scores, 0),
        lowestScore: Math.min(...scores, 0),
        averageScore: Math.round(scores.reduce((s, a) => s + a, 0) / Math.max(scores.length, 1)),
      },
      visualMap,
      recommendations,
    };
  }

  private getTrends(topic: string): string[] {
    return [
      `Growing interest in ${topic}`,
      `Increasing content supply — need differentiation`,
    ];
  }

  private getOpportunities(topic: string, status: string): string[] {
    if (status === 'weak' || status === 'future') {
      return [`First-mover opportunity in ${topic}`, `Low competition — build authority now`];
    }
    if (status === 'growing') {
      return [`Differentiate in ${topic} with unique perspective`, `Target underserved subtopics`];
    }
    return [`Lead conversations in ${topic}`, `Create definitive guides on ${topic}`];
  }

  private getUniqueAngle(topic: string, pillar: string): string {
    return `Your unique perspective combining ${pillar} experience with ${topic} expertise`;
  }
}

export const contentAuthorityMapEngine = new ContentAuthorityMapEngine();
