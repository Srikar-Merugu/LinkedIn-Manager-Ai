import mongoose from 'mongoose';
import pino from 'pino';
import { CopilotMemory, MemoryType, MemorySource } from '../../models/ai-manager/CopilotMemory';

const logger = pino();

const MAX_HISTORY_MESSAGES = 50;

export class MemoryEngine {
  async remember(userId: string, type: MemoryType, key: string, value: any, context: string = '', source: MemorySource = 'conversation', confidence: number = 0.5): Promise<void> {
    const uid = new mongoose.Types.ObjectId(userId);

    await CopilotMemory.findOneAndUpdate(
      { userId: uid, type, key },
      {
        $set: { value, context, confidence, source, lastReferenced: new Date(), isActive: true },
        $inc: { referenceCount: 1 },
      },
      { upsert: true, new: true },
    );

    logger.debug({ type, key }, 'Memory saved');
  }

  async recall(userId: string, type?: MemoryType, key?: string): Promise<any[]> {
    const uid = new mongoose.Types.ObjectId(userId);
    const filter: any = { userId: uid, isActive: true };
    if (type) filter.type = type;
    if (key) filter.key = { $regex: key, $i: true };

    const memories = await CopilotMemory.find(filter).sort({ confidence: -1, lastReferenced: -1 }).limit(20).lean();
    return memories;
  }

  async forget(userId: string, key: string): Promise<void> {
    const uid = new mongoose.Types.ObjectId(userId);
    await CopilotMemory.updateMany({ userId: uid, key: { $regex: key, $i: true } }, { $set: { isActive: false } });
  }

  async getRelevantContext(userId: string, keywords: string[]): Promise<string> {
    const memories = await this.recall(userId);
    const relevant = memories.filter(m => keywords.some(k => m.key.toLowerCase().includes(k) || m.context.toLowerCase().includes(k)));

    if (relevant.length === 0) return '';

    return relevant.map(m => `[${m.type}] ${m.key}: ${typeof m.value === 'string' ? m.value : JSON.stringify(m.value)}`).join('\n');
  }

  async trackMessage(userId: string, sessionId: string, role: string, content: string, intent?: string): Promise<void> {
    if (role === 'user' && intent) {
      await this.remember(userId, 'pattern', `intent:${intent}`, { count: 1, lastMessage: content.substring(0, 200) }, `User asked about ${intent}`, 'conversation', 0.6);
    }
  }

  async learnFromFeedback(userId: string, recommendationId: string, rating: number, comment?: string): Promise<void> {
    await this.remember(
      userId, 'feedback', `recommendation:${recommendationId}`,
      { rating, comment, timestamp: new Date() },
      comment || `User rated recommendation ${rating}/5`,
      'feedback', rating / 5,
    );
  }

  async getRecentHistory(sessionId: string, limit: number = 10): Promise<any[]> {
    const { ConversationHistory } = require('../../models/ai-manager/ConversationHistory');
    return ConversationHistory.find({ sessionId: new mongoose.Types.ObjectId(sessionId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export const memoryEngine = new MemoryEngine();
