import pino from 'pino';
import type { IStorytellingBlueprint, IHookPattern, ICTAPattern } from '../../../models/writing/WritingDNA';

const logger = pino();

export class StorytellingEngine {

  analyze(texts: string[]): {
    blueprint: IStorytellingBlueprint;
    hooks: IHookPattern[];
    ctas: ICTAPattern[];
  } {
    const hooks = this.analyzeHooks(texts);
    const ctas = this.analyzeCTAs(texts);
    const blueprint = this.buildBlueprint(texts, hooks, ctas);

    return { blueprint, hooks, ctas };
  }

  private analyzeHooks(texts: string[]): IHookPattern[] {
    const hookTypes: Array<{
      type: IHookPattern['type'];
      patterns: RegExp[];
      keywords: string[];
    }> = [
      {
        type: 'question',
        patterns: [/^(how|what|why|when|where|who|do|does|are|can|should|would)/i, /\?$/m],
        keywords: ['?', 'what if', 'have you ever', 'ever wonder'],
      },
      {
        type: 'contrarian',
        patterns: [/^(unpopular opinion|hot take|controversial|i might get hate|counter.intuitive|actually)/i],
        keywords: ['unpopular', 'hot take', 'contrarian', 'actually', 'but here\'s why', 'everyone says'],
      },
      {
        type: 'personal',
        patterns: [/^(i |i'm |i was |i've |i'll |my |when i|after i)/i],
        keywords: ['i was', 'my experience', 'i remember', 'when i', 'after i', 'i\'ve been'],
      },
      {
        type: 'bold_claim',
        patterns: [/^(the #1|the best|the worst|the biggest|the most important|nobody tells you|stop doing)/i],
        keywords: ['the best', 'the worst', 'the most', 'everyone', 'nobody', 'stop', 'never'],
      },
      {
        type: 'data_point',
        patterns: [/^\d+/, /^\d+%/m, /^(according to|studies show|research says|data shows)/i],
        keywords: ['percent', 'statistics', 'study', 'research', 'data', 'survey'],
      },
      {
        type: 'story_opening',
        patterns: [/^(last year|last week|yesterday|a few|a couple|back in|early in|when i first)/i],
        keywords: ['last year', 'last week', 'one day', 'a few years', 'when i first'],
      },
      {
        type: 'how_to',
        patterns: [/^(here's how|how i|how to|the way i|my framework|my system|my process)/i],
        keywords: ['how i', 'how to', 'steps', 'framework', 'system', 'process', 'method'],
      },
    ];

    const hooks: IHookPattern[] = [];

    for (const text of texts) {
      const firstLine = text.split('\n')[0].trim();
      if (!firstLine || firstLine.length < 10) continue;

      for (const ht of hookTypes) {
        const matchesPattern = ht.patterns.some(p => p.test(firstLine));
        const matchesKeyword = ht.keywords.some(k => firstLine.toLowerCase().includes(k));

        if (matchesPattern || matchesKeyword) {
          const existing = hooks.find(h => h.type === ht.type);
          if (existing) {
            existing.frequency++;
          } else {
            hooks.push({
              type: ht.type,
              text: firstLine.slice(0, 100),
              frequency: 1,
              effectiveness: 0.5,
              confidence: matchesPattern ? 0.7 : 0.4,
            });
          }
          break;
        }
      }
    }

    const total = hooks.reduce((s, h) => s + h.frequency, 0) || 1;
    const sorted = hooks.sort((a, b) => b.frequency - a.frequency);
    return sorted.slice(0, 6);
  }

  private analyzeCTAs(texts: string[]): ICTAPattern[] {
    const ctaTypes: Array<{
      type: ICTAPattern['type'];
      patterns: RegExp[];
      keywords: string[];
    }> = [
      {
        type: 'question',
        patterns: [/\?$/m, /\?\s*$/],
        keywords: ['what do you think', 'have you', 'how do you', 'share your', 'thoughts?'],
      },
      {
        type: 'direct',
        patterns: [/^(follow|subscribe|connect|share|comment|like|save|tag|try|check out)/i],
        keywords: ['follow me', 'connect with me', 'share this', 'save this'],
      },
      {
        type: 'subtle',
        patterns: [/^(let me know|would love|curious|would be great|happy to)/i],
        keywords: ['let me know', 'would love', 'happy to help', 'open to', 'dm me'],
      },
      {
        type: 'engagement',
        patterns: [/^(tag|mention|nominate|challenge|vote|poll|agree|disagree)/i],
        keywords: ['tag someone', 'agree?', 'disagree?', 'which one', 'vote'],
      },
      {
        type: 'story',
        patterns: [/^(that's why|that's how|here's what|this is why|this is how)/i],
        keywords: ['that\'s why', 'that\'s how', 'and that\'s', 'here\'s why'],
      },
    ];

    const ctas: ICTAPattern[] = [];
    const lastLines = texts.map(t => {
      const lines = t.split('\n').filter(l => l.trim().length > 5);
      return lines[lines.length - 1] || '';
    }).filter(Boolean);

    for (const line of lastLines) {
      for (const ct of ctaTypes) {
        const matchesPattern = ct.patterns.some(p => p.test(line));
        const matchesKeyword = ct.keywords.some(k => line.toLowerCase().includes(k));

        if (matchesPattern || matchesKeyword) {
          const existing = ctas.find(c => c.type === ct.type);
          if (existing) {
            existing.frequency++;
          } else {
            ctas.push({
              type: ct.type,
              text: line.slice(0, 100),
              frequency: 1,
              effectiveness: 0.5,
              confidence: matchesPattern ? 0.7 : 0.4,
            });
          }
          break;
        }
      }
    }

    const sorted = ctas.sort((a, b) => b.frequency - a.frequency);
    return sorted.slice(0, 5);
  }

  private buildBlueprint(
    texts: string[],
    hooks: IHookPattern[],
    ctas: ICTAPattern[]
  ): IStorytellingBlueprint {
    const all = texts.join(' ');
    const storyTexts = texts.filter(t => {
      const indicators = ['when i', 'one day', 'last year', 'i remember', 'years ago', 'recently', 'i was'];
      return indicators.some(ind => t.toLowerCase().includes(ind));
    });

    const arcPatterns: Record<string, RegExp[]> = {
      'Challenge → Solution → Result': [/challenge|problem|difficult|struggle|issue|obstacle/, /solved|fixed|built|created|implemented/, /result|outcome|learned|improved|achieved/],
      'Journey → Lesson → Application': [/journey|started|began|path|first/, /learned|realized|discovered|taught/, /now|today|since|apply|use/],
      'Observation → Insight → Action': [/noticed|observed|saw|realized/, /the key|what matters|important|critical/, /should|must|need to|start|try/],
      'Moment → Reflection → Growth': [/moment|time when|day|night|experience/, /reflecting|thinking|looking back|realized/, /grew|changed|different now|transformed/],
    };

    let preferredArc = 'Journey → Lesson → Application';
    let maxScore = 0;

    for (const [arc, patterns] of Object.entries(arcPatterns)) {
      const score = patterns.reduce((s, p) => s + ((all.match(p) || []).length > 0 ? 1 : 0), 0);
      if (score > maxScore) {
        maxScore = score;
        preferredArc = arc;
      }
    }

    const hookType = hooks[0]?.type || 'personal';
    const hookStyleMap: Record<string, string> = {
      question: 'Opens with provocative questions to engage curiosity',
      contrarian: 'Challenges conventional wisdom to grab attention',
      personal: 'Leads with personal experience for authenticity',
      bold_claim: 'Makes strong assertions to establish authority',
      data_point: 'Uses statistics and data to build credibility',
      story_opening: 'Begins with narrative setup to create immersion',
      how_to: 'Starts with actionable promise for practical value',
    };

    const ctaType = ctas[0]?.type || 'question';
    const conclusionMap: Record<string, string> = {
      question: 'Ends with a question to spark discussion',
      direct: 'Directly asks for action (follow, share, connect)',
      subtle: 'Soft invitation for further conversation',
      engagement: 'Encourages tagging, polling, or participation',
      story: 'Wraps up with a reflective closing statement',
    };

    const lessonPatterns = [
      /here('s| is) (what|the) (i )?learned/i,
      /the (biggest|most important|key) (lesson|takeaway|insight)/i,
      /what i (learned|realized|discovered)/i,
      /if i (could|had|were)/i,
      /my #1 (lesson|takeaway|tip)/i,
      /the #1 (thing|lesson|takeaway)/i,
    ];

    const lessonDelivery = lessonPatterns.some(p => p.test(all)) ? 'Explicit lesson statement' : 'Implicit through narrative';

    const usesAnecdotes = storyTexts.length > 0;
    const usesData = /\d+%|\d+x|increased|decreased|grew|reduced/.test(all);
    const usesAnalogy = /like a|just as|similar to|compared to|unlike|think of it as|imagine if/i.test(all);

    const narrativeStructure = [];
    if (hooks[0]) narrativeStructure.push('Hook');
    if (storyTexts.length > 0) narrativeStructure.push('Context');
    narrativeStructure.push('Body');
    if (lessonDelivery.includes('Explicit')) narrativeStructure.push('Lesson');
    if (ctas[0]) narrativeStructure.push('CTA');

    return {
      preferredArc,
      hookStyle: hookStyleMap[hookType] || 'Leads with personal experience',
      lessonDelivery,
      conclusionPattern: conclusionMap[ctaType] || 'Ends with reflective closing',
      usesAnecdotes,
      usesData,
      usesAnalogy,
      narrativeStructure: [...new Set(narrativeStructure)],
    };
  }
}

export const storytellingEngine = new StorytellingEngine();
