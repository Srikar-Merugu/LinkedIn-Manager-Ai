import pino from 'pino';
import {
  LinkedInUserProfile,
  ProfileAnalysis,
  AnalysisItem,
  SkillGap,
  ExperienceQuality,
  CareerStage,
  ProfileType,
} from '../../types/linkedin';
import { ParsedProfile } from '../linkedin/ProfileParser';
import { ScoringEngine } from './ScoringEngine';
import { IntelligenceReport } from '../../types/linkedin';

const logger = pino();

export class ProfileAnalysisEngine {
  private scoringEngine: ScoringEngine;

  constructor(scoringEngine: ScoringEngine) {
    this.scoringEngine = scoringEngine;
  }

  generateIntelligenceReport(
    userId: string,
    profileId: string,
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): IntelligenceReport {
    const profileScore = this.scoringEngine.calculateProfileScore(parsed, profile);
    const brandingScore = this.scoringEngine.calculateBrandingScore(parsed, profile);
    const visibilityScore = this.scoringEngine.calculateVisibilityScore(parsed);
    const opportunityScore = this.scoringEngine.calculateOpportunityScore(parsed);
    const contentReadinessScore = this.scoringEngine.calculateContentReadinessScore(parsed, profile);
    const analysis = this.analyzeProfile(parsed, profile);
    const recommendations = this.generateRecommendations(parsed, profile, analysis);

    const opportunityItems = this.identifyContentOpportunities(parsed, profile);
    const missingItems = this.identifyMissingOpportunities(parsed, profile);

    return {
      userId,
      profileId,
      generatedAt: new Date(),
      scores: {
        profile: profileScore,
        branding: brandingScore,
        visibility: visibilityScore,
        opportunity: opportunityScore,
        contentReadiness: contentReadinessScore,
      },
      analysis,
      recommendations,
      contentOpportunities: opportunityItems,
      missingOpportunities: missingItems,
    };
  }

  private analyzeProfile(parsed: ParsedProfile, profile: LinkedInUserProfile): ProfileAnalysis {
    const profileType = parsed.summary.profileType;
    const careerStage = parsed.summary.careerStage;

    const strengths = this.identifyStrengths(parsed, profile, profileType);
    const weaknesses = this.identifyWeaknesses(parsed, profile, profileType);
    const skillGaps = this.identifySkillGaps(parsed);
    const experienceQuality = this.assessExperienceQuality(parsed);

    const summary = this.generateSummary(parsed, strengths, weaknesses, profileType, careerStage);
    const industryAlignment = this.calculateIndustryAlignment(parsed);

    return {
      strengths,
      weaknesses,
      summary,
      careerStage,
      industryAlignment,
      skillGaps,
      experienceQuality,
    };
  }

