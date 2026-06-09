import pino from 'pino';

const logger = pino();

export interface DiscoveryResult {
  canTeach: TopicSignal[];
  canDocument: TopicSignal[];
  canDebate: TopicSignal[];
  canExplore: TopicSignal[];
  canBuildAuthority: TopicSignal[];
  shouldAvoid: TopicSignal[];
}

export interface TopicSignal {
  topic: string;
  signalStrength: number;
  evidence: string[];
  source: string;
}

interface ProfileInput {
  skills?: Array<{ name: string; endorsements?: number; isTopSkill?: boolean }>;
  experience?: Array<{ title: string; description?: string }>;
  projects?: Array<{ title: string; description?: string }>;
  education?: Array<{ fieldOfStudy?: string; degree?: string }>;
  certifications?: Array<{ name: string }>;
  about?: string;
  headline?: string;
  brandDNA?: {
    archetype?: string;
    values?: string[];
    contentDNA?: { topics?: Array<{ name: string }> };
    brandTerritory?: { owned?: string[]; keywords?: string[] };
  };
  writingDNA?: {
    vocabularyProfile?: { favoriteWords?: string[]; technicalTerms?: string[] };
    formatPreferences?: Array<{ format: string }>;
  };
  careerBlueprint?: {
    targetPosition?: string;
    currentPosition?: string;
    sections?: any;
  };
}

export class ContentDiscoveryEngine {

  discover(profile: ProfileInput): DiscoveryResult {
    const topics = this.extractAllTopics(profile);

    const canTeach = this.filterTeachTopics(topics, profile);
    const canDocument = this.filterDocumentTopics(topics, profile);
    const canDebate = this.filterDebateTopics(topics, profile);
    const canExplore = this.filterExploreTopics(topics, profile);
    const canBuildAuthority = this.filterAuthorityTopics(topics, profile);
    const shouldAvoid = this.filterAvoidTopics(topics, profile);

    logger.info({
      teachCount: canTeach.length,
      documentCount: canDocument.length,
      debateCount: canDebate.length,
      exploreCount: canExplore.length,
      authorityCount: canBuildAuthority.length,
      avoidCount: shouldAvoid.length,
    }, 'Content discovery complete');

    return { canTeach, canDocument, canDebate, canExplore, canBuildAuthority, shouldAvoid };
  }

  private extractAllTopics(profile: ProfileInput): TopicSignal[] {
    const topics: TopicSignal[] = [];

    if (profile.skills) {
      for (const skill of profile.skills) {
        topics.push({
          topic: skill.name,
          signalStrength: Math.min(100, (skill.endorsements || 0) + (skill.isTopSkill ? 30 : 0) + 20),
          evidence: [`Skill: ${skill.name}${skill.endorsements ? ` (${skill.endorsements} endorsements)` : ''}`],
          source: 'skills',
        });
      }
    }

    if (profile.experience) {
      for (const exp of profile.experience) {
        const words = this.extractKeywords(exp.title + ' ' + (exp.description || ''));
        for (const word of words) {
          topics.push({
            topic: word,
            signalStrength: 60,
            evidence: [`Experience: ${exp.title}`],
            source: 'experience',
          });
        }
      }
    }

    if (profile.projects) {
      for (const project of profile.projects) {
        topics.push({
          topic: project.title,
          signalStrength: 70,
          evidence: [`Project: ${project.title}`],
          source: 'projects',
        });
        const descWords = this.extractKeywords(project.description || '');
        for (const word of descWords) {
          topics.push({
            topic: word,
            signalStrength: 40,
            evidence: [`Project description mentions: ${word}`],
            source: 'projects',
          });
        }
      }
    }

    if (profile.education) {
      for (const edu of profile.education) {
        if (edu.fieldOfStudy) {
          topics.push({
            topic: edu.fieldOfStudy,
            signalStrength: 50,
            evidence: [`Education: ${edu.fieldOfStudy}`],
            source: 'education',
          });
        }
      }
    }

    if (profile.certifications) {
      for (const cert of profile.certifications) {
        topics.push({
          topic: cert.name,
          signalStrength: 55,
          evidence: [`Certification: ${cert.name}`],
          source: 'certifications',
        });
      }
    }

    if (profile.brandDNA?.brandTerritory?.owned) {
      for (const owned of profile.brandDNA.brandTerritory.owned) {
        topics.push({
          topic: owned,
          signalStrength: 80,
          evidence: ['Brand DNA territory: owned'],
          source: 'brand_dna',
        });
      }
    }

    if (profile.brandDNA?.contentDNA?.topics) {
      for (const topic of profile.brandDNA.contentDNA.topics) {
        topics.push({
          topic: topic.name,
          signalStrength: 75,
          evidence: ['Brand DNA content topic'],
          source: 'brand_dna',
        });
      }
    }

    if (profile.writingDNA?.vocabularyProfile?.technicalTerms) {
      for (const term of profile.writingDNA.vocabularyProfile.technicalTerms) {
        topics.push({
          topic: term,
          signalStrength: 45,
          evidence: ['Writing DNA: technical term'],
          source: 'writing_dna',
        });
      }
    }

    if (profile.careerBlueprint?.targetPosition) {
      topics.push({
        topic: profile.careerBlueprint.targetPosition,
        signalStrength: 85,
        evidence: ['Career blueprint target position'],
        source: 'career_blueprint',
      });
    }

    return this.deduplicate(topics);
  }

