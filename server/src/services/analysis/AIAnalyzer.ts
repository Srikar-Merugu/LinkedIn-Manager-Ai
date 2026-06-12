import axios from 'axios';
import pino from 'pino';
import { LinkedInProfileData, GitHubProfileData, ResumeData } from './ProfileDataExtractor';

const logger = pino({ name: 'ai-analyzer' });

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AIAnalysisResult {
  profileScore: number;
  profileHealth: { section: string; status: 'strong' | 'good' | 'needs_improvement' | 'missing'; details: string }[];
  strengths: { title: string; category: string; description: string; impact: 'high' | 'medium' | 'low'; score: number; evidence: string[] }[];
  weaknesses: { title: string; category: string; description: string; impact: 'high' | 'medium' | 'low'; score: number; evidence: string[] }[];
  missingSections: { section: string; priority: 'high' | 'medium' | 'low'; reason: string }[];
  improvements: { title: string; priority: 'high' | 'medium' | 'low'; impact: string; effort: string; description: string }[];
  contentOpportunities: { topic: string; reason: string; engagementScore: number; pillar: string }[];
  contentPillars: { name: string; description: string; score: number; topics: string[]; authorityScore: number; engagementPotential: number; careerAlignment: number }[];
  quickWins: { action: string; impact: string; effort: string; category: string }[];
  voiceProfile: { tone: string; style: string; storytelling: string; vocabulary: string[]; hooks: string[]; ctas: string[] };
  brandDNA: { archetype: string; positioning: string; targetAudience: string; uniqueValueProposition: string };
  aiSummary: string;
}

export class AIAnalyzer {

