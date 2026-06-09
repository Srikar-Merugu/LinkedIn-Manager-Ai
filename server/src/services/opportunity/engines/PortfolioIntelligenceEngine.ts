import pino from 'pino';

const logger = pino();

interface PortfolioData {
  projects?: Array<{ title: string; description: string; url?: string; technologies?: string[]; status?: string }>;
  caseStudies?: Array<{ title: string; summary: string; url?: string }>;
  blogs?: Array<{ title: string; url?: string; date?: string; summary?: string }>;
  products?: Array<{ name: string; description: string; url?: string; launchDate?: string }>;
}

interface PortfolioChange {
  type: 'new_project' | 'new_case_study' | 'new_blog' | 'product_launch';
  title: string;
  description: string;
  url?: string;
  significance: 'high' | 'medium' | 'low';
  suggestedHook: string;
}

export class PortfolioIntelligenceEngine {
  detectNewEntries(current: PortfolioData, previous?: PortfolioData): PortfolioChange[] {
    logger.info('Detecting new portfolio entries');
    const changes: PortfolioChange[] = [];

    if (current.projects?.length) {
      const newProjects = previous?.projects
        ? current.projects.filter(p => !previous.projects?.find(pp => pp.title === p.title))
        : current.projects;

      for (const proj of newProjects.slice(0, 5)) {
        changes.push({
          type: 'new_project', title: proj.title, description: proj.description, url: proj.url, significance: 'high',
          suggestedHook: `I just finished building ${proj.title}. Here's what I learned.`,
        });
      }
    }

    if (current.caseStudies?.length) {
      const newStudies = previous?.caseStudies
        ? current.caseStudies.filter(cs => !previous.caseStudies?.find(pcs => pcs.title === cs.title))
        : current.caseStudies;

      for (const cs of newStudies.slice(0, 3)) {
        changes.push({
          type: 'new_case_study', title: cs.title, description: cs.summary, url: cs.url, significance: 'high',
          suggestedHook: `Case study: ${cs.title} — the challenges, solutions, and key takeaways.`,
        });
      }
    }

    if (current.blogs?.length) {
      const newBlogs = previous?.blogs
        ? current.blogs.filter(b => !previous.blogs?.find(pb => pb.title === b.title))
        : current.blogs;

      for (const blog of newBlogs.slice(0, 3)) {
        changes.push({
          type: 'new_blog', title: blog.title, description: blog.summary || blog.title, url: blog.url, significance: 'medium',
          suggestedHook: `New blog post: ${blog.title}. I'd love to hear your thoughts.`,
        });
      }
    }

    if (current.products?.length) {
      const newProducts = previous?.products
        ? current.products.filter(p => !previous.products?.find(pp => pp.name === p.name))
        : current.products;

      for (const prod of newProducts.slice(0, 3)) {
        changes.push({
          type: 'product_launch', title: prod.name, description: prod.description, url: prod.url, significance: 'high',
          suggestedHook: `I'm excited to launch ${prod.name}! Here's the story behind it.`,
        });
      }
    }

    return changes;
  }
}

export const portfolioIntelligenceEngine = new PortfolioIntelligenceEngine();