  private filterTeachTopics(topics: TopicSignal[], profile: ProfileInput): TopicSignal[] {
    return topics
      .filter(t => t.signalStrength >= 60 && t.source !== 'certifications')
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 10);
  }

  private filterDocumentTopics(topics: TopicSignal[], profile: ProfileInput): TopicSignal[] {
    return topics
      .filter(t => (t.source === 'projects' || t.source === 'experience') && t.signalStrength >= 40)
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 10);
  }

  private filterDebateTopics(topics: TopicSignal[], profile: ProfileInput): TopicSignal[] {
    return topics
      .filter(t => t.signalStrength >= 50 && t.source !== 'education')
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 8);
  }

  private filterExploreTopics(topics: TopicSignal[], profile: ProfileInput): TopicSignal[] {
    const careerTarget = profile.careerBlueprint?.targetPosition?.toLowerCase() || '';
    const targetSkills = this.extractKeywords(careerTarget);

    const exploreTopics = topics.filter(t => t.signalStrength >= 30 || targetSkills.some(s => t.topic.toLowerCase().includes(s)));
    return exploreTopics.sort((a, b) => b.signalStrength - a.signalStrength).slice(0, 10);
  }

  private filterAuthorityTopics(topics: TopicSignal[], profile: ProfileInput): TopicSignal[] {
    return topics
      .filter(t => t.signalStrength >= 65 && t.source !== 'education')
      .sort((a, b) => b.signalStrength - a.signalStrength)
      .slice(0, 8);
  }

  private filterAvoidTopics(topics: TopicSignal[], profile: ProfileInput): TopicSignal[] {
    return [];
  }

  private deduplicate(topics: TopicSignal[]): TopicSignal[] {
    const seen = new Set<string>();
    return topics.filter(t => {
      const key = t.topic.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private extractKeywords(text: string): string[] {
    if (!text) return [];
    const words = text.toLowerCase().split(/[\s,;:()]+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'about', 'into', 'over',
      'after', 'before', 'between', 'under', 'above', 'below', 'this', 'that', 'these',
      'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
      'yours', 'yourself', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
      'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
      'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'if', 'while', 'building',
      'built', 'creating', 'created', 'working', 'worked', 'leading', 'led', 'managing', 'managed',
    ]);
    return [...new Set(words.filter(w => w.length > 2 && !stopWords.has(w)))];
  }
}

export const contentDiscoveryEngine = new ContentDiscoveryEngine();