  private identifyStrengths(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile,
    profileType: ProfileType
  ): AnalysisItem[] {
    const strengths: AnalysisItem[] = [];

    if (profile.headline && profile.headline.length >= 60) {
      strengths.push({
        category: 'Branding',
        title: 'Strong Professional Headline',
        description: 'Your headline clearly communicates your role and value proposition.',
        impact: 'high',
        score: 85,
        evidence: [
          `Headline length: ${profile.headline.length} characters`,
          'Includes role-specific keywords',
          'Clear professional identity',
          profile.headline,
        ],
      });
    }

    if ((profile.experience?.length || 0) >= 3) {
      strengths.push({
        category: 'Experience',
        title: 'Diverse Work Experience',
        description: `You have experience across ${parsed.experience.uniqueCompanies} organizations with ${parsed.experience.totalRoles} roles.`,
        impact: 'high',
        score: 80,
        evidence: [
          `${parsed.experience.totalRoles} total positions`,
          `${parsed.experience.uniqueCompanies} unique companies`,
          `Career progression: ${parsed.experience.careerProgression.join(' → ')}`,
          parsed.experience.hasGaps ? 'Minor employment gaps detected' : 'No significant employment gaps',
        ],
      });
    }

    if (parsed.skills.total >= 10) {
      strengths.push({
        category: 'Skills',
        title: 'Comprehensive Skills Portfolio',
        description: `You have ${parsed.skills.total} skills listed with ${parsed.skills.endorsedSkills} endorsed skills.`,
        impact: 'high',
        score: 75,
        evidence: [
          `${parsed.skills.total} total skills`,
          `${parsed.skills.topSkills.length} top skills identified`,
          `Average ${parsed.skills.averageEndorsements} endorsements per skill`,
          `Skills span ${parsed.skills.skillCategories.length} categories`,
        ],
      });
    }

    if (profile.about && profile.about.length >= 200) {
      strengths.push({
        category: 'Personal Branding',
        title: 'Well-Written About Section',
        description: 'Your about section effectively communicates your professional story.',
        impact: 'medium',
        score: 70,
        evidence: [
          `${profile.about.length} characters in about section`,
          'Contains narrative elements',
          'Highlights professional achievements',
        ],
      });
    }

    if (parsed.summary.careerStabilityScore >= 70) {
      strengths.push({
        category: 'Career Stability',
        title: 'Strong Career Stability',
        description: 'Your career trajectory shows consistent professional growth.',
        impact: 'medium',
        score: 75,
        evidence: [
          `Average tenure: ${Math.round(parsed.experience.averageRoleDuration)} months per role`,
          `Role progression score: ${parsed.summary.roleProgressionScore}%`,
          parsed.experience.hasGaps ? 'Minor gaps in employment history' : 'No significant employment gaps',
        ],
      });
    }

    if (parsed.education.totalEducation > 0) {
      strengths.push({
        category: 'Education',
        title: 'Educational Foundation',
        description: `Your ${parsed.education.highestDegree} degree provides a strong foundation.`,
        impact: 'medium',
        score: 65,
        evidence: [
          `Highest degree: ${parsed.education.highestDegree}`,
          `Field of study: ${parsed.education.fieldOfStudy.join(', ')}`,
          `Attended: ${parsed.education.universities.join(', ')}`,
        ],
      });
    }

    if (profileType === 'founder' || profileType === 'executive') {
      strengths.push({
        category: 'Leadership',
        title: 'Leadership Profile',
        description: 'Your profile positions you as a leader in your field.',
        impact: 'high',
        score: 85,
        evidence: [
          `Profile type: ${profileType}`,
          'Leadership keywords detected in headline',
          'Executive-level positioning',
        ],
      });
    }

    return strengths;
  }

  private identifyWeaknesses(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile,
    profileType: ProfileType
  ): AnalysisItem[] {
    const weaknesses: AnalysisItem[] = [];

    if (!profile.headline) {
      weaknesses.push({
        category: 'Branding',
        title: 'Missing Professional Headline',
        description: 'Your profile lacks a professional headline, making you harder to discover.',
        impact: 'high',
        score: 10,
        evidence: [
          'No headline set',
          'First impressions are missed',
          'Search visibility is reduced',
        ],
      });
    }

    if (!profile.about || profile.about.length < 100) {
      weaknesses.push({
        category: 'Branding',
        title: 'Weak or Missing About Section',
        description: 'Your about section needs more content to effectively communicate your value.',
        impact: 'high',
        score: 15,
        evidence: [
          profile.about ? `Only ${profile.about.length} characters` : 'No about section',
          'Missing opportunity to tell your story',
          'Value proposition is unclear',
        ],
      });
    }

    if (parsed.skills.total < 5) {
      weaknesses.push({
        category: 'Skills',
        title: 'Limited Skills Inventory',
        description: `You only have ${parsed.skills.total} skills listed. Aim for at least 10-15 relevant skills.`,
        impact: 'high',
        score: 20,
        evidence: [
          `${parsed.skills.total} skills listed`,
          'Below LinkedIn median of 25 skills',
          'Reduced search visibility',
        ],
      });
    }

    if (!profile.profilePicture) {
      weaknesses.push({
        category: 'Professionalism',
        title: 'Missing Profile Photo',
        description: 'Profiles with photos receive significantly more views and connection requests.',
        impact: 'medium',
        score: 15,
        evidence: [
          'No profile photo uploaded',
          'Profiles with photos get 21x more profile views',
          '14x more connection requests',
        ],
      });
    }

    if (parsed.content.totalPosts === 0) {
      weaknesses.push({
        category: 'Content',
        title: 'No Content Activity',
        description: 'You have not posted any content on LinkedIn, missing opportunities for visibility.',
        impact: 'high',
        score: 0,
        evidence: [
          'Zero posts or articles',
          'No content engagement history',
          'Missed opportunity for thought leadership',
        ],
      });
    }

    if (!parsed.experience.careerProgression.length) {
      weaknesses.push({
        category: 'Experience',
        title: 'No Work Experience Listed',
        description: 'Your profile does not include any work experience entries.',
        impact: 'high',
        score: 0,
        evidence: [
          'No positions listed',
          'Cannot verify professional background',
          'Missing key credibility signals',
        ],
      });
    }

    if (parsed.experience.averageRoleDuration < 12 && parsed.experience.totalRoles > 0) {
      weaknesses.push({
        category: 'Career',
        title: 'Short Tenure in Roles',
        description: 'Your average role duration is under a year, which may raise concerns.',
        impact: 'medium',
        score: 25,
        evidence: [
          `Average tenure: ${Math.round(parsed.experience.averageRoleDuration)} months`,
          'May appear as job hopping',
          'Consider highlighting project-based work',
        ],
      });
    }

    if (parsed.summary.totalCertifications === 0) {
      weaknesses.push({
        category: 'Professional Development',
        title: 'No Certifications Listed',
        description: 'Adding relevant certifications can boost credibility and expertise signals.',
        impact: 'low',
        score: 0,
        evidence: [
          'No certifications listed',
          'Missing validation of expertise',
          'Opportunity to stand out',
        ],
      });
    }

    return weaknesses;
  }

