import mongoose from 'mongoose';
import pino from 'pino';
import type { IWritingDNA } from '../../../models/writing/WritingDNA';
import { WritingDNA } from '../../../models/writing/WritingDNA';
import { WritingSnapshot } from '../../../models/writing/WritingSnapshot';

const logger = pino();

export class ContinuousLearningService {

  async incorporateNewContent(
    userId: string,
    newTexts: string[],
    trigger: 'new_post' | 'user_edit' | 'sample_upload' = 'new_post'
  ): Promise<IWritingDNA | null> {
    const dna = await WritingDNA.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    });

    if (!dna) return null;

    const allTexts = [...newTexts];
    const sampleCount = dna.sampleCount + newTexts.length;
    const totalWords = dna.totalWordsAnalyzed + newTexts.join(' ').split(/\s+/).filter(Boolean).length;

    dna.sampleCount = sampleCount;
    dna.totalWordsAnalyzed = totalWords;
    dna.lastAnalyzedAt = new Date();

    if (sampleCount % 5 === 0) {
      dna.overallConfidence = Math.min(dna.overallConfidence + 0.02, 0.95);
    }

    await dna.save();

    const snapshot = await WritingSnapshot.create({
      userId: new mongoose.Types.ObjectId(userId),
      writingDnaId: dna._id,
      version: dna.version,
      snapshot: JSON.parse(JSON.stringify(dna.toObject())),
      reason: `Incorporated ${newTexts.length} new samples via ${trigger}`,
      trigger,
      sampleCount,
      totalWords,
    });

    logger.info({ userId, trigger, sampleCount, totalWords }, 'Writing DNA updated with new content');

    return dna;
  }

  async getLearningHistory(userId: string, limit: number = 10): Promise<any[]> {
    const snapshots = await WritingSnapshot.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('version reason trigger sampleCount totalWords createdAt')
      .lean();

    return snapshots;
  }
}

export const continuousLearningService = new ContinuousLearningService();
