import mongoose from 'mongoose';
import pino from 'pino';
import { Post, IPost, PostContentType } from '../../models/content-generation/Post';
import { PostVariation, IPostVariation } from '../../models/content-generation/PostVariation';
import { ContentScore, IContentScore } from '../../models/content-generation/ContentScore';
import { VoiceScore, IVoiceScore } from '../../models/content-generation/VoiceScore';
import { ContentReview, IContentReview } from '../../models/content-generation/ContentReview';
import { ContentVersion, IContentVersion } from '../../models/content-generation/ContentVersion';
import { GeneratedDraft } from '../../models/content-generation/GeneratedDraft';

import { storyPostEngine, StoryInput, StoryOutput } from './engines/StoryPostEngine';
import { educationalPostEngine, EducationalInput, EducationalOutput } from './engines/EducationalPostEngine';
import { frameworkPostEngine, FrameworkInput, FrameworkOutput } from './engines/FrameworkPostEngine';
import { contrarianPostEngine, ContrarianInput, ContrarianOutput } from './engines/ContrarianPostEngine';
import { projectBreakdownEngine, ProjectData, ProjectPost } from './engines/ProjectBreakdownEngine';
import { opportunityContentEngine, OpportunityContentInput, ContentVersion as OppContentVersion } from './engines/OpportunityContentEngine';
import { voiceDNAEngine, VoiceProfile, VoiceValidationResult } from './engines/VoiceDNAEngine';
import { brandDNAEngine, BrandProfile, BrandValidationResult } from './engines/BrandDNAEngine';
import { careerAlignmentEngine, CareerAlignmentInput, CareerAlignmentResult } from './engines/CareerAlignmentEngine';
import { contentQualityEngine, QualityInput, QualityResult } from './engines/ContentQualityEngine';
import { linkedInOptimizationEngine, OptimizationInput, OptimizationResult } from './engines/LinkedInOptimizationEngine';
import { postVariationEngine, VariationInput, VariationResult } from './engines/PostVariationEngine';
import { contentScoringEngine, ScoringInput, ScoringResult } from './engines/ContentScoringEngine';
import { contentReviewEngine, ContentReviewInput, ContentReviewResult } from './engines/ContentReviewEngine';
import { contentRegenerationEngine, RegenerationInput, RegenerationOutput, RegenerationParams } from './engines/ContentRegenerationEngine';

const logger = pino();

export interface GenerateInput {
  userId: string;
  topic: string;
  context: string;
  keyInsight: string;
  contentType: PostContentType;
  sourceType: 'calendar' | 'opportunity' | 'manual' | 'strategy' | 'regeneration';
  sourceId?: string;
  sourceDescription: string;
  personalAngle?: string;
  challenge?: string;
  outcome?: string;
  voiceProfile: VoiceProfile;
  brandProfile: BrandProfile;
  careerGoals?: CareerAlignmentInput['careerGoals'];
  currentRole?: string;
  targetRole?: string;
  generationParams?: {
    tone?: string;
    audience?: string;
    goal?: string;
    length?: 'short' | 'medium' | 'long';
    complexity?: 'simple' | 'moderate' | 'complex';
    customPrompt?: string;
  };
}

export interface GeneratedPostResult {
  post: IPost;
  variations: IPostVariation[];
  contentScore: IContentScore;
  voiceScore: IVoiceScore;
  contentReview: IContentReview;
  versions: IContentVersion[];
  brandValidation: BrandValidationResult;
  careerAlignment: CareerAlignmentResult;
  qualityResult: QualityResult;
  optimizationResult: OptimizationResult;
  scoringResult: ScoringResult;
}

export interface GenerationReport {
  success: boolean;
  draftedId?: string;
  post?: IPost;
  variations?: IPostVariation[];
  scores?: {
    voice: IVoiceScore;
    content: IContentScore;
  };
  review?: IContentReview;
  brandValidation?: BrandValidationResult;
  careerAlignment?: CareerAlignmentResult;
  optimization?: OptimizationResult;
  scoring?: ScoringResult;
  generationTime?: number;
  error?: string;
}

