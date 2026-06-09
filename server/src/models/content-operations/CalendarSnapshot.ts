import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISnapshotEntry {
  calendarEntryId: mongoose.Types.ObjectId;
  date: Date;
  topic: string;
  status: string;
  pillarName: string;
  contentType: string;
  priority: number;
}

export interface ICalendarSnapshot extends Document {
  userId: mongoose.Types.ObjectId;
  strategyId?: mongoose.Types.ObjectId;
  version: number;
  snapshotDate: Date;
  dateRange: { start: Date; end: Date };
  entries: ISnapshotEntry[];
  summary: {
    totalEntries: number;
    byStatus: Record<string, number>;
    byPillar: Record<string, number>;
    publishedCount: number;
    draftCount: number;
    scheduledCount: number;
    coverageDays: number;
  };
  trigger: 'generation' | 'regeneration' | 'opportunity' | 'manual' | 'scheduled';
  previousSnapshotId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const SnapshotEntrySchema = new Schema<ISnapshotEntry>({
  calendarEntryId: { type: Schema.Types.ObjectId, ref: 'ContentCalendar', required: true },
  date: { type: Date, required: true },
  topic: { type: String, required: true },
  status: { type: String, required: true },
  pillarName: { type: String, required: true },
  contentType: { type: String, required: true },
  priority: { type: Number, default: 0 },
}, { _id: false });

const CalendarSnapshotSchema = new Schema<ICalendarSnapshot>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  strategyId: { type: Schema.Types.ObjectId, ref: 'ContentStrategyIntelligence' },
  version: { type: Number, default: 1 },
  snapshotDate: { type: Date, default: Date.now },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  entries: [SnapshotEntrySchema],
  summary: {
    totalEntries: { type: Number, default: 0 },
    byStatus: { type: Schema.Types.Mixed, default: {} },
    byPillar: { type: Schema.Types.Mixed, default: {} },
    publishedCount: { type: Number, default: 0 },
    draftCount: { type: Number, default: 0 },
    scheduledCount: { type: Number, default: 0 },
    coverageDays: { type: Number, default: 0 },
  },
  trigger: { type: String, enum: ['generation', 'regeneration', 'opportunity', 'manual', 'scheduled'], default: 'generation' },
  previousSnapshotId: { type: Schema.Types.ObjectId, ref: 'CalendarSnapshot' },
}, {
  timestamps: true,
  collection: 'calendar_snapshots',
});

CalendarSnapshotSchema.index({ userId: 1, version: -1 });
CalendarSnapshotSchema.index({ snapshotDate: -1 });

export const CalendarSnapshot: Model<ICalendarSnapshot> = mongoose.model<ICalendarSnapshot>('CalendarSnapshot', CalendarSnapshotSchema);
export default CalendarSnapshot;