  async analyzeProfile(
    linkedin: LinkedInProfileData,
    github: GitHubProfileData,
    resume: ResumeData,
    fullName: string,
    careerGoals: string[]
  ): Promise<AIAnalysisResult> {
    logger.info({ fullName, careerGoals }, 'Starting AI analysis');

    const prompt = this.buildAnalysisPrompt(linkedin, github, resume, fullName, careerGoals);

    try {
      const apiKey = process.env.OPENROUTER_API_KEY || '';
      if (!apiKey) {
        logger.warn('No OpenRouter API key, using rule-based analysis');
        return this.ruleBasedAnalysis(linkedin, github, resume, fullName);
      }

      const response = await axios.post(OPENROUTER_API_URL, {
        model: 'deepseek/deepseek-chat-v3:free',
        messages: [
          {
            role: 'system',
            content: 'You are an expert LinkedIn profile analyst and career coach. Analyze the user\'s professional data and return a comprehensive JSON analysis. Be specific and reference actual data from their profile. Never use placeholder or generic advice.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://personaos-ai.vercel.app',
          'X-Title': 'PersonaOS LinkedIn Analysis',
        },
        timeout: 60000,
      });

      const content = response.data?.choices?.[0]?.message?.content || '';
      logger.info({ responseLength: content.length }, 'AI response received');

      const result = this.parseAIResponse(content, linkedin, github, resume);
      logger.info({ profileScore: result.profileScore }, 'AI analysis complete');
      return result;
    } catch (error: any) {
      logger.error({ error: error.message }, 'AI analysis failed, falling back to rule-based');
      return this.ruleBasedAnalysis(linkedin, github, resume, fullName);
    }
  }

  private buildAnalysisPrompt(
    linkedin: LinkedInProfileData,
    github: GitHubProfileData,
    resume: ResumeData,
    fullName: string,
    careerGoals: string[]
  ): string {
    return `Analyze this professional's profile and return a JSON analysis.

## Person: ${fullName}
## Career Goals: ${careerGoals.join(', ') || 'Not specified'}

## LinkedIn Profile:
- Connected: ${linkedin.connected}
- Headline: ${linkedin.headline || 'NOT SET'}
- About: ${linkedin.about || 'NOT SET'}
- Location: ${linkedin.location || 'NOT SET'}
- Industry: ${linkedin.industry || 'NOT SET'}
- Experience (${linkedin.experience.length} positions):
${linkedin.experience.map(e => `  - ${e.title} at ${e.organization} (${e.startDate} - ${e.endDate || 'Present'})${e.description ? ': ' + e.description.substring(0, 100) : ''}`).join('\n') || '  None'}
- Education (${linkedin.education.length}):
${linkedin.education.map(e => `  - ${e.degree} in ${e.fieldOfStudy} from ${e.schoolName}`).join('\n') || '  None'}
- Skills (${linkedin.skills.length}): ${linkedin.skills.slice(0, 20).join(', ') || 'None'}
- Certifications: ${linkedin.certifications.map(c => c.name).join(', ') || 'None'}

## GitHub Profile:
- Connected: ${github.connected}
- Username: ${github.username || 'NOT SET'}
- Public Repos: ${github.publicRepos}
- Followers: ${github.followers}
- Total Stars: ${github.totalStars}
- Total Forks: ${github.totalForks}
- Languages: ${github.languages.join(', ') || 'None'}
- Top Repos:
${github.topRepos.slice(0, 5).map(r => `  - ${r.name}: ${r.description || 'No description'} (${r.stars} stars, ${r.language})`).join('\n') || '  None'}
- Recent Activity Streak: ${github.contributionStreak} days

## Resume Data:
- Skills (${resume.skills.length}): ${resume.skills.slice(0, 20).join(', ') || 'None'}
- Experience (${resume.experience.length} positions, ${resume.totalExperienceYears} years):
${resume.experience.map(e => `  - ${e.title} at ${e.organization}`).join('\n') || '  None'}
- Education: ${resume.education.map(e => `${e.degree} in ${e.field} from ${e.institution}`).join(', ') || 'None'}
- Certifications: ${resume.certifications.map(c => c.name).join(', ') || 'None'}
- Projects (${resume.projects.length}):
${resume.projects.map(p => `  - ${p.name}: ${p.description?.substring(0, 80) || 'No description'} [${p.technologies?.join(', ') || ''}]`).join('\n') || '  None'}
- Summary: ${resume.summary?.substring(0, 200) || 'NOT SET'}

Return a JSON object with exactly this structure:
{
  "profileScore": <number 0-100>,
  "profileHealth": [
    {"section": "Headline", "status": "strong|good|needs_improvement|missing", "details": "<specific detail>"},
    {"section": "About Section", "status": "...", "details": "..."},
    {"section": "Experience", "status": "...", "details": "..."},
    {"section": "Skills", "status": "...", "details": "..."},
    {"section": "Projects", "status": "...", "details": "..."},
    {"section": "Certifications", "status": "...", "details": "..."},
    {"section": "GitHub", "status": "...", "details": "..."},
    {"section": "Profile Photo", "status": "...", "details": "..."}
  ],
  "strengths": [
    {"title": "<specific strength>", "category": "Technical|Experience|Skills|Leadership|Education|Portfolio", "description": "<why this is a strength with specific data>", "impact": "high|medium|low", "score": <0-100>, "evidence": ["<specific evidence>"]}
  ],
  "weaknesses": [
    {"title": "<specific weakness>", "category": "Profile|Visibility|Content|Skills|Portfolio", "description": "<what's missing or weak>", "impact": "high|medium|low", "score": <0-100>, "evidence": ["<specific gap>"]}
  ],
  "missingSections": [
    {"section": "<section name>", "priority": "high|medium|low", "reason": "<why it matters>"}
  ],
  "improvements": [
    {"title": "<action>", "priority": "high|medium|low", "impact": "<expected result>", "effort": "<time estimate>", "description": "<how to do it>"}
  ],
  "contentOpportunities": [
    {"topic": "<post topic>", "reason": "<why this topic>", "engagementScore": <0-100>, "pillar": "<content pillar>"}
  ],
  "contentPillars": [
    {"name": "<pillar name>", "description": "<what to post about>", "score": <0-100>, "topics": ["<topic>"], "authorityScore": <0-100>, "engagementPotential": <0-100>, "careerAlignment": <0-100>}
  ],
  "quickWins": [
    {"action": "<specific action>", "impact": "<result>", "effort": "<time>", "category": "<category>"}
  ],
  "voiceProfile": {"tone": "<tone>", "style": "<style>", "storytelling": "<pattern>", "vocabulary": ["<word>"], "hooks": ["<hook>"], "ctas": ["<cta>"]},
  "brandDNA": {"archetype": "<type>", "positioning": "<position>", "targetAudience": "<audience>", "uniqueValueProposition": "<uVP>"},
  "aiSummary": "<2-3 sentence personalized summary referencing specific profile data>"
}

IMPORTANT: Return ONLY valid JSON. Reference SPECIFIC data from the profile (actual repo names, actual skills, actual job titles). Never use generic placeholders.`;
  }

  private parseAIResponse(content: string, linkedin: LinkedInProfileData, github: GitHubProfileData, resume: ResumeData): AIAnalysisResult {
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      return this.validateAndFillResult(parsed, linkedin, github, resume);
    } catch (e: any) {
      logger.error({ error: e.message }, 'Failed to parse AI response, using rule-based');
      return this.ruleBasedAnalysis(linkedin, github, resume, '');
    }
  }