export class ContentGenerationOrchestrator {
  async generate(input: GenerateInput): Promise<GenerationReport> {
    const startTime = Date.now();
    logger.info({ topic: input.topic, contentType: input.contentType }, 'Starting content generation pipeline');

    try {
      const userId = new mongoose.Types.ObjectId(input.userId);

      // Step 1: Generate base content using the appropriate engine
      const generatedContent = this.generateContent(input);

      // Step 2: Brand validation
      const brandValidation = brandDNAEngine.validate(
        generatedContent.fullContent, input.topic, input.brandProfile
      );

      // Step 3: Voice DNA validation
      const voiceScore = voiceDNAEngine.validate(generatedContent.fullContent, input.voiceProfile);

      // Step 4: Career alignment
      const careerAlignment = careerAlignmentEngine.evaluate({
        content: generatedContent.fullContent,
        topic: input.topic,
        careerGoals: input.careerGoals || [],
        currentRole: input.currentRole || '',
        targetRole: input.targetRole,
      });

      // Step 5: Content quality
      const qualityResult = contentQualityEngine.evaluate({
        content: generatedContent.fullContent,
        contentType: input.contentType,
        topic: input.topic,
        hook: generatedContent.hook,
        cta: generatedContent.cta,
      });

      // Step 6: LinkedIn optimization
      const optimizationResult = linkedInOptimizationEngine.optimize({
        hook: generatedContent.hook,
        body: generatedContent.body,
        cta: generatedContent.cta,
        contentType: input.contentType,
        topic: input.topic,
      });

      // Step 7: Content scoring
      const scoringResult = contentScoringEngine.score({
        voiceMatchScore: voiceScore.overall,
        careerAlignmentScore: careerAlignment.score,
        qualityScore: qualityResult.overall,
        opportunityScore: Math.round((brandValidation.overallScore + careerAlignment.score) / 2),
        engagementScore: optimizationResult.overall,
        contentType: input.contentType,
        topic: input.topic,
        brandMatchScore: brandValidation.overallScore,
      });

      // Step 8: Content review
      const contentReview = contentReviewEngine.review({
        hook: generatedContent.hook,
        body: generatedContent.body,
        cta: generatedContent.cta,
        fullContent: generatedContent.fullContent,
        contentType: input.contentType,
        topic: input.topic,
      });

      // Step 9: Create post
      const fullContent = generatedContent.fullContent;
      const wordCount = fullContent.split(/\s+/).filter(Boolean).length;
      const estimatedReadTime = Math.max(1, Math.round(wordCount / 200));

      const post = await Post.create({
        userId,
        title: this.generateTitle(input.topic, input.contentType),
        hook: generatedContent.hook,
        body: generatedContent.body,
        cta: generatedContent.cta,
        fullContent,
        contentType: input.contentType,
        source: input.sourceType,
        sourceRef: input.sourceId ? { type: input.sourceType, id: new mongoose.Types.ObjectId(input.sourceId) } : undefined,
        status: contentReview.rewriteSuggested ? 'review' : 'draft',
        tags: [input.contentType, input.sourceType, ...input.topic.split(' ').filter(w => w.length > 3)],
        wordCount,
        estimatedReadTime,
        voiceMatchScore: voiceScore.overall,
        careerAlignmentScore: careerAlignment.score,
        qualityScore: qualityResult.overall,
        overallScore: scoringResult.overall,
        isBestVersion: scoringResult.overall >= 80,
      });

      // Step 10: Create initial version
      await ContentVersion.create({
        postId: post._id,
        userId,
        version: 1,
        title: post.title,
        hook: post.hook,
        body: post.body,
        cta: post.cta,
        fullContent: post.fullContent,
        scores: {
          voice: voiceScore.overall,
          career: careerAlignment.score,
          quality: qualityResult.overall,
          overall: scoringResult.overall,
        },
        changeType: 'created',
        changeDescription: 'Initial AI generation',
        wordCount,
      });

      // Step 11: Save voice score
      const savedVoiceScore = await VoiceScore.create({
        postId: post._id,
        userId,
        vocabularyMatch: voiceScore.vocabularyMatch,
        toneMatch: voiceScore.toneMatch,
        storytellingMatch: voiceScore.storytellingMatch,
        hookMatch: voiceScore.hookMatch,
        ctaMatch: voiceScore.ctaMatch,
        sentenceStructureMatch: Math.round((voiceScore.vocabularyMatch + voiceScore.toneMatch) / 2),
        overall: voiceScore.overall,
        matchDetails: voiceScore.details,
        issues: voiceScore.issues,
      });

      // Step 12: Save content score
      const savedContentScore = await ContentScore.create({
        postId: post._id,
        userId,
        scoreType: 'generation',
        clarity: qualityResult.clarity,
        authenticity: qualityResult.authenticity,
        readability: qualityResult.readability,
        authority: qualityResult.authority,
        uniqueness: qualityResult.uniqueness,
        engagementPotential: qualityResult.engagementPotential,
        dwellTime: optimizationResult.dwellTimeScore,
        commentPotential: optimizationResult.commentScore,
        savePotential: optimizationResult.saveScore,
        sharePotential: optimizationResult.shareScore,
        overall: qualityResult.overall,
        feedback: optimizationResult.issues.map(i => i.suggestion),
        strengths: qualityResult.strengths,
        improvements: qualityResult.improvements,
      });

      // Step 13: Save content review
      const savedContentReview = await ContentReview.create({
        postId: post._id,
        userId,
        issues: contentReview.issues,
        aiScore: contentReview.aiScore,
        humanScore: contentReview.humanScore,
        clicheCount: contentReview.clicheCount,
        aiPhraseCount: contentReview.aiPhraseCount,
        rewriteSuggested: contentReview.rewriteSuggested,
        suggestedRewrites: contentReview.suggestedRewrites,
        overallAssessment: contentReview.overallAssessment,
      });

      // Step 14: Generate variations
      const variations: IPostVariation[] = [];
      if (input.sourceType !== 'regeneration') {
        const variationResults = postVariationEngine.generateThree({
          topic: input.topic,
          context: input.context,
          keyInsight: input.keyInsight,
          voiceProfile: input.voiceProfile,
          contentType: input.contentType,
        });

        for (const vr of variationResults) {
          const vFullContent = `${vr.hook}\n\n${vr.body}\n\n${vr.cta}`;
          const vWordCount = vFullContent.split(/\s+/).filter(Boolean).length;

          const variation = await PostVariation.create({
            postId: post._id,
            userId,
            version: vr.version as 'A' | 'B' | 'C',
            angle: vr.angle,
            hook: vr.hook,
            body: vr.body,
            cta: vr.cta,
            fullContent: vFullContent,
            wordCount: vWordCount,
            scores: {
              voice: voiceScore.overall,
              career: careerAlignment.score,
              quality: qualityResult.overall,
              engagement: optimizationResult.overall,
              overall: scoringResult.overall,
            },
          });

          variations.push(variation);
        }
      }

      // Step 15: Update generated draft record
      const generationTime = Date.now() - startTime;

      const draftRecord = new GeneratedDraft({
        userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId ? new mongoose.Types.ObjectId(input.sourceId) : undefined,
        sourceDescription: input.sourceDescription,
        postId: post._id,
        contentType: input.contentType,
        variations: variations.length,
        status: 'completed',
        generationParams: input.generationParams || {},
        generationTime,
        resultSummary: {
          bestVersion: variations.length > 0 ? 'A' : 'original',
          avgScore: scoringResult.overall,
          variationsGenerated: variations.length,
        },
        completedAt: new Date(),
      });
      await draftRecord.save();

      logger.info({ postId: post._id, generationTime: `${generationTime}ms` }, 'Content generation complete');

      return {
        success: true,
        draftedId: post._id.toString(),
        post: post.toObject(),
        variations,
        scores: { voice: savedVoiceScore, content: savedContentScore },
        review: savedContentReview,
        brandValidation,
        careerAlignment,
        optimization: optimizationResult,
        scoring: scoringResult,
        generationTime,
      };
    } catch (error: any) {
      logger.error({ error }, 'Content generation failed');

      if (input.userId) {
        await GeneratedDraft.create({
          userId: new mongoose.Types.ObjectId(input.userId),
          sourceType: input.sourceType,
          sourceDescription: input.sourceDescription,
          contentType: input.contentType,
          variations: 0,
          status: 'failed',
          generationParams: input.generationParams || {},
          error: error.message,
        });
      }

      return { success: false, error: error.message };
    }
  }

