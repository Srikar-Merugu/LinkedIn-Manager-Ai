import pino from 'pino';
import type { IAuthorityMap } from '../../../models/career/AuthorityMap';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string; endorsements?: number }>;
  experience?: Array<{ title: string; description?: string }>;
  projects?: Array<{ title: string; description?: string }>;
  about?: string;
  headline?: string;
  certifications?: Array<{ name: string }>;
  currentRole?: string;
  targetRole?: string;
}

const TOPIC_AUTHORITY_MAP: Record<string, {
  own: string[];
  adjacent: string[];
  avoid: string[];
}> = {
  'software_engineering': {
    own: ['system_design', 'architecture', 'backend_development', 'api_design', 'performance_optimization'],
    adjacent: ['devops', 'cloud_infrastructure', 'testing_strategy', 'code_quality', 'technical_leadership'],
    avoid: ['frontend_trends', 'specific_library_hot_takes', 'framework_wars'],
  },
  'frontend': {
    own: ['web_performance', 'ux_engineering', 'accessibility', 'component_design', 'frontend_architecture'],
    adjacent: ['design_systems', 'full_stack', 'mobile_web', 'progressive_web_apps', 'build_tools'],
    avoid: ['css_framework_preferences', 'opinionated_ui_library_comparisons'],
  },
  'data_science': {
    own: ['ml_ops', 'feature_engineering', 'model_deployment', 'data_pipelines', 'statistical_methods'],
    adjacent: ['deep_learning', 'nlp', 'computer_vision', 'data_engineering', 'analytics_engineering'],
    avoid: ['automl_hype', 'ai_takeover_narratives'],
  },
  'product': {
    own: ['product_strategy', 'user_research', 'roadmapping', 'metric_driven_development', 'product_market_fit'],
    adjacent: ['design_thinking', 'growth_hacking', 'agile_methodologies', 'stakeholder_management', 'competitive_analysis'],
    avoid: ['implementation_details', 'technology_specific_debates'],
  },
  'design': {
    own: ['design_systems', 'user_research', 'interaction_design', 'accessibility', 'design_thinking'],
    adjacent: ['brand_identity', 'motion_design', 'prototyping', 'ux_strategy', 'visual_hierarchy'],
    avoid: ['tool_comparisons', 'trend_chasing'],
  },
  'devops': {
    own: ['infrastructure_as_code', 'ci_cd', 'container_orchestration', 'monitoring_observability', 'cloud_architecture'],
    adjacent: ['security', 'sre', 'platform_engineering', 'network_architecture', 'cost_optimization'],
    avoid: ['specific_tool_battles', 'language_arguments'],
  },
  'leadership': {
    own: ['team_building', 'engineering_culture', 'technical_strategy', 'mentorship_frameworks', 'organizational_design'],
    adjacent: ['agile_transformation', 'incident_management', 'hiring_processes', 'career_development', 'communication'],
    avoid: ['micro_management_tips', 'company_policy_coverage'],
  },
};

export class AuthorityBuildingEngine {

  analyze(profile: ProfileInput): Pick<IAuthorityMap, 'topics' | 'summary' | 'authorityRoadmap' | 'recommendations'> {
    const domain = this.detectDomain(profile);
    const topicMap = TOPIC_AUTHORITY_MAP[domain] || TOPIC_AUTHORITY_MAP['software_engineering'];

    const currentSkills = new Set((profile.skills || []).map(s => s.name.toLowerCase().replace(/\s+/g, '_')));

    const ownTopics = topicMap.own.map(topic => ({
      topic: this.displayTopic(topic),
      category: 'own' as const,
      priority: this.calculatePriority(topic, currentSkills, 'own'),
      currentAuthority: Math.min(80, this.estimateCurrentAuthority(topic, currentSkills)),
      targetAuthority: 85,
      contentIdeas: this.generateContentIdeas(topic),
      keywords: this.generateKeywords(topic),
      competingVoices: [],
    }));

    const adjacentTopics = topicMap.adjacent.map(topic => ({
      topic: this.displayTopic(topic),
      category: 'adjacent' as const,
      priority: this.calculatePriority(topic, currentSkills, 'adjacent'),
      currentAuthority: Math.min(50, this.estimateCurrentAuthority(topic, currentSkills)),
      targetAuthority: 65,
      contentIdeas: this.generateContentIdeas(topic),
      keywords: this.generateKeywords(topic),
      competingVoices: [],
    }));

    const avoidTopics = topicMap.avoid.map(topic => ({
      topic: this.displayTopic(topic),
      category: 'avoid' as const,
      priority: 0,
      currentAuthority: 0,
      targetAuthority: 0,
      contentIdeas: [],
      keywords: [],
      competingVoices: [],
    }));

    const allTopics = [...ownTopics, ...adjacentTopics, ...avoidTopics];
    allTopics.sort((a, b) => b.priority - a.priority);

    const ownedWithContent = allTopics.filter(t => t.category === 'own').sort((a, b) => b.currentAuthority - a.currentAuthority);
    const highestAuthority = ownedWithContent[0]?.topic || '';
    const biggestGap = allTopics
      .filter(t => t.category !== 'avoid')
      .sort((a, b) => (b.targetAuthority - b.currentAuthority) - (a.targetAuthority - a.currentAuthority))[0]?.topic || '';

    const authorityRoadmap = [
      {
        phase: 'Foundation',
        timeframe: 'Month 1',
        focus: ownTopics.slice(0, 2).map(t => t.topic),
        deliverables: [
          `Publish 4 posts on ${ownTopics[0]?.topic || 'your core topic'}`,
          `Create 1 detailed case study or framework post`,
          `Engage with 10 posts from established voices in ${domain}`,
        ],
        successMetrics: ['4+ posts published', '500+ post views average', '10+ meaningful engagements'],
      },
      {
        phase: 'Expansion',
        timeframe: 'Month 2',
        focus: [...ownTopics.slice(0, 3).map(t => t.topic), ...adjacentTopics.slice(0, 1).map(t => t.topic)],
        deliverables: [
          `Publish 6 posts mixing depth and reach`,
          `Start 3 discussions in professional communities`,
          `Create 1 original framework or methodology post`,
        ],
        successMetrics: ['6+ posts published', '1000+ post views average', 'New connections from target audience'],
      },
      {
        phase: 'Authority',
        timeframe: 'Month 3',
        focus: [...ownTopics.map(t => t.topic)],
        deliverables: [
          `Publish 8 posts establishing thought leadership`,
          `Host 1 LinkedIn audio event or Twitter space`,
          `Collaborate with 2 other voices in ${domain}`,
        ],
        successMetrics: ['8+ posts published', '3+ inbound opportunities', 'Recognition from established voices'],
      },
    ];

    const recommendations: string[] = [
      `Own your top topics: ${ownTopics.slice(0, 3).map(t => t.topic).join(', ')}`,
      `Avoid: ${avoidTopics.map(t => t.topic).join(', ')} — these dilute your authority`,
      `Publish consistently — authority is built through repeated exposure, not single viral posts`,
      `Engage meaningfully with other voices in your space before expecting recognition`,
    ];

    logger.info({ domain, totalTopics: allTopics.length }, 'Authority map generated');

    return {
      topics: allTopics,
      summary: {
        ownedTopics: ownTopics.length,
        adjacentTopics: adjacentTopics.length,
        avoidedTopics: avoidTopics.length,
        highestAuthority,
        biggestGap,
        readinessScore: Math.round(ownTopics.reduce((s, t) => s + t.currentAuthority, 0) / Math.max(ownTopics.length, 1)),
      },
      authorityRoadmap,
      recommendations,
    };
  }