  private identifySkillGaps(parsed: ParsedProfile): SkillGap[] {
    const gaps: SkillGap[] = [];

    const skillName = parsed.skills.topSkills[0] || '';
    if (skillName) {
      if (!parsed.skills.skillCategories.includes('Leadership')) {
        gaps.push({
          skill: 'Leadership',
          importance: 'recommended',
          relevance: 0.7,
          reason: 'Leadership skills complement your technical expertise and improve career prospects.',
        });
      }
    }

    if (parsed.summary.profileType === 'founder') {
      gaps.push({
        skill: 'Business Strategy',
        importance: 'critical',
        relevance: 0.9,
        reason: 'Strategic skills are essential for founder roles and thought leadership.',
      });
    }

    return gaps;
  }

  private assessExperienceQuality(parsed: ParsedProfile): ExperienceQuality {
    const relevanceScore = parsed.experience.industries.length > 0 ? 80 : 30;
    const progressionScore = parsed.summary.roleProgressionScore;
    const consistencyScore = parsed.experience.hasGaps ? 40 : 85;
    const descriptionQualityScore = 60;

    const overall = Math.round((relevanceScore + progressionScore + consistencyScore + descriptionQualityScore) / 4);

    return {
      relevanceScore,
      progressionScore,
      consistencyScore,
      descriptionQualityScore,
      overall,
    };
  }

  private generateSummary(
    parsed: ParsedProfile,
    strengths: AnalysisItem[],
    weaknesses: AnalysisItem[],
    profileType: ProfileType,
    careerStage: CareerStage
  ): string {
    const strengthCount = strengths.length;
    const weaknessCount = weaknesses.length;
    const topStrength = strengths[0]?.title || 'your experience';

    return [
      `This is a ${profileType} profile at the ${careerStage} career stage with ${parsed.summary.totalExperienceYears} years of experience. `,
      `The profile has ${strengthCount} key strengths and ${weaknessCount} areas for improvement. `,
      `The strongest aspect is "${topStrength}". `,
      `With ${parsed.skills.total} skills across ${parsed.skills.skillCategories.length} categories`,
      parsed.education.totalEducation > 0 ? ` and a ${parsed.education.highestDegree} degree` : '',
      ', there is a solid foundation for content creation and professional growth.',
      weaknessCount > 0 ? ` Immediate focus should be on addressing the ${weaknesses[0]?.title.toLowerCase() || 'top weakness'} to maximize impact.` : '',
    ].join('');
  }

  private calculateIndustryAlignment(parsed: ParsedProfile): number {
    return parsed.experience.industries.length > 0 ? 75 : 0;
  }

