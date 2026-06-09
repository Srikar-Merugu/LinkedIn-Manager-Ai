import pino from 'pino';
import type { ITopicNode } from '../../../models/content-pillars/TopicCluster';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string }>;
  projects?: Array<{ title: string }>;
  experience?: Array<{ title: string }>;
}

export class TopicClusterEngine {

  generate(pillarName: string, pillarDescription: string, profile: ProfileInput): {
    nodes: ITopicNode[];
    totalTopics: number;
    summary: {
      beginnerCount: number;
      intermediateCount: number;
      advancedCount: number;
      topKeywords: string[];
      breadthScore: number;
      depthScore: number;
    };
  } {
    const clusterMap = this.getClusterMap(pillarName);
    const nodes: ITopicNode[] = [];
    let order = 0;

    const addNode = (name: string, level: number) => {
      order++;
      nodes.push({
        name,
        level,
        order,
        description: `${name} — subtopic within ${pillarName}`,
        difficulty: level <= 1 ? 'beginner' as const : level === 2 ? 'intermediate' as const : 'advanced' as const,
        relevanceScore: this.calculateRelevance(name, profile),
        keywords: [name.toLowerCase(), `${pillarName.toLowerCase()} ${name.toLowerCase()}`],
        contentIdeas: this.generateContentIdeas(name, pillarName, level),
      });
    };

    addNode(pillarName, 0);

    const topics: string[] = (clusterMap[0] as string[]) || this.generateGenericTopics(pillarName);
    for (const topic of topics) {
      addNode(topic, 1);
      const subtopicsData = clusterMap[1] as Record<string, string[]> | undefined;
      const subtopics: string[] = subtopicsData?.[topic] || this.generateSubtopicIdeas(topic, pillarName);
      for (const sub of subtopics) {
        addNode(sub, 2);
      }
    }

    const summary = this.computeSummary(nodes);
    logger.info({ pillar: pillarName, totalNodes: nodes.length }, 'Topic cluster generated');

    return {
      nodes,
      totalTopics: nodes.length,
      summary,
    };
  }

  private getClusterMap(pillar: string): Record<number, string[] | Record<string, string[]>> {
    const key = pillar.toLowerCase();

    if (key.includes('ai') || key.includes('artificial intelligence')) {
      return {
        0: ['Prompt Engineering', 'RAG Systems', 'AI Agents', 'Model Deployment', 'AI Product Building', 'Open Source Models', 'Fine-tuning', 'AI Ethics', 'Vector Databases', 'LLM Architecture'],
        1: {
          'Prompt Engineering': ['Chain-of-thought', 'Few-shot learning', 'System prompts', 'Prompt chaining', 'Template design'],
          'RAG Systems': ['Document chunking', 'Embedding strategies', 'Retrieval pipelines', 'Context windows', 'Hybrid search'],
          'AI Agents': ['Tool use', 'Agent orchestration', 'Memory systems', 'Planning loops', 'Multi-agent systems'],
          'Model Deployment': ['Model serving', 'Inference optimization', 'Quantization', 'A/B testing', 'Monitoring'],
          'AI Product Building': ['UX for AI', 'Feedback loops', 'Human in the loop', 'Product metrics', 'Iteration cycles'],
        },
      };
    }

    if (key.includes('full stack') || key.includes('development')) {
      return {
        0: ['React/Next.js', 'Node.js Backend', 'Database Design', 'API Architecture', 'Testing Strategy', 'DevOps Basics', 'Performance Optimization', 'Security Best Practices', 'State Management', 'Deployment Strategies'],
        1: {
          'React/Next.js': ['Server components', 'Client components', 'Data fetching', 'Routing patterns', 'Performance optimization'],
          'Node.js Backend': ['Express patterns', 'Middleware design', 'Error handling', 'Rate limiting', 'WebSocket integration'],
          'Database Design': ['Schema design', 'Query optimization', 'Indexing strategies', 'Migrations', 'Data modeling'],
          'Testing Strategy': ['Unit tests', 'Integration tests', 'E2E tests', 'Mock patterns', 'Test coverage'],
          'Performance Optimization': ['Lazy loading', 'Caching strategies', 'Bundle optimization', 'CDN configuration', 'Core Web Vitals'],
        },
      };
    }

    if (key.includes('career') || key.includes('job')) {
      return {
        0: ['Resume Optimization', 'Interview Preparation', 'Portfolio Building', 'Networking Strategy', 'Salary Negotiation', 'Personal Branding', 'Job Search Strategy', 'Skill Development', 'Career Transitions', 'Workplace Growth'],
        1: {
          'Resume Optimization': ['ATS keywords', 'Impact metrics', 'Formatting', 'Tailoring', 'Achievement bullets'],
          'Interview Preparation': ['Behavioral questions', 'Technical interviews', 'System design', 'Mock interviews', 'Follow-up strategy'],
          'Portfolio Building': ['Project selection', 'Case study format', 'Code quality', 'Documentation', 'Deployment'],
          'Networking Strategy': ['LinkedIn optimization', 'Outreach templates', 'Community engagement', 'Event strategy', 'Mentorship'],
          'Personal Branding': ['Content pillars', 'Content calendar', 'Voice development', 'Authority building', 'Audience growth'],
        },
      };
    }

    return {};
  }