  private generateContent(input: GenerateInput): StoryOutput | EducationalOutput | FrameworkOutput | ContrarianOutput {
    const vp = input.voiceProfile || {};
    const toneRules = Array.isArray(vp.toneRules) ? vp.toneRules : [];
    const vocabularyRules = Array.isArray(vp.vocabularyRules) ? vp.vocabularyRules : [];
    const storytellingRules = Array.isArray(vp.storytellingRules) ? vp.storytellingRules : [];
    const communicationRules = Array.isArray(vp.communicationRules) ? vp.communicationRules : [];

    const topic = input.topic || 'this topic';
    const context = input.context || `Sharing insights about ${topic}`;
    const keyInsight = input.keyInsight || topic;

    const storyVP = { vocabulary: vocabularyRules, tone: toneRules[0] || 'authentic', storytellingStyle: storytellingRules[0] || 'personal' };
    const edVP = { vocabulary: vocabularyRules, tone: toneRules[0] || 'authentic', teachingStyle: communicationRules[0] || 'clear' };
    const fwVP = { vocabulary: vocabularyRules, tone: toneRules[0] || 'authentic', frameworkStyle: communicationRules[0] || 'structured' };
    const ctVP = { vocabulary: vocabularyRules, tone: toneRules[0] || 'authentic', contrarianStyle: storytellingRules[0] || 'provocative' };

    switch (input.contentType) {
      case 'story':
      case 'journey':
      case 'career_lesson': {
        const si: StoryInput = {
          topic,
          context,
          keyInsight,
          personalAngle: input.personalAngle || '',
          challenge: input.challenge || '',
          outcome: input.outcome || '',
          voiceProfile: storyVP,
        };
        return storyPostEngine.generate(si);
      }

      case 'educational':
      case 'case_study': {
        const ei: EducationalInput = {
          topic,
          concept: keyInsight,
          examples: [context],
          actionableAdvice: [
            `Start by understanding the core of ${topic}`,
            `Apply the ${topic} principles in your work`,
            'Measure and reflect on results',
            'Iterate based on feedback',
          ],
          voiceProfile: edVP,
          audienceLevel: 'intermediate',
        };
        return educationalPostEngine.generate(ei);
      }

      case 'framework':
      case 'thought_leadership': {
        const fi: FrameworkInput = {
          topic,
          frameworkName: `The ${topic} Framework`,
          steps: [
            { name: 'Understand', description: `Deep dive into ${topic}` },
            { name: 'Strategize', description: 'Build your approach' },
            { name: 'Execute', description: 'Take consistent action' },
            { name: 'Optimize', description: 'Measure and iterate' },
          ],
          voiceProfile: fwVP,
          outcome: `Master ${topic} with confidence`,
        };
        return frameworkPostEngine.generate(fi);
      }

      case 'contrarian':
      case 'industry_commentary': {
        const ci: ContrarianInput = {
          topic,
          popularBelief: `What most people believe about ${topic}`,
          actualTruth: keyInsight,
          evidence: [context, 'Based on my experience and results'],
          voiceProfile: ctVP,
        };
        return contrarianPostEngine.generate(ci);
      }

      case 'project_breakdown':
      case 'build_in_public':
      case 'founder_update': {
        const projectData: ProjectData = {
          name: topic,
          description: context,
          technologies: [],
          role: input.currentRole || 'developer',
          duration: 'ongoing',
          outcome: input.outcome || keyInsight,
          challenges: input.challenge ? [input.challenge] : [],
          learnings: [keyInsight],
        };
        const posts = projectBreakdownEngine.generateAll(projectData, storyVP);
        const selected = posts[0];
        return { hook: selected.hook, body: selected.body, cta: selected.cta, fullContent: selected.fullContent, storyArc: { setup: '', conflict: '', resolution: '', insight: '' } } as StoryOutput;
      }

      default: {
        const si: StoryInput = {
          topic,
          context,
          keyInsight,
          voiceProfile: storyVP,
        };
        return storyPostEngine.generate(si);
      }
    }
  }