  private generateRecommendations(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile,
    analysis: ProfileAnalysis
  ): import('../../types/linkedin').Recommendation[] {
    const recommendations: import('../../types/linkedin').Recommendation[] = [];
    let id = 0;

    if (!profile.about || profile.about.length < 200) {
      recommendations.push({
        id: `rec-${++id}`,
        type: 'profile',
        priority: 'critical',
        title: 'Write a Compelling About Section',
        description: 'Craft a narrative that explains who you are, what you do, and the value you provide.',
        actions: [
          'Write 3-5 paragraphs about your professional journey',
          'Include specific metrics and achievements',
          'Mention your target audience and how you help them',
          'Add relevant keywords for search optimization',
          'End with a clear call-to-action',
        ],
        expectedImpact: 'Increased profile views by 5x, improved search ranking',
        effort: 'medium',
        timeframe: 'immediate',
        metrics: { current: profile.about?.length || 0, target: 500 },
      });
    }

    if (parsed.content.totalPosts === 0) {
      recommendations.push({
        id: `rec-${++id}`,
        type: 'content',
        priority: 'critical',
        title: 'Start Posting Content Regularly',
        description: 'LinkedIn rewards active users with greater visibility. Start with 2-3 posts per week.',
        actions: [
          'Share insights about your industry daily',
          'Comment on trending topics in your field',
          'Write at least 1 article per month',
          'Engage with your network\'s content',
          'Use relevant hashtags for discovery',
        ],
        expectedImpact: '3x increase in profile views, establish thought leadership',
        effort: 'high',
        timeframe: 'immediate',
        metrics: { current: 0, target: 10 },
      });
    }

    if (!profile.headline) {
      recommendations.push({
        id: `rec-${++id}`,
        type: 'profile',
        priority: 'critical',
        title: 'Add a Professional Headline',
        description: 'Your headline is the first thing people see. Make it count with your role, expertise, and value.',
        actions: [
          'Include your current role and company',
          'Add your primary expertise or specialty',
          'Include keywords your target audience searches for',
          'Keep it between 80-150 characters',
          'End with your value proposition',
        ],
        expectedImpact: 'Improved search visibility, higher connection acceptance rate',
        effort: 'low',
        timeframe: 'immediate',
        metrics: { current: 0, target: 80 },
      });
    }

    if (parsed.skills.total < 10) {
      recommendations.push({
        id: `rec-${++id}`,
        type: 'skills',
        priority: 'high',
        title: 'Expand Your Skills Inventory',
        description: `Add more relevant skills to increase your search visibility by up to 30%.`,
        actions: [
          'Add 10+ industry-relevant skills',
          'Prioritize skills mentioned in job descriptions',
          'Add soft skills alongside technical skills',
          'Ask colleagues for endorsements',
          'Re-order skills to put top strengths first',
        ],
        expectedImpact: '30% increase in search appearances, higher credibility',
        effort: 'low',
        timeframe: 'short-term',
        metrics: { current: parsed.skills.total, target: 20 },
      });
    }

    if (parsed.education.totalEducation > 0 && parsed.education.fieldOfStudy.length > 0) {
      recommendations.push({
        id: `rec-${++id}`,
        type: 'content',
        priority: 'medium',
        title: 'Create Content Around Your Expertise',
        description: `Leverage your background in ${parsed.education.fieldOfStudy.join(', ')} to create authority-building content.`,
        actions: [
          'Write about trends in your industry',
          'Share lessons from your professional journey',
          'Create how-to guides for your skills',
          'Comment on industry news and developments',
          'Share case studies from your experience',
        ],
        expectedImpact: 'Position as thought leader, attract opportunities',
        effort: 'medium',
        timeframe: 'short-term',
        metrics: { current: parsed.content.totalPosts, target: 20 },
      });
    }

    recommendations.push({
      id: `rec-${++id}`,
      type: 'branding',
      priority: 'medium',
      title: 'Optimize Your Profile for Your Target Audience',
      description: 'Ensure your profile speaks directly to the people you want to reach.',
      actions: [
        'Review and align headline with target roles',
        'Update about section to address target audience pain points',
        'Ensure experience descriptions highlight relevant achievements',
        'Featured section should showcase best work',
        'Customize your profile URL if not already done',
      ],
      expectedImpact: 'Better engagement from target audience, increased relevant opportunities',
      effort: 'medium',
      timeframe: 'short-term',
      metrics: { current: 50, target: 85 },
    });

    return recommendations;
  }

