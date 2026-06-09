import pino from 'pino';
import type { INetworkingRecommendation } from '../../../models/career/NetworkingRecommendation';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string }>;
  experience?: Array<{ title: string; company?: string; industry?: string }>;
  targetRole?: string;
  targetIndustries?: string[];
  about?: string;
  headline?: string;
}

const ROLE_COMMUNITIES: Record<string, Array<{ name: string; platform: string; reason: string }>> = {
  'intern': [
    { name: 'r/cscareerquestions', platform: 'Reddit', reason: 'Active community for career advice and internship discussion' },
    { name: 'Major League Hacking', platform: 'Discord', reason: 'Largest student developer community with hackathons and mentorship' },
    { name: 'LinkedIn Student Community', platform: 'LinkedIn', reason: 'Network with peers and early-career recruiters' },
  ],
  'junior_developer': [
    { name: 'Stack Overflow', platform: 'Stack Overflow', reason: 'Build reputation by answering questions in your stack' },
    { name: 'Dev.to', platform: 'Dev.to', reason: 'Write technical content and build developer audience' },
    { name: 'r/learnprogramming', platform: 'Reddit', reason: 'Help others while solidifying your own knowledge' },
    { name: 'Local tech meetups', platform: 'Meetup.com', reason: 'In-person networking and mentorship opportunities' },
  ],
  'mid_level_developer': [
    { name: 'Hacker News', platform: 'news.ycombinator.com', reason: 'Stay current with industry trends and discussions' },
    { name: 'Software Engineering Daily', platform: 'Slack/Discord', reason: 'Community of practicing engineers sharing insights' },
    { name: 'React/Node/AWS community', platform: 'Discord', reason: 'Deep-dive technical discussions in your stack' },
    { name: 'LeadDev', platform: 'LeadDev.com', reason: 'Engineering leadership and career advancement content' },
  ],
  'senior_developer': [
    { name: 'LeadDev Community', platform: 'LeadDev', reason: 'Peer network for senior engineers and leaders' },
    { name: 'Rands Leadership Slack', platform: 'Slack', reason: 'Invite-only community of engineering leaders' },
    { name: 'StaffEng Community', platform: 'StaffEng.com', reason: 'Community for staff+ engineers' },
    { name: 'Tech Leadership Discord', platform: 'Discord', reason: 'Discuss technical strategy and team building' },
  ],
  'engineering_manager': [
    { name: 'Rands Leadership Slack', platform: 'Slack', reason: 'Premier community for engineering leaders' },
    { name: 'Platzi Engineering', platform: 'Platzi', reason: 'Engineering management best practices' },
    { name: 'Manager Club', platform: 'managerclub.com', reason: 'Engineering management resources and community' },
    { name: 'LeadDev Conference', platform: 'In-person', reason: 'Flagship conference for eng leadership' },
  ],
  'founder': [
    { name: 'Y Combinator Startup School', platform: 'startupschool.org', reason: 'Free startup education and community' },
    { name: 'Product Hunt', platform: 'producthunt.com', reason: 'Launch and discover products, network with makers' },
    { name: 'Indie Hackers', platform: 'indiehackers.com', reason: 'Community of bootstrap founders sharing revenue and growth' },
    { name: 'MicroConf', platform: 'microconf.com', reason: 'Community for bootstrapped SaaS founders' },
    { name: 'Startup Grind', platform: 'startupgrind.com', reason: 'Global startup community with local chapters' },
  ],
  'freelancer': [
    { name: 'Upwork Community', platform: 'Upwork', reason: 'Freelancer tips, client strategies, and networking' },
    { name: 'Freelancers Union', platform: 'freelancersunion.org', reason: 'Advocacy, resources, and community for freelancers' },
    { name: 'Indie Hackers', platform: 'indiehackers.com', reason: 'Community of independent makers and freelancers' },
    { name: 'LinkedIn Freelancer Network', platform: 'LinkedIn', reason: 'Connect with potential clients and peers' },
  ],
};

