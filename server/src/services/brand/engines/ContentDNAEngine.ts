import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';
import type { IContentDNATopic } from '../../../models/brand/BrandDNA';

const logger = pino();

export interface ContentDNAOutput {
  topics: IContentDNATopic[];
  contentAuthorityScore: number;
  recommendedContentMix: Record<string, number>;
}

export class ContentDNAEngine {

  analyze(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): ContentDNAOutput {
    const topics = this.buildTopicMap(report, parsed);
    const authorityScore = this.computeAuthorityScore(report, parsed);
    const contentMix = this.recommendContentMix(report, parsed, topics);

    return {
      topics,
      contentAuthorityScore: authorityScore,
      recommendedContentMix: contentMix,
    };
  }

  private buildTopicMap(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IContentDNATopic[] {
    const topics: IContentDNATopic[] = [];
    const about = (parsed.profile.about || '').toLowerCase();
    const headline = (parsed.profile.headline || '').toLowerCase();
    const skills = parsed.skills.topSkills;
    const identity = report.identity;

    const ownTopics = this.extractOwnTopics(report, parsed);
    for (const topic of ownTopics) {
      topics.push({
        topic: topic.name,
        category: 'own',
        confidence: topic.confidence,
        reasoning: topic.reasoning,
      });
    }

    const teachTopics = this.extractTeachableTopics(report, parsed);
    for (const topic of teachTopics) {
      if (!topics.find(t => t.topic === topic.name)) {
        topics.push({
          topic: topic.name,
          category: 'teach',
          confidence: topic.confidence,
          reasoning: topic.reasoning,
        });
      }
    }

    const documentTopics = this.extractDocumentTopics(report, parsed);
    for (const topic of documentTopics) {
      if (!topics.find(t => t.topic === topic.name)) {
        topics.push({
          topic: topic.name,
          category: 'document',
          confidence: topic.confidence,
          reasoning: topic.reasoning,
        });
      }
    }

    const debateTopics = this.extractDebateTopics(report, parsed);
    for (const topic of debateTopics) {
      if (!topics.find(t => t.topic === topic.name)) {
        topics.push({
          topic: topic.name,
          category: 'debate',
          confidence: topic.confidence,
          reasoning: topic.reasoning,
        });
      }
    }

    const experimentTopics = this.extractExperimentTopics(report, parsed);
    for (const topic of experimentTopics) {
      if (!topics.find(t => t.topic === topic.name)) {
        topics.push({
          topic: topic.name,
          category: 'experiment',
          confidence: topic.confidence,
          reasoning: topic.reasoning,
        });
      }
    }

    return topics;
  }

  private extractOwnTopics(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): Array<{ name: string; confidence: number; reasoning: string }> {
    const topics: Array<{ name: string; confidence: number; reasoning: string }> = [];
    const primary = report.expertise?.primary || [];
    const about = (parsed.profile.about || '').toLowerCase();
    const skills = parsed.skills.topSkills;

    for (const exp of primary.slice(0, 3)) {
      topics.push({
        name: exp.name,
        confidence: exp.confidence / 100,
        reasoning: exp.evidence.join('; '),
      });
    }

    for (const skill of skills.slice(0, 3)) {
      if (!topics.find(t => t.name === skill)) {
        topics.push({
          name: skill,
          confidence: about.includes(skill.toLowerCase()) ? 0.7 : 0.5,
          reasoning: `${skill} is a top skill${about.includes(skill.toLowerCase()) ? ' and is highlighted in the profile' : ''}`,
        });
      }
    }

    const currentRole = parsed.experience.careerProgression[0] || '';
    if (currentRole) {
      const roleWords = currentRole.split(' ').filter(w => w.length > 3);
      for (const word of roleWords.slice(0, 2)) {
        if (!topics.find(t => t.name.toLowerCase() === word.toLowerCase())) {
          topics.push({
            name: word.charAt(0).toUpperCase() + word.slice(1),
            confidence: 0.6,
            reasoning: `Core aspect of current role: ${currentRole}`,
          });
        }
      }
    }

    return topics;
  }

  private extractTeachableTopics(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): Array<{ name: string; confidence: number; reasoning: string }> {
    const topics: Array<{ name: string; confidence: number; reasoning: string }> = [];
    const secondary = report.expertise?.secondary || [];

    for (const exp of secondary.slice(0, 3)) {
      topics.push({
        name: exp.name,
        confidence: exp.confidence / 100 * 0.8,
        reasoning: `Deep secondary expertise: ${exp.evidence.join('; ')}`,
      });
    }

    const skills = parsed.skills.topSkills;
    for (const skill of skills.slice(0, 5)) {
      if (!topics.find(t => t.name === skill)) {
        topics.push({
          name: skill,
          confidence: 0.5,
          reasoning: `Professional skill with demonstrated competency`,
        });
      }
    }

    return topics;
  }

  private extractDocumentTopics(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): Array<{ name: string; confidence: number; reasoning: string }> {
    const topics: Array<{ name: string; confidence: number; reasoning: string }> = [];

    if (parsed.profile.experience && parsed.profile.experience.length > 0) {
      const current = parsed.experience.careerProgression[0];
      if (current) {
        topics.push({
          name: `My Journey as a ${current.split('@')[0]?.trim() || 'Professional'}`,
          confidence: 0.8,
          reasoning: 'Current role provides authentic documentation material',
        });
      }
    }

    if (parsed.summary.totalProjects > 0) {
      topics.push({
        name: 'Project Building Journey',
        confidence: 0.75,
        reasoning: `${parsed.summary.totalProjects} projects to document`,
      });
    }

    const about = (parsed.profile.about || '').toLowerCase();
    if (/journey|learning|growth|transition/i.test(about)) {
      topics.push({
        name: 'Career Growth & Learning',
        confidence: 0.7,
        reasoning: 'Profile emphasizes learning journey',
      });
    }

    return topics;
  }

  private extractDebateTopics(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): Array<{ name: string; confidence: number; reasoning: string }> {
    const topics: Array<{ name: string; confidence: number; reasoning: string }> = [];
    const skills = parsed.skills.topSkills;
    const industry = parsed.summary.industry || 'Tech';

    if (skills.length > 0) {
      topics.push({
        name: `${skills[0]} vs Alternatives: What I've Learned`,
        confidence: 0.6,
        reasoning: 'Practical experience provides credible perspective for technical debates',
      });
    }

    topics.push({
      name: `Industry Debates in ${industry}`,
      confidence: 0.5,
      reasoning: 'Industry experience enables informed opinion sharing',
    });

    if (parsed.summary.profileType === 'founder' || /founder|startup/i.test(parsed.profile.headline || '')) {
      topics.push({
        name: 'Startup vs Big Tech: Building in Different Worlds',
        confidence: 0.7,
        reasoning: 'Founder experience provides unique comparative insight',
      });
    }

    return topics;
  }

  private extractExperimentTopics(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): Array<{ name: string; confidence: number; reasoning: string }> {
    const topics: Array<{ name: string; confidence: number; reasoning: string }> = [];

    const emerging = report.expertise?.emerging || [];
    for (const exp of emerging.slice(0, 2)) {
      topics.push({
        name: `Exploring ${exp.name}`,
        confidence: 0.5,
        reasoning: `Emerging interest area: ${exp.evidence.join('; ')}`,
      });
    }

    if (parsed.summary.totalProjects > 0) {
      topics.push({
        name: 'Experimental Projects & Prototypes',
        confidence: 0.6,
        reasoning: 'Project experience shows hands-on experimentation capability',
      });
    }

    return topics;
  }

  private computeAuthorityScore(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): number {
    let score = 0;

    score += Math.min(parsed.summary.totalExperienceYears * 3, 25);

    score += Math.min(parsed.skills.total * 1.5, 20);

    score += Math.min(parsed.summary.totalCertifications * 8, 15);

    score += Math.min(parsed.summary.totalProjects * 5, 15);

    score += Math.min(parsed.content.totalPosts * 2, 15);

    const hasAbout = parsed.profile.about && parsed.profile.about.length > 50 ? 5 : 0;
    score += hasAbout;

    const hasCurrentRole = parsed.experience.totalRoles > 0 ? 5 : 0;
    score += hasCurrentRole;

    return Math.min(score, 100);
  }

  private recommendContentMix(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile,
    topics: IContentDNATopic[]
  ): Record<string, number> {
    const ownCount = topics.filter(t => t.category === 'own').length;
    const teachCount = topics.filter(t => t.category === 'teach').length;
    const documentCount = topics.filter(t => t.category === 'document').length;
    const debateCount = topics.filter(t => t.category === 'debate').length;
    const experimentCount = topics.filter(t => t.category === 'experiment').length;
    const total = ownCount + teachCount + documentCount + debateCount + experimentCount || 1;

    return {
      'Thought Leadership': Math.round((ownCount / total) * 40 + 10),
      'Educational Content': Math.round((teachCount / total) * 30 + 10),
      'Journey Documentation': Math.round((documentCount / total) * 20 + 5),
      'Opinion & Debate': Math.round((debateCount / total) * 10 + 5),
      'Experiments & Exploration': Math.round((experimentCount / total) * 10 + 5),
    };
  }
}

export const contentDNAEngine = new ContentDNAEngine();