  private generateGenericTopics(pillar: string): string[] {
    return [
      `${pillar} Fundamentals`,
      `${pillar} Best Practices`,
      `${pillar} Tools & Resources`,
      `${pillar} Case Studies`,
      `${pillar} Trends & Future`,
      `${pillar} Mistakes & Lessons`,
      `${pillar} for Beginners`,
      `Advanced ${pillar}`,
    ];
  }

  private generateSubtopicIdeas(topic: string, pillar: string): string[] {
    return [
      `${topic} essentials`,
      `${topic} deep dive`,
      `${topic} tips and tricks`,
      `${topic} common mistakes`,
      `${topic} tools and resources`,
    ];
  }

  private calculateRelevance(topic: string, profile: ProfileInput): number {
    const text = [
      ...(profile.skills || []).map(s => s.name),
      ...(profile.projects || []).map(p => p.title),
      ...(profile.experience || []).map(e => e.title),
    ].join(' ').toLowerCase();

    const topicLower = topic.toLowerCase();
    if (text.includes(topicLower)) return 80 + Math.floor(Math.random() * 20);
    const words = topicLower.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && text.includes(word)) return 50 + Math.floor(Math.random() * 30);
    }
    return 30 + Math.floor(Math.random() * 30);
  }

  private generateContentIdeas(topic: string, pillar: string, level: number): string[] {
    return [
      `Understanding ${topic}`,
      `${topic}: A practical guide`,
      `What I learned about ${topic}`,
      `${topic} mistakes to avoid`,
      `${topic} for ${level === 0 ? 'beginners' : 'advanced practitioners'}`,
    ];
  }

  private computeSummary(nodes: ITopicNode[]): { beginnerCount: number; intermediateCount: number; advancedCount: number; topKeywords: string[]; breadthScore: number; depthScore: number } {
    const beginnerCount = nodes.filter(n => n.difficulty === 'beginner').length;
    const intermediateCount = nodes.filter(n => n.difficulty === 'intermediate').length;
    const advancedCount = nodes.filter(n => n.difficulty === 'advanced').length;
    const topKeywords = [...new Set(nodes.flatMap(n => n.keywords))].slice(0, 10);
    const breadthScore = Math.min(100, Math.round((nodes.length / 50) * 100));
    const depthScore = Math.min(100, Math.round((advancedCount / Math.max(nodes.length, 1)) * 100));

    return { beginnerCount, intermediateCount, advancedCount, topKeywords, breadthScore, depthScore };
  }
}

export const topicClusterEngine = new TopicClusterEngine();