const ROLE_CONNECTION_TARGETS: Record<string, Array<{ type: string; why: string }>> = {
  'intern': [
    { type: 'Engineering managers at target companies', why: 'They make hiring decisions for interns' },
    { type: 'Current interns at target companies', why: 'They can share application tips and referral' },
    { type: 'University recruiters', why: 'Direct pipeline to internship programs' },
    { type: 'Recent graduates from your school', why: 'They have navigated the same path recently' },
  ],
  'junior_developer': [
    { type: 'Senior engineers who mentor', why: 'Learning from experienced engineers accelerates growth' },
    { type: 'Tech recruiters in your field', why: 'They have visibility into open positions' },
    { type: 'Mid-level engineers at target companies', why: 'They can share team culture and interview insights' },
    { type: 'Bootcamp/degree alumni', why: 'Shared background creates connection opportunities' },
  ],
  'mid_level_developer': [
    { type: 'Senior+ engineers at target companies', why: 'Learn about technical challenges and advancement' },
    { type: 'Engineering managers', why: 'Understand promotion criteria and leadership expectations' },
    { type: 'CTO/VP at interesting startups', why: 'Build relationships for future opportunities' },
    { type: 'Conference speakers in your domain', why: 'Engage with industry thought leaders' },
  ],
  'senior_developer': [
    { type: 'Fellow senior engineers', why: 'Peer network for technical collaboration' },
    { type: 'Directors of Engineering', why: 'Executive visibility for leadership opportunities' },
    { type: 'Startup CTOs', why: 'Potential CTO/leadership transitions' },
    { type: 'Industry thought leaders', why: 'Collaborate on content and community building' },
  ],
  'founder': [
    { type: 'Angel investors in your space', why: 'Potential funding and strategic guidance' },
    { type: 'Fellow founders', why: 'Peer support, collaboration, and founder-market-fit' },
    { type: 'Potential enterprise customers', why: 'Direct pipeline to revenue' },
    { type: 'Industry analysts/Journalists', why: 'PR and thought leadership amplification' },
  ],
  'freelancer': [
    { type: 'Agency owners who might subcontract', why: 'Steady client flow through partnerships' },
    { type: 'Past clients', why: 'Repeat business and referrals' },
    { type: 'Other freelancers in complementary fields', why: 'Cross-referral network' },
    { type: 'Hiring managers at companies that use contractors', why: 'Direct freelance engagements' },
  ],
};

export class NetworkingIntelligenceEngine {