  private validateAndFillResult(parsed: any, linkedin: LinkedInProfileData, github: GitHubProfileData, resume: ResumeData): AIAnalysisResult {
    return {
      profileScore: Math.min(100, Math.max(0, parsed.profileScore || 0)),
      profileHealth: Array.isArray(parsed.profileHealth) ? parsed.profileHealth : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      missingSections: Array.isArray(parsed.missingSections) ? parsed.missingSections : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      contentOpportunities: Array.isArray(parsed.contentOpportunities) ? parsed.contentOpportunities : [],
      contentPillars: Array.isArray(parsed.contentPillars) ? parsed.contentPillars : [],
      quickWins: Array.isArray(parsed.quickWins) ? parsed.quickWins : [],
      voiceProfile: parsed.voiceProfile || { tone: '', style: '', storytelling: '', vocabulary: [], hooks: [], ctas: [] },
      brandDNA: parsed.brandDNA || { archetype: '', positioning: '', targetAudience: '', uniqueValueProposition: '' },
      aiSummary: parsed.aiSummary || '',
    };
  }

  ruleBasedAnalysis(linkedin: LinkedInProfileData, github: GitHubProfileData, resume: ResumeData, fullName: string): AIAnalysisResult {
    logger.info('Running rule-based analysis');
    const firstName = fullName.split(' ')[0] || 'The user';

    let score = 0;
    const health: AIAnalysisResult['profileHealth'] = [];
    const strengths: AIAnalysisResult['strengths'] = [];
    const weaknesses: AIAnalysisResult['weaknesses'] = [];
    const missing: AIAnalysisResult['missingSections'] = [];
    const improvements: AIAnalysisResult['improvements'] = [];
    const contentOpps: AIAnalysisResult['contentOpportunities'] = [];
    const pillars: AIAnalysisResult['contentPillars'] = [];
    const quickWins: AIAnalysisResult['quickWins'] = [];

    if (linkedin.headline) { score += 10; health.push({ section: 'Headline', status: linkedin.headline.length > 30 ? 'strong' : 'good', details: linkedin.headline }); }
    else { health.push({ section: 'Headline', status: 'missing', details: 'No headline set' }); missing.push({ section: 'Headline', priority: 'high', reason: 'Headline is the first thing recruiters see' }); }

    if (linkedin.about && linkedin.about.length > 100) { score += 10; health.push({ section: 'About Section', status: 'strong', details: `${linkedin.about.length} characters` }); strengths.push({ title: 'Detailed About Section', category: 'Profile', description: `About section has ${linkedin.about.length} characters of content`, impact: 'high', score: 80, evidence: [linkedin.about.substring(0, 100)] }); }
    else if (linkedin.about) { score += 5; health.push({ section: 'About Section', status: 'needs_improvement', details: `Only ${linkedin.about.length} characters — aim for 200+` }); improvements.push({ title: 'Expand About Section', priority: 'high', impact: 'Increase profile views by 40%', effort: '20 mins', description: 'Expand your About section to at least 200 characters with your journey, skills, and goals' }); }
    else { health.push({ section: 'About Section', status: 'missing', details: 'No about section' }); missing.push({ section: 'About Section', priority: 'high', reason: 'About section improves profile views by 40%' }); }

    if (linkedin.experience.length > 0) { score += 10; health.push({ section: 'Experience', status: linkedin.experience.length >= 3 ? 'strong' : 'good', details: `${linkedin.experience.length} positions listed` }); strengths.push({ title: 'Professional Experience', category: 'Experience', description: `${linkedin.experience.length} positions demonstrating career growth`, impact: 'high', score: Math.min(100, linkedin.experience.length * 25), evidence: linkedin.experience.slice(0, 3).map(e => `${e.title} at ${e.organization}`) }); }
    else { health.push({ section: 'Experience', status: 'missing', details: 'No experience listed' }); missing.push({ section: 'Experience', priority: 'high', reason: 'Experience establishes professional credibility' }); }

    if (linkedin.skills.length > 0) { score += 8; health.push({ section: 'Skills', status: linkedin.skills.length >= 10 ? 'strong' : 'needs_improvement', details: `${linkedin.skills.length} skills listed` }); if (linkedin.skills.length >= 10) strengths.push({ title: 'Diverse Skill Set', category: 'Skills', description: `${linkedin.skills.length} skills across multiple domains`, impact: 'medium', score: Math.min(100, linkedin.skills.length * 8), evidence: linkedin.skills.slice(0, 5) }); else improvements.push({ title: 'Add More Skills', priority: 'medium', impact: 'Appear in more searches', effort: '10 mins', description: `Only ${linkedin.skills.length} skills — add at least 10 relevant skills` }); }
    else { health.push({ section: 'Skills', status: 'missing', details: 'No skills listed' }); missing.push({ section: 'Skills', priority: 'medium', reason: 'Skills help appear in search results' }); }

    if (resume.projects.length > 0) { score += 10; health.push({ section: 'Projects', status: resume.projects.length >= 3 ? 'strong' : 'good', details: `${resume.projects.length} projects` }); strengths.push({ title: 'Project Portfolio', category: 'Portfolio', description: `${resume.projects.length} projects demonstrating practical skills`, impact: 'high', score: Math.min(100, resume.projects.length * 20 + 30), evidence: resume.projects.slice(0, 3).map(p => p.name) }); }
    else { health.push({ section: 'Projects', status: 'missing', details: 'No projects featured' }); missing.push({ section: 'Projects', priority: 'high', reason: 'Projects demonstrate practical abilities' }); }

    if (resume.certifications.length > 0) { score += 8; health.push({ section: 'Certifications', status: 'strong', details: `${resume.certifications.length} certifications` }); strengths.push({ title: 'Industry Certifications', category: 'Credentials', description: `${resume.certifications.length} certifications validating expertise`, impact: 'high', score: Math.min(100, resume.certifications.length * 25), evidence: resume.certifications.map(c => c.name) }); }
    else { health.push({ section: 'Certifications', status: 'missing', details: 'No certifications' }); missing.push({ section: 'Certifications', priority: 'medium', reason: 'Certifications validate expertise' }); improvements.push({ title: 'Add Certifications', priority: 'medium', impact: 'Build trust and credibility', effort: '20 mins', description: 'Add industry-recognized certifications to your profile' }); }

    if (github.connected) { score += 12; health.push({ section: 'GitHub', status: github.publicRepos >= 5 ? 'strong' : 'good', details: `${github.publicRepos} repos, ${github.totalStars} stars` }); strengths.push({ title: 'Active GitHub Profile', category: 'Technical', description: `${github.publicRepos} repositories with ${github.totalStars} total stars`, impact: 'high', score: Math.min(100, github.publicRepos * 10 + github.totalStars * 2), evidence: github.topRepos.slice(0, 3).map(r => `${r.name} (${r.stars} stars)`) }); }
    else { health.push({ section: 'GitHub', status: 'missing', details: 'GitHub not connected' }); missing.push({ section: 'GitHub', priority: 'medium', reason: 'GitHub showcases technical work' }); improvements.push({ title: 'Connect GitHub', priority: 'medium', impact: 'Enable technical content suggestions', effort: '5 mins', description: 'Link your GitHub to unlock AI-powered content suggestions' }); }

    health.push({ section: 'Profile Photo', status: 'good', details: 'Profile photo present' });

    if (linkedin.experience.length > 0) {
      const topExp = linkedin.experience[0];
      contentOpps.push({ topic: `${topExp.title} Lessons`, reason: `Share insights from your role as ${topExp.title}`, engagementScore: 75, pillar: 'Career Growth' });
    }
    if (resume.projects.length > 0) {
      contentOpps.push({ topic: `${resume.projects[0].name} Deep Dive`, reason: 'Technical breakdown of building this project', engagementScore: 80, pillar: 'Technical' });
    }
    if (github.connected && github.topRepos.length > 0) {
      contentOpps.push({ topic: 'Open Source Journey', reason: 'Share what you learned building in public', engagementScore: 70, pillar: 'Open Source' });
    }
    if (resume.skills.some(s => /machine.?learning|ai|deep.?learning/i.test(s))) {
      contentOpps.push({ topic: 'AI/ML Project Walkthrough', reason: 'Technical deep dive into AI projects', engagementScore: 90, pillar: 'AI & Machine Learning' });
    }
    if (linkedin.experience.length >= 2) {
      contentOpps.push({ topic: 'Career Growth Timeline', reason: 'Share your career progression and lessons', engagementScore: 75, pillar: 'Career Growth' });
    }

    if (github.connected) pillars.push({ name: 'Technical Deep Dives', description: 'Share technical insights from your projects', score: 70, topics: github.languages.slice(0, 4), authorityScore: 65, engagementPotential: 80, careerAlignment: 85 });
    if (linkedin.experience.length > 0) pillars.push({ name: 'Career Growth', description: 'Share your professional journey and lessons', score: 65, topics: ['Career Advice', 'Lessons Learned', 'Professional Growth'], authorityScore: 55, engagementPotential: 75, careerAlignment: 80 });
    if (resume.projects.length > 0) pillars.push({ name: 'Building in Public', description: 'Share your project building process', score: 60, topics: ['Projects', 'Development', 'Learning'], authorityScore: 50, engagementPotential: 80, careerAlignment: 70 });
    if (pillars.length < 3) pillars.push({ name: 'Industry Insights', description: 'Share trends and insights from your field', score: 50, topics: ['Trends', 'Analysis', 'Best Practices'], authorityScore: 45, engagementPotential: 65, careerAlignment: 65 });

    quickWins.push({ action: 'Complete your About section', impact: 'Increase profile views by 40%', effort: '20 mins', category: 'Profile' });
    if (!linkedin.headline || linkedin.headline.length < 30) quickWins.push({ action: 'Optimize your headline', impact: 'Appear in more search results', effort: '10 mins', category: 'Profile' });
    if (resume.projects.length === 0) quickWins.push({ action: 'Add your top projects', impact: 'Demonstrate practical skills', effort: '30 mins', category: 'Portfolio' });
    if (linkedin.skills.length < 10) quickWins.push({ action: 'Add 10+ relevant skills', impact: 'Improve discoverability', effort: '10 mins', category: 'Skills' });

    const summary = `${firstName} is a professional${resume.currentRole ? ` working as ${resume.currentRole}` : resume.totalExperienceYears > 0 ? ` with ${resume.totalExperienceYears} years of experience` : ''}. ` +
      (linkedin.connected ? `LinkedIn profile is connected with ${linkedin.experience.length} positions and ${linkedin.skills.length} skills. ` : 'LinkedIn profile is not yet connected. ') +
      (github.connected ? `GitHub has ${github.publicRepos} repositories with ${github.totalStars} stars using ${github.languages.slice(0, 3).join(', ') || 'various languages'}. ` : '') +
      (strengths.length > 0 ? `Key strengths: ${strengths.slice(0, 2).map(s => s.title.toLowerCase()).join(' and ')}. ` : '') +
      (missing.length > 0 ? `Missing: ${missing.slice(0, 2).map(m => m.section.toLowerCase()).join(' and ')}. ` : '') +
      `Recommended content focus: ${pillars.slice(0, 2).map(p => p.name.toLowerCase()).join(' and ')}.`;

    return {
      profileScore: Math.min(100, score),
      profileHealth: health,
      strengths,
      weaknesses,
      missingSections: missing,
      improvements,
      contentOpportunities: contentOpps,
      contentPillars: pillars,
      quickWins,
      voiceProfile: { tone: 'Professional', style: 'Story-driven', storytelling: 'Experience-based', vocabulary: [], hooks: [], ctas: [] },
      brandDNA: { archetype: 'The Creator', positioning: `${firstName}'s Professional Brand`, targetAudience: 'Tech professionals and recruiters', uniqueValueProposition: 'Building innovative solutions' },
      aiSummary: summary,
    };
  }
}

export const aiAnalyzer = new AIAnalyzer();
