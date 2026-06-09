import pino from 'pino';

const logger = pino();

interface ProfileInput {
  skills?: Array<{ name: string }>;
  experience?: Array<{ title: string; company?: string }>;
  projects?: Array<{ title: string; description?: string }>;
  careerGoal?: { targetRole?: string; primaryGoal?: string };
}

interface WeeklyThemeOutput {
  globalWeekNumber: number;
  monthNumber: 1 | 2 | 3;
  weekNumber: 1 | 2 | 3 | 4;
  title: string;
  focus: string;
  description: string;
  supportingMonthlyGoal: string;
  contentIdeas: string[];
  pillarFocus: string[];
  contentTypeMix: Array<{ type: string; count: number }>;
}

export class WeeklyThemeEngine {
  generate(profile: ProfileInput): WeeklyThemeOutput[] {
    logger.info('Generating 12 weekly themes');
    const themes: WeeklyThemeOutput[] = [];
    const skillNames = (profile.skills || []).map(s => s.name);
    const targetRole = profile.careerGoal?.targetRole || '';
    const primarySkill = skillNames[0] || 'professional development';
    const secondarySkill = skillNames[1] || 'problem-solving';

    const monthDefs = [
      {
        monthNumber: 1 as const, phase: 'positioning' as const,
        weeks: [
          {
            weekNumber: 1 as const, title: 'Who I Am', focus: 'Personal narrative',
            description: 'Introduce your professional identity, background, and what drives your work. Establish the person behind the expertise.',
            ideas: [
              `My journey into ${primarySkill}`,
              `The moment I knew I wanted to work in ${targetRole || primarySkill}`,
              `What my career path says about my values`,
              `The professional I aspire to become`,
            ],
          },
          {
            weekNumber: 2 as const, title: 'Projects I Am Building', focus: 'Active work showcase',
            description: 'Share current projects and initiatives. Demonstrate active engagement and practical application of skills.',
            ideas: [
              `What I am building right now with ${primarySkill}`,
              `The problem that inspired my latest project`,
              `Behind the scenes of my current work`,
              `Early results from my ongoing project`,
            ],
          },
          {
            weekNumber: 3 as const, title: 'Lessons Learned', focus: 'Growth through experience',
            description: 'Share professional lessons and growth moments. Build trust through vulnerability and demonstrated learning.',
            ideas: [
              `The biggest mistake I made in ${primarySkill}`,
              `What my failures taught me about ${targetRole || 'my craft'}`,
              `Lessons from ${profile.experience?.length || 'my'} years in the industry`,
              `What I would tell my younger self about ${secondarySkill}`,
            ],
          },
          {
            weekNumber: 4 as const, title: 'Technical Deep Dive', focus: 'Depth demonstration',
            description: 'Showcase technical depth and expertise through detailed exploration of specific topics.',
            ideas: [
              `How ${primarySkill} works under the hood`,
              `Deep dive into a ${secondarySkill} concept I use daily`,
              `Architecture decisions I made and why`,
              `Breaking down a complex ${targetRole || 'technical'} challenge`,
            ],
          },
        ],
      },
      {
        monthNumber: 2 as const, phase: 'authority' as const,
        weeks: [
          {
            weekNumber: 1 as const, title: 'My Frameworks', focus: 'Original thinking',
            description: 'Share your original frameworks, methodologies, or mental models. Differentiate through unique approaches.',
            ideas: [
              `The ${primarySkill} framework I developed`,
              `My system for ${secondarySkill} success`,
              `A mental model that changed how I work`,
              `Comparing my approach to industry standards`,
            ],
          },
          {
            weekNumber: 2 as const, title: 'Educational Series', focus: 'Teaching mastery',
            description: 'Teach your audience fundamental concepts. Teaching demonstrates mastery and creates lasting value.',
            ideas: [
              `${primarySkill} explained simply`,
              `The ${secondarySkill} concepts every ${targetRole || 'professional'} should know`,
              `Common ${primarySkill} misconceptions`,
              `A step-by-step guide to ${secondarySkill}`,
            ],
          },
          {
            weekNumber: 3 as const, title: 'Case Studies', focus: 'Proven results',
            description: 'Share detailed case studies of projects or problems solved. Concrete proof of capability.',
            ideas: [
              `How I solved [problem] using ${primarySkill}`,
              `Case study: Building [project] from concept to launch`,
              `The ${targetRole || 'technical'} challenge that tested me`,
              `Before and after: How I improved [metric] through ${secondarySkill}`,
            ],
          },
          {
            weekNumber: 4 as const, title: 'Industry Analysis', focus: 'Market awareness',
            description: 'Demonstrate industry awareness and forward-thinking perspective on trends.',
            ideas: [
              `Where ${primarySkill} is heading in 2026`,
              `The trend in ${targetRole || 'our field'} that everyone is missing`,
              `How ${secondarySkill} is transforming our industry`,
              `My take on the biggest debate in ${primarySkill} right now`,
            ],
          },
        ],
      },
      {
        monthNumber: 3 as const, phase: 'opportunity' as const,
        weeks: [
          {
            weekNumber: 1 as const, title: 'Strong Opinions', focus: 'Thought leadership',
            description: 'Share well-reasoned opinions on industry topics. Stimulate discussion and attract attention.',
            ideas: [
              `Why most advice about ${primarySkill} is wrong`,
              `The ${targetRole || 'industry'} practice I would eliminate`,
              `What nobody tells you about ${secondarySkill}`,
              `My controversial take on ${primarySkill} best practices`,
            ],
          },
          {
            weekNumber: 2 as const, title: 'Success Stories', focus: 'Results showcase',
            description: 'Share wins and successes in detail. Success stories are the most opportunity-generating content.',
            ideas: [
              `The project that changed my ${targetRole || 'career'} trajectory`,
              `How I achieved [result] through ${primarySkill}`,
              `My biggest professional win and what it taught me`,
              `The recognition that meant the most in my career`,
            ],
          },
          {
            weekNumber: 3 as const, title: 'Future Vision', focus: 'Forward thinking',
            description: 'Share your vision for the future of your industry. Position yourself as a forward-thinking leader.',
            ideas: [
              `What ${primarySkill} looks like in 5 years`,
              `The opportunity most ${targetRole || 'professionals'} are missing`,
              `How I am preparing for the future of ${secondarySkill}`,
              `The change I want to bring to our industry`,
            ],
          },
          {
            weekNumber: 4 as const, title: 'Community & Impact', focus: 'Audience engagement',
            description: 'Focus on community engagement, collaboration, and giving back. Solidify relationships.',
            ideas: [
              `The people who shaped my ${primarySkill} journey`,
              `Highlighting amazing work from my network`,
              `How I give back to the ${targetRole || 'professional'} community`,
              `What I learned from my audience this quarter`,
            ],
          },
        ],
      },
    ];

    let globalWeek = 1;
    for (const month of monthDefs) {
      for (const week of month.weeks) {
        const monthlyGoal = month.phase === 'positioning' ? 'Establish expertise and build initial trust'
          : month.phase === 'authority' ? 'Build credibility and demonstrate mastery'
          : 'Generate opportunities and attract professional attention';

        themes.push({
          globalWeekNumber: globalWeek,
          monthNumber: month.monthNumber,
          weekNumber: week.weekNumber,
          title: week.title,
          focus: week.focus,
          description: week.description,
          supportingMonthlyGoal: monthlyGoal,
          contentIdeas: week.ideas.map(idea =>
            idea
              .replace('primarySkill', primarySkill)
              .replace('secondarySkill', secondarySkill)
              .replace('targetRole', targetRole)
          ),
          pillarFocus: [primarySkill, secondarySkill].filter(Boolean),
          contentTypeMix: [
            { type: 'Post', count: 3 },
            { type: 'Engagement', count: 5 },
          ],
        });
        globalWeek++;
      }
    }

    return themes;
  }
}

export const weeklyThemeEngine = new WeeklyThemeEngine();