  async regenerate(input: GenerateInput, params: RegenerationParams): Promise<GenerationReport> {
    const generationParams = { ...input.generationParams, ...params };
    return this.generate({ ...input, generationParams, contentType: (params.contentType as PostContentType) || input.contentType, sourceType: 'regeneration' });
  }

  private generateTitle(topic: string, contentType: string): string {
    const prefixes: Record<string, string[]> = {
      story: ['The story of', 'How I', 'What happened when I'],
      educational: ['How to', 'A complete guide to', 'Everything you need to know about'],
      framework: ['My framework for', 'A systematic approach to', 'The complete system for'],
      contrarian: ['Why I stopped', 'The truth about', 'Why most advice about'],
      journey: ['My journey through', 'Lessons from my', 'What I learned from'],
      career_lesson: ['The biggest career lesson from', 'What my career in'],
    };

    const prefixesList = prefixes[contentType] || ['Thoughts on', 'Reflections on'];
    const prefix = prefixesList[Math.floor(Math.random() * prefixesList.length)];
    return `${prefix} ${topic}`;
  }

  async getPost(postId: string): Promise<any> {
    return Post.findById(postId).lean();
  }

  async getPosts(userId: string, options?: { contentType?: string; status?: string; limit?: number }): Promise<any[]> {
    const filter: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (options?.contentType) filter.contentType = options.contentType;
    if (options?.status) filter.status = options.status;
    let query = Post.find(filter).sort({ createdAt: -1 });
    if (options?.limit) query = query.limit(options.limit);
    return query.lean();
  }

  async getPostWithScores(postId: string): Promise<any> {
    const post = await Post.findById(postId).lean();
    if (!post) return null;

    const [scores, voiceScores, reviews, variations, versions] = await Promise.all([
      ContentScore.find({ postId: new mongoose.Types.ObjectId(postId) }).lean(),
      VoiceScore.find({ postId: new mongoose.Types.ObjectId(postId) }).lean(),
      ContentReview.find({ postId: new mongoose.Types.ObjectId(postId) }).lean(),
      PostVariation.find({ postId: new mongoose.Types.ObjectId(postId) }).lean(),
      ContentVersion.find({ postId: new mongoose.Types.ObjectId(postId) }).sort({ version: -1 }).lean(),
    ]);

    return { post, scores, voiceScores, reviews, variations, versions };
  }
}

export const contentGenerationOrchestrator = new ContentGenerationOrchestrator();