  private identifyContentOpportunities(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): import('../../types/linkedin').ContentOpportunity[] {
    const opportunities: import('../../types/linkedin').ContentOpportunity[] = [];

    const headline = profile.headline || '';
    const about = profile.about || '';
    const skills = parsed.skills.topSkills;

    if (skills.length > 0) {
      opportunities.push({
        id: 'co-1',
        topic: skills[0],
        angle: `Leveraging ${skills[0]} for Business Impact`,
        format: 'article',
        confidence: 0.85,
        reason: `Your top skill "${skills[0]}" is highly relevant and you have endorsement proof to back up expertise.`,
        targetAudience: `Professionals interested in ${skills[0]}`,
        suggestedHook: `I've spent ${parsed.summary.totalExperienceYears} years mastering ${skills[0]}. Here's what actually matters:`,
        suggestedCTA: 'What has your experience been? Share below.',
      });
    }

    if (parsed.summary.industry !== 'Unknown') {
      opportunities.push({
        id: 'co-2',
        topic: `${parsed.summary.industry} Trends and Insights`,
        angle: `The Future of ${parsed.summary.industry}: What's Changing in ${new Date().getFullYear()}`,
        format: 'carousel',
        confidence: 0.75,
        reason: `You have ${parsed.summary.totalExperienceYears} years in ${parsed.summary.industry}, positioning you as an insider.`,
        targetAudience: `${parsed.summary.industry} professionals and enthusiasts`,
        suggestedHook: `${parsed.summary.industry} is changing faster than ever. Here are 5 trends you need to know:`,
        suggestedCTA: 'Which trend are you most excited about?',
      });
    }

    if (parsed.education.fieldOfStudy.length > 0) {
      opportunities.push({
        id: 'co-3',
        topic: `Career Lessons from ${parsed.education.fieldOfStudy[0]}`,
        angle: `How My ${parsed.education.highestDegree} in ${parsed.education.fieldOfStudy[0]} Shaped My Career`,
        format: 'post',
        confidence: 0.65,
        reason: 'Educational background provides a relatable foundation for career advice content.',
        targetAudience: 'Students and early-career professionals',
        suggestedHook: `When I graduated with a ${parsed.education.highestDegree} in ${parsed.education.fieldOfStudy[0]}, I wish someone told me:`,
        suggestedCTA: 'Tag someone who needs to hear this.',
      });
    }

    if (parsed.experience.careerProgression.length >= 2) {
      opportunities.push({
        id: 'co-4',
        topic: 'Career Transition Insights',
        angle: `From ${parsed.experience.careerProgression[parsed.experience.careerProgression.length - 1]} to Now: My Career Journey`,
        format: 'post',
        confidence: 0.70,
        reason: 'Your career progression tells an authentic story that others can learn from.',
        targetAudience: 'Professionals considering career changes',
        suggestedHook: `My career path wasn't linear. Here's what I learned transitioning from ${parsed.experience.careerProgression[0]}:`,
        suggestedCTA: 'What was your biggest career lesson?',
      });
    }

    return opportunities;
  }

  private identifyMissingOpportunities(
    parsed: ParsedProfile,
    profile: LinkedInUserProfile
  ): import('../../types/linkedin').MissingOpportunity[] {
    const missing: import('../../types/linkedin').MissingOpportunity[] = [];
    let id = 0;

    if (parsed.summary.totalCertifications === 0) {
      missing.push({
        id: `mo-${++id}`,
        category: 'Credentials',
        title: 'No Certifications or Licenses',
        description: 'Adding industry certifications can significantly boost your credibility.',
        potentialImpact: 'Increased trust and authority in your field',
        effortToFix: 'medium',
      });
    }

    if (parsed.education.totalEducation === 0) {
      missing.push({
        id: `mo-${++id}`,
        category: 'Education',
        title: 'Missing Educational Background',
        description: 'Employers and clients often look for educational background as a trust signal.',
        potentialImpact: 'Improved trust and credibility',
        effortToFix: 'low',
      });
    }

    if (parsed.profile === undefined || !profile.headline) {
      missing.push({
        id: `mo-${++id}`,
        category: 'Branding',
        title: 'Incomplete Professional Branding',
        description: 'Your professional brand is the sum of your headline, about, and featured sections.',
        potentialImpact: 'Stronger personal brand, better opportunities',
        effortToFix: 'low',
      });
    }

    if (parsed.content.totalPosts < 10) {
      missing.push({
        id: `mo-${++id}`,
        category: 'Content',
        title: 'Limited Content Presence',
        description: 'Regular content posting can 10x your visibility and opportunity pipeline.',
        potentialImpact: 'Thought leadership, inbound opportunities',
        effortToFix: 'high',
      });
    }

    if (parsed.skills.total < 20) {
      missing.push({
        id: `mo-${++id}`,
        category: 'Skills',
        title: 'Skills Gap Identified',
        description: 'Profiles with 20+ skills get 30% more profile views.',
        potentialImpact: 'Improved search ranking, more visibility',
        effortToFix: 'low',
      });
    }

    return missing;
  }
}