  recommend(profile: ProfileInput): Pick<INetworkingRecommendation, 'targets' | 'communities' | 'events' | 'discussions' | 'summary' | 'recommendations'> {
    const role = this.detectRole(profile);
    const communityRecs = ROLE_COMMUNITIES[role] || ROLE_COMMUNITIES['mid_level_developer'];
    const connectionTargets = ROLE_CONNECTION_TARGETS[role] || ROLE_CONNECTION_TARGETS['mid_level_developer'];

    const communities = communityRecs.map((c, i) => ({
      name: c.name,
      platform: c.platform,
      type: 'online' as const,
      reason: c.reason,
      priority: (communityRecs.length - i) * 20,
    }));

    const targets = connectionTargets.map((t, i) => ({
      name: t.type,
      reason: t.why,
      priority: (connectionTargets.length - i) * 20,
      type: this.inferConnectionType(t.type),
      suggestedApproach: `Send a personalized connection note mentioning shared interest in ${profile.targetRole || 'your field'}`,
      relevanceScore: Math.round(70 + Math.random() * 20),
    }));

    const events = [
      {
        name: `${this.capitalize(this.detectDomain(profile))} Conference`,
        type: 'conference' as const,
        reason: 'Meet peers and learn about latest trends',
        priority: 80,
      },
      {
        name: `Local ${this.detectDomain(profile)} Meetup`,
        type: 'meetup' as const,
        reason: 'Build local professional network',
        priority: 60,
      },
      {
        name: 'Industry Webinar',
        type: 'webinar' as const,
        reason: 'Learn from experts while expanding network',
        priority: 40,
      },
    ];

    const discussions = [
      {
        topic: `${this.capitalize(profile.targetRole || 'your role')} best practices and lessons learned`,
        platform: 'LinkedIn',
        reason: 'Share your experience to attract target audience',
        suggestedAngle: 'What worked, what did not, and key takeaways',
        priority: 90,
      },
      {
        topic: 'Industry trends and predictions',
        platform: 'LinkedIn',
        reason: 'Position yourself as forward-thinking',
        suggestedAngle: 'Data-backed analysis of where things are heading',
        priority: 70,
      },
      {
        topic: 'Problem-solving in your domain',
        platform: 'Stack Overflow or Reddit',
        reason: 'Build reputation through helpful contributions',
        suggestedAngle: 'Detailed technical solution with explanation',
        priority: 50,
      },
    ];

    logger.info({ role, communities: communities.length, targets: targets.length }, 'Networking recommendations generated');

    return {
      targets,
      communities,
      events,
      discussions,
      summary: {
        totalTargets: targets.length,
        highPriorityTargets: targets.filter(t => t.priority >= 60).length,
        communitiesToJoin: communities.length,
        eventsToAttend: events.length,
        readinessScore: Math.round(Math.min(targets.length * 10, 100)),
      },
      recommendations: [
        `Start with ${targets[0]?.name || 'key connections'} — highest impact for your career stage`,
        `Join ${communities[0]?.name || 'relevant communities'} and contribute meaningfully before asking for help`,
        `Set a goal of ${targets.length} new meaningful connections per week`,
        `Attend at least 1 event per quarter in ${this.detectDomain(profile)}`,
      ],
    };
  }

  private detectRole(profile: ProfileInput): string {
    const title = profile.targetRole || profile.experience?.[0]?.title?.toLowerCase() || '';
    const headline = profile.headline?.toLowerCase() || '';

    if (title.includes('founder') || title.includes('ceo') || headline.includes('founder')) return 'founder';
    if (title.includes('freelance') || title.includes('independent') || headline.includes('freelance')) return 'freelancer';
    if (title.includes('manager') || title.includes('director') || title.includes('head')) return 'engineering_manager';
    if (title.includes('senior') || title.includes('principal') || title.includes('staff')) return 'senior_developer';
    if (title.includes('intern') || headline.includes('student')) return 'intern';
    if (title.includes('junior') || title.includes('graduate') || title.includes('associate')) return 'junior_developer';
    return 'mid_level_developer';
  }

  private detectDomain(profile: ProfileInput): string {
    const title = (profile.experience?.[0]?.title || profile.headline || '').toLowerCase();
    if (title.includes('data') || title.includes('ml')) return 'data science';
    if (title.includes('design')) return 'design';
    if (title.includes('product')) return 'product';
    if (title.includes('frontend')) return 'frontend';
    if (title.includes('devops')) return 'devops';
    return 'software engineering';
  }

  private capitalize(s: string): string {
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private inferConnectionType(type: string): 'mentor' | 'peer' | 'influencer' | 'recruiter' | 'potential_client' | 'collaborator' {
    if (type.includes('recruiter')) return 'recruiter';
    if (type.includes('mentor') || type.includes('senior') || type.includes('director') || type.includes('cto') || type.includes('vp')) return 'mentor';
    if (type.includes('client') || type.includes('customer')) return 'potential_client';
    if (type.includes('journalist') || type.includes('analyst') || type.includes('speaker')) return 'influencer';
    if (type.includes('founder') || type.includes('fellow')) return 'collaborator';
    return 'peer';
  }
}

export const networkingIntelligenceEngine = new NetworkingIntelligenceEngine();