  private detectDomain(profile: ProfileInput): string {
    const title = profile.targetRole || profile.currentRole || '';
    const headline = profile.headline?.toLowerCase() || '';
    const about = profile.about?.toLowerCase() || '';

    if (title.includes('manager') || title.includes('lead') || title.includes('director') || title.includes('head')) return 'leadership';
    if (title.includes('design') || headline.includes('design') || about.includes('design')) return 'design';
    if (title.includes('data') || title.includes('ml') || title.includes('ai') || title.includes('scientist')) return 'data_science';
    if (title.includes('product') || title.includes('pm') || headline.includes('product')) return 'product';
    if (title.includes('devops') || title.includes('sre') || title.includes('infrastructure')) return 'devops';
    if (title.includes('frontend') || title.includes('ui') || headline.includes('frontend')) return 'frontend';
    if (title.includes('software') || title.includes('engineer') || title.includes('developer') || title.includes('full stack')) return 'software_engineering';

    const skills = (profile.skills || []).map(s => s.name.toLowerCase());
    if (skills.some(s => s.includes('machine learning') || s.includes('data'))) return 'data_science';
    if (skills.some(s => s.includes('react') || s.includes('angular') || s.includes('vue'))) return 'frontend';
    if (skills.some(s => s.includes('devops') || s.includes('docker') || s.includes('kubernetes'))) return 'devops';
    if (skills.some(s => s.includes('product') || s.includes('strategy'))) return 'product';
    if (skills.some(s => s.includes('figma') || s.includes('sketch') || s.includes('ui'))) return 'design';

    return 'software_engineering';
  }

  private displayTopic(key: string): string {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private calculatePriority(topic: string, currentSkills: Set<string>, category: string): number {
    if (category === 'avoid') return 0;
    const hasSkill = currentSkills.has(topic.toLowerCase()) ||
      currentSkills.has(topic.toLowerCase().replace(/_/g, ''));
    const base = category === 'own' ? 80 : 50;
    return hasSkill ? base + 10 : base - 10;
  }

  private estimateCurrentAuthority(topic: string, currentSkills: Set<string>): number {
    const hasSkill = currentSkills.has(topic.toLowerCase()) ||
      currentSkills.has(topic.toLowerCase().replace(/_/g, ''));
    return hasSkill ? 30 + Math.floor(Math.random() * 30) : 10 + Math.floor(Math.random() * 20);
  }

  private generateContentIdeas(topic: string): string[] {
    const displayTopic = this.displayTopic(topic);
    return [
      `My framework for mastering ${displayTopic.toLowerCase()}`,
      `What I wish I knew about ${displayTopic.toLowerCase()}`,
      `The ${displayTopic.toLowerCase()} mistakes that cost me [time/money/results]`,
      `${displayTopic} in [year]: what is changing and why it matters`,
      `A practical guide to ${displayTopic.toLowerCase()} for [role]`,
    ];
  }

  private generateKeywords(topic: string): string[] {
    const displayTopic = this.displayTopic(topic);
    return [
      displayTopic.toLowerCase(),
      `${displayTopic.toLowerCase()} tips`,
      `${displayTopic.toLowerCase()} best practices`,
      `${displayTopic.toLowerCase()} framework`,
      `${displayTopic.toLowerCase()} strategy`,
    ];
  }
}

export const authorityBuildingEngine = new AuthorityBuildingEngine();
