import pino from 'pino';
import type { ExpandedIntelligenceReport, LinkedInUserProfile } from '../../../types/linkedin';
import type { ParsedProfile } from '../../linkedin/ProfileParser';
import type { IBrandRule } from '../../../models/brand/BrandDNA';

const logger = pino();

export class BrandConsistencyEngine {

  generateRules(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IBrandRule[] {
    const rules: IBrandRule[] = [];
    const about = (parsed.profile.about || '').toLowerCase();
    const headline = (parsed.profile.headline || '').toLowerCase();
    const archetype = report.identity.detectedRole || '';
    const profileType = parsed.summary.profileType;

    const voiceRules = this.generateVoiceRules(report, parsed);
    rules.push(...voiceRules);

    const contentRules = this.generateContentRules(report, parsed);
    rules.push(...contentRules);

    const positioningRules = this.generatePositioningRules(report, parsed);
    rules.push(...positioningRules);

    const engagementRules = this.generateEngagementRules(report, parsed);
    rules.push(...engagementRules);

    const growthRules = this.generateGrowthRules(report, parsed);
    rules.push(...growthRules);

    return rules;
  }

  private generateVoiceRules(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IBrandRule[] {
    const rules: IBrandRule[] = [];
    const about = (parsed.profile.about || '').toLowerCase();

    if (parsed.summary.profileType === 'student' || /journey|learning|growing/i.test(about)) {
      rules.push({
        category: 'voice',
        rule: 'Write with authentic vulnerability — share struggles and lessons, not just successes',
        rationale: 'Your audience connects with real growth stories, not polished perfection',
        priority: 'always',
      });
    }

    if (/build|create|made|develop/i.test(about)) {
      rules.push({
        category: 'voice',
        rule: 'Always emphasize building and creating — show, don\'t just tell',
        rationale: 'Your brand is built on demonstrated skills and shipped products',
        priority: 'always',
      });
    }

    if (/help|teach|mentor|guide/i.test(about)) {
      rules.push({
        category: 'voice',
        rule: 'Frame every post as a teaching moment — share actionable insights',
        rationale: 'Your audience comes to you for practical, useful knowledge',
        priority: 'always',
      });
    }

    if (/passionate|love|excited/i.test(about)) {
      rules.push({
        category: 'voice',
        rule: 'Lead with genuine enthusiasm and energy in your writing',
        rationale: 'Your natural excitement is your differentiator',
        priority: 'always',
      });
    }

    rules.push({
      category: 'voice',
      rule: parsed.content.totalPosts > 5
        ? 'Maintain your authentic voice — don\'t switch to corporate jargon'
        : 'Develop a consistent personal voice before adding formality',
      rationale: 'Authenticity builds trust and recognition',
      priority: 'always',
    });

    return rules;
  }

  private generateContentRules(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IBrandRule[] {
    const rules: IBrandRule[] = [];

    if (parsed.summary.totalProjects > 0) {
      rules.push({
        category: 'content',
        rule: 'Turn every project into at least one piece of content',
        rationale: `${parsed.summary.totalProjects} projects are untapped content gold`,
        priority: 'always',
      });
    }

    if (parsed.summary.totalCertifications > 0) {
      rules.push({
        category: 'content',
        rule: 'Document certification preparation journeys — not just the achievement',
        rationale: 'The journey is more valuable to your audience than the credential',
        priority: 'usually',
      });
    }

    rules.push({
      category: 'content',
      rule: 'Share specific numbers and metrics whenever possible',
      rationale: 'Data-driven content builds credibility and engagement',
      priority: 'usually',
    });

    rules.push({
      category: 'content',
      rule: 'Avoid generic motivational content and vague productivity advice',
      rationale: 'Your audience wants specific, actionable insights from your real experience',
      priority: 'always',
    });

    if (parsed.content.totalPosts > 0) {
      const avgEngagement = parsed.content.averageEngagement;
      rules.push({
        category: 'content',
        rule: avgEngagement > 50
          ? 'Double down on personal story content — it resonates with your audience'
          : 'Experiment with different formats to find what resonates',
        rationale: `Current average engagement is ${avgEngagement} — optimize for what works`,
        priority: 'usually',
      });
    }

    return rules;
  }

  private generatePositioningRules(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IBrandRule[] {
    const rules: IBrandRule[] = [];
    const skills = parsed.skills.topSkills;

    if (skills.length >= 2) {
      rules.push({
        category: 'positioning',
        rule: `Position yourself at the intersection of ${skills[0]} and ${skills[1]} — your unique advantage`,
        rationale: 'Your combination of skills is what makes you different from specialists',
        priority: 'always',
      });
    }

    if (report.identity.growthDirection) {
      rules.push({
        category: 'positioning',
        rule: `Frame your content around your growth direction: ${report.identity.growthDirection}`,
        rationale: 'Consistent positioning builds a recognizable personal brand',
        priority: 'always',
      });
    }

    rules.push({
      category: 'positioning',
      rule: 'Always connect your content back to your core positioning',
      rationale: 'Every post should reinforce who you are and where you\'re going',
      priority: 'usually',
    });

    return rules;
  }

  private generateEngagementRules(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IBrandRule[] {
    const rules: IBrandRule[] = [];

    if (parsed.content.totalPosts < 10) {
      rules.push({
        category: 'engagement',
        rule: 'Focus on consistency over perfection — publish at least 3x per week',
        rationale: 'Building a content habit is more important than viral posts',
        priority: 'always',
      });
    } else {
      rules.push({
        category: 'engagement',
        rule: `Maintain your posting cadence of ${Math.max(1, Math.round(parsed.content.totalPosts / 30))}x per week`,
        rationale: 'Consistency is your superpower — keep showing up',
        priority: 'always',
      });
    }

    rules.push({
      category: 'engagement',
      rule: 'Respond to every comment within 24 hours',
      rationale: 'Engagement drives more engagement — conversations build community',
      priority: 'always',
    });

    if (parsed.content.averageEngagement < 50) {
      rules.push({
        category: 'engagement',
        rule: 'End each post with a question to spark discussion',
        rationale: 'Questions double comment rates and boost algorithm reach',
        priority: 'usually',
      });
    }

    return rules;
  }

  private generateGrowthRules(
    report: ExpandedIntelligenceReport,
    parsed: ParsedProfile
  ): IBrandRule[] {
    const rules: IBrandRule[] = [];

    if (parsed.content.totalPosts < 10) {
      rules.push({
        category: 'growth',
        rule: 'Build authority through volume — publish more to learn what works',
        rationale: 'You can\'t optimize what you haven\'t started. Volume first, quality second.',
        priority: 'always',
      });
    }

    if (parsed.content.totalPosts > 10 && parsed.content.averageEngagement < 100) {
      rules.push({
        category: 'growth',
        rule: 'Study your top 10 posts and analyze what made them work',
        rationale: 'Data-driven iteration is the fastest path to growth',
        priority: 'always',
      });
    }

    rules.push({
      category: 'growth',
      rule: 'Collaborate with 1-2 peers in your space each month',
      rationale: 'Collaboration exposes you to new audiences and builds relationships',
      priority: 'usually',
    });

    return rules;
  }
}

export const brandConsistencyEngine = new BrandConsistencyEngine();
