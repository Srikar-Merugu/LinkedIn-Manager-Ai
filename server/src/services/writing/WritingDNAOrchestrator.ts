import mongoose from 'mongoose';
import pino from 'pino';
import { WritingDNA, IWritingDNA } from '../../models/writing/WritingDNA';
import { WritingSnapshot } from '../../models/writing/WritingSnapshot';

import { vocabularyAnalysisEngine } from './engines/VocabularyAnalysisEngine';
import { sentenceStructureEngine } from './engines/SentenceStructureEngine';
import { toneDetectionEngine } from './engines/ToneDetectionEngine';
import { storytellingEngine } from './engines/StorytellingEngine';
import { contentFormatEngine } from './engines/ContentFormatEngine';
import { emotionalIntelligenceEngine } from './engines/EmotionalIntelligenceEngine';

const logger = pino();

export interface WritingDNAResult {
  dna: IWritingDNA;
  snapshot: any;
}

export class WritingDNAOrchestrator {

  async generate(
    userId: string,
    texts: string[],
    profileId?: string
  ): Promise<WritingDNAResult> {
    const validTexts = texts.filter(t => t && t.trim().length > 50);
    if (validTexts.length < 3) {
      throw new Error(`Need at least 3 writing samples (got ${validTexts.length})`);
    }

    logger.info({ userId, sampleCount: validTexts.length }, 'Generating Writing DNA');

    const vocabulary = vocabularyAnalysisEngine.analyze(validTexts);
    const structure = sentenceStructureEngine.analyze(validTexts);
    const tone = toneDetectionEngine.analyze(validTexts);
    const storytelling = storytellingEngine.analyze(validTexts);
    const formats = contentFormatEngine.analyze(validTexts);
    const emotion = emotionalIntelligenceEngine.analyze(validTexts);

    const totalWords = validTexts.join(' ').split(/\s+/).filter(Boolean).length;
    const sampleCount = validTexts.length;
    const confidence = Math.min(sampleCount / 10, 1);

    const voiceSignature = this.generateVoiceSignature(tone, storytelling, formats);
    const commStyle = this.generateCommunicationStyle(tone, structure, emotion);
    const rules = this.generateWritingRules(vocabulary, structure, tone, storytelling);

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const profileObjectId = profileId ? new mongoose.Types.ObjectId(profileId) : undefined;

    const existing = await WritingDNA.findOne({ userId: userObjectId, isActive: true });

    const dnaData: Partial<IWritingDNA> = {
      userId: userObjectId,
      profileId: profileObjectId,
      version: existing ? existing.version + 1 : 1,
      voiceSignature,
      communicationStyle: commStyle,
      overallConfidence: confidence,
      vocabularyProfile: vocabulary,
      toneProfile: tone,
      structureProfile: structure,
      hooks: storytelling.hooks,
      ctas: storytelling.ctas,
      formatPreferences: formats,
      storytellingBlueprint: storytelling.blueprint,
      emotionalProfile: emotion,
      writingRules: rules,
      sampleCount,
      totalWordsAnalyzed: totalWords,
      lastAnalyzedAt: new Date(),
      isActive: true,
    };

    let dna: IWritingDNA;
    if (existing) {
      Object.assign(existing, dnaData);
      dna = await existing.save();
      logger.info({ userId, version: dna.version }, 'Updated existing Writing DNA');
    } else {
      dna = await WritingDNA.create(dnaData);
      logger.info({ userId, id: dna._id }, 'Created new Writing DNA');
    }

    const snapshot = await WritingSnapshot.create({
      userId: userObjectId,
      writingDnaId: dna._id,
      version: dna.version,
      snapshot: JSON.parse(JSON.stringify(dna.toObject())),
      reason: 'Full Writing DNA analysis',
      trigger: 'full_analysis',
      sampleCount,
      totalWords,
    });

    return { dna, snapshot };
  }

  private generateVoiceSignature(
    tone: any,
    storytelling: any,
    formats: any[]
  ): string {
    const primaryTone = tone.primary?.toLowerCase() || 'professional';
    const topFormat = formats[0]?.format || 'story';
    const arc = storytelling.blueprint.preferredArc || 'personal journey';

    const toneAdj: Record<string, string> = {
      professional: 'professional',
      educational: 'educator',
      inspirational: 'inspirational',
      technical: 'technical',
      analytical: 'analytical',
      conversational: 'conversational',
      humorous: 'humorous',
      empathetic: 'empathetic',
      authoritative: 'authoritative',
      storytelling: 'storyteller',
    };

    const formatDesc: Record<string, string> = {
      story: 'personal stories and experiences',
      framework: 'structured frameworks and systems',
      educational: 'educational deep dives',
      contrarian: 'contrarian perspectives',
      journey: 'journey documentation',
      career: 'career insights',
      opinion: 'opinion pieces',
      tutorial: 'hands-on tutorials',
      list: 'curated lists',
    };

    const adj = toneAdj[primaryTone] || 'professional';
    const desc = formatDesc[topFormat] || 'personal stories';

    return `${adj.charAt(0).toUpperCase() + adj.slice(1)} ${adj === 'storyteller' ? 'who shares' : 'communicator who uses'} ${desc} with ${arc.toLowerCase()} structure`;
  }

  private generateCommunicationStyle(
    tone: any,
    structure: any,
    emotion: any
  ): string {
    const parts: string[] = [];

    if (tone.primary) parts.push(tone.primary);
    if (emotion.confidence > 0.6) parts.push('confident');
    else if (emotion.humility > 0.6) parts.push('humble');
    if (emotion.empathy > 0.6) parts.push('empathetic');
    if (emotion.optimism > 0.6) parts.push('optimistic');
    if (structure.usesDataPoints > 0.3) parts.push('data-driven');
    if (structure.usesStories > 0.3) parts.push('narrative');

    return [...new Set(parts)].join(', ') || 'professional and authentic';
  }

  private generateWritingRules(
    vocabulary: any,
    structure: any,
    tone: any,
    storytelling: any
  ): string[] {
    const rules: string[] = [];

    if (vocabulary.fillerWords.length > 0) {
      rules.push(`Avoid overusing these filler words: ${vocabulary.fillerWords.slice(0, 3).join(', ')}`);
    }

    if (vocabulary.wordComplexity > 0.7) {
      rules.push('Use technical vocabulary appropriately — your audience expects depth');
    } else {
      rules.push('Keep language accessible and conversational');
    }

    if (structure.preferredParagraphLength === 'short') {
      rules.push('Use short paragraphs (2-3 sentences max) for readability');
    } else if (structure.preferredParagraphLength === 'long') {
      rules.push('Use detailed paragraphs with rich context');
    } else {
      rules.push('Vary paragraph length for rhythm and emphasis');
    }

    if (tone.primary === 'educational') {
      rules.push('Frame insights as teachable moments');
      rules.push('Always explain the "why" behind the "what"');
    }

    if (tone.primary === 'storytelling') {
      rules.push('Open with a hook — personal experience or provocative question');
      rules.push('Deliver one clear lesson per post');
    }

    if (tone.primary === 'conversational') {
      rules.push('Write as if speaking to a friend');
      rules.push('Use natural pauses and conversational transitions');
    }

    if (storytelling.blueprint.usesData) {
      rules.push('Support claims with specific metrics and results');
    }

    if (storytelling.blueprint.usesAnecdotes) {
      rules.push('Lead with personal experience — your stories are your differentiator');
    }

    rules.push('End with an engagement prompt — question, reflection, or invitation');

    return [...new Set(rules)];
  }
}

export const writingDNAOrchestrator = new WritingDNAOrchestrator();
