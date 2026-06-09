import pino from 'pino';

const logger = pino();

interface RepoInfo {
  name: string; description?: string; language?: string; stars?: number; forks?: number;
}

interface GitHubData {
  repos?: RepoInfo[];
  commits?: Array<{ repo: string; message: string; date?: string }>;
  totalStars?: number;
  totalForks?: number;
  totalCommits?: number;
  totalRepos?: number;
}

interface GitHubMilestone {
  type: 'stars' | 'commits' | 'forks' | 'repos' | 'contributions';
  value: number;
  message: string;
  suggestedHook: string;
}

interface RepositoryOpportunity {
  repoName: string;
  description: string;
  opportunities: Array<{
    angle: string;
    title: string;
    hook: string;
    outline: string[];
  }>;
}

export class GitHubIntelligenceEngine {
  detectMilestones(data: GitHubData): GitHubMilestone[] {
    logger.info('Detecting GitHub milestones');
    const milestones: GitHubMilestone[] = [];

    if (data.totalStars && data.totalStars >= 10 && data.totalStars % 10 === 0) {
      milestones.push({ type: 'stars', value: data.totalStars, message: `Reached ${data.totalStars} stars across repositories!`, suggestedHook: `${data.totalStars} stars on GitHub. Here's what I did to earn them.` });
    }
    if (data.totalForks && data.totalForks >= 5 && data.totalForks % 5 === 0) {
      milestones.push({ type: 'forks', value: data.totalForks, message: `${data.totalForks} forks — people are building on my work!`, suggestedHook: `${data.totalForks} forks means ${data.totalForks} people found my code useful enough to build on.` });
    }
    if (data.totalCommits && data.totalCommits >= 100 && data.totalCommits % 100 === 0) {
      milestones.push({ type: 'commits', value: data.totalCommits, message: `${data.totalCommits} total commits! Consistency pays off.`, suggestedHook: `${data.totalCommits} commits later, here's what I learned about showing up every day.` });
    }
    if (data.totalRepos && data.totalRepos >= 5 && data.totalRepos % 5 === 0) {
      milestones.push({ type: 'repos', value: data.totalRepos, message: `Published ${data.totalRepos} repositories.`, suggestedHook: `I've published ${data.totalRepos} repositories. Here are the ones I'm most proud of.` });
    }

    return milestones;
  }

  analyzeRepository(repo: RepoInfo): RepositoryOpportunity | null {
    if (!repo) return null;
    return {
      repoName: repo.name,
      description: repo.description || `A ${repo.language || 'software'} project`,
      opportunities: [
        {
          angle: 'technical',
          title: `Building ${repo.name}: Architecture and design`,
          hook: `A look inside ${repo.name} — the architecture, stack, and decisions behind it.`,
          outline: [`What is ${repo.name}`, 'Architecture overview', `Built with ${repo.language || 'modern tools'}`, 'Key features', 'How to contribute'],
        },
        {
          angle: 'story',
          title: `Why I built ${repo.name}`,
          hook: `The problem that led me to build ${repo.name} and why I decided to open source it.`,
          outline: ['The problem I faced', "Why existing solutions didn't work", 'Building the solution', 'Open sourcing it', `What's next for ${repo.name}`],
        },
        {
          angle: 'community',
          title: `${repo.name} got ${repo.stars || 0} stars — here's what I learned`,
          hook: `${repo.name} reached ${repo.stars || 0} stars. Here's what the GitHub community taught me about building in public.`,
          outline: ['Launch day', 'Early feedback', 'Community contributions', 'Key learnings', 'Advice for open source beginners'],
        },
      ],
    };
  }
}

export const gitHubIntelligenceEngine = new GitHubIntelligenceEngine();
