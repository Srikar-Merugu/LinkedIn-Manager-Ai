import pino from 'pino';

const logger = pino();

interface AngleRequest {
  signalType: string;
  title: string;
  description: string;
  source: string;
  metadata: Record<string, any>;
}

interface GeneratedAngle {
  type: 'story' | 'framework' | 'educational' | 'contrarian' | 'journey' | 'career' | 'founder' | 'technical';
  title: string;
  hook: string;
  outline: string[];
  estimatedEngagement: number;
}

export class ContentAngleEngine {
  generate(request: AngleRequest): GeneratedAngle[] {
    logger.info({ title: request.title }, 'Generating content angles');
    const angles: GeneratedAngle[] = [];
    const { title, description, signalType, metadata } = request;
    const projectName = metadata?.project?.title || metadata?.repo?.name || title;
    const certName = metadata?.certification?.name || title;
    const position = metadata?.position || metadata?.role || '';

    angles.push({
      type: 'story',
      title: `The story behind ${projectName}`,
      hook: `Here's the real story behind ${projectName} — not the highlight reel, but what actually happened.`,
      outline: ['How it started', 'The challenges', 'Breaking points', 'The breakthrough', "What I'd do differently"],
      estimatedEngagement: 85,
    });

    angles.push({
      type: 'framework',
      title: `My framework for ${signalType === 'certification' ? 'learning new skills' : 'building projects'}`,
      hook: `After ${signalType === 'certification' ? 'earning ' + certName : 'building ' + projectName}, I developed a repeatable framework. Here it is.`,
      outline: ['Step 1: Discovery', 'Step 2: Planning', 'Step 3: Execution', 'Step 4: Reflection', 'Step 5: Sharing'],
      estimatedEngagement: 72,
    });

    angles.push({
      type: 'educational',
      title: `What I learned about ${signalType === 'certification' ? certName : 'building ' + projectName}`,
      hook: `${Math.floor(Math.random() * 5) + 3} key lessons from ${signalType === 'certification' ? 'earning ' + certName : 'building ' + projectName} that apply to any professional.`,
      outline: ["Lesson 1: Start before you're ready", 'Lesson 2: Consistency beats intensity', 'Lesson 3: Share as you learn', 'Lesson 4: Focus on outcomes'],
      estimatedEngagement: 78,
    });

    angles.push({
      type: 'contrarian',
      title: `Why most advice about ${signalType === 'certification' ? 'certifications' : 'building projects'} is wrong`,
      hook: `Everyone says ${signalType === 'certification' ? 'certifications are the fastest way to grow' : 'you should build in public'}. Here's the truth nobody talks about.`,
      outline: ['The conventional wisdom', "Why it's incomplete", 'What actually matters', 'A better approach', 'My results'],
      estimatedEngagement: 80,
    });

    angles.push({
      type: 'journey',
      title: `My ${signalType === 'certification' ? certName + ' certification' : projectName + ' project'} journey`,
      hook: `A ${Math.floor(Math.random() * 6) + 3}-month journey through ${signalType === 'certification' ? 'earning ' + certName : 'building ' + projectName}. The highs, lows, and everything in between.`,
      outline: ['Week 1: Getting started', 'The middle: Where most people quit', 'Breakthrough moments', 'The finish line', "What's next"],
      estimatedEngagement: 82,
    });

    if (signalType === 'career_change' || position) {
      angles.push({
        type: 'career',
        title: `How ${position || 'this experience'} changed my career trajectory`,
        hook: `${position || 'This experience'} wasn't just a step forward — it changed how I think about my entire career.`,
        outline: ['Where I was', 'What changed', 'The inflection point', 'Where I am now', 'Advice for others'],
        estimatedEngagement: 88,
      });
    }

    if (signalType === 'open_source') {
      angles.push({
        type: 'founder',
        title: `Building ${projectName} in public: The full story`,
        hook: `I built ${projectName} completely in public. Here's what happened when I shared every success and failure.`,
        outline: ['Why I chose to build in public', 'The early reactions', 'Community feedback', 'Key metrics', 'Would I do it again?'],
        estimatedEngagement: 76,
      });
    }

    if (signalType === 'project' || signalType === 'open_source') {
      angles.push({
        type: 'technical',
        title: `${projectName}: Under the hood`,
        hook: `A deep dive into how ${projectName} works — the architecture, decisions, and trade-offs.`,
        outline: ['System architecture', 'Key components', 'Technical decisions', 'Performance considerations', "What I'd improve"],
        estimatedEngagement: 68,
      });
    }

    return angles;
  }
}

export const contentAngleEngine = new ContentAngleEngine();
