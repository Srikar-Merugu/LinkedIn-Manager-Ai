import mongoose, { Model, Document, FilterQuery, UpdateQuery, QueryOptions, PipelineStage } from 'mongoose';
import { PaginationOptions, PaginatedResult } from '../../types/database';

export class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async findById(id: string, options?: QueryOptions): Promise<T | null> {
    return this.model.findById(id, null, options).exec();
  }

  async findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null> {
    return this.model.findOne(filter, null, options).exec();
  }

  async find(
    filter: FilterQuery<T> = {},
    options?: QueryOptions & { sort?: Record<string, 1 | -1>; limit?: number; skip?: number }
  ): Promise<T[]> {
    return this.model.find(filter, null, options).exec();
  }

  async findAll(
    filter: FilterQuery<T> = {},
    options?: QueryOptions
  ): Promise<T[]> {
    return this.model.find(filter, null, options).exec();
  }

  async create(data: Record<string, unknown>): Promise<T> {
    return this.model.create(data as any);
  }

  async updateById(
    id: string,
    update: UpdateQuery<T>,
    options?: QueryOptions
  ): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
      ...options,
    }).exec();
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions
  ): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
      ...options,
    }).exec();
  }

  async upsert(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: QueryOptions
  ): Promise<T> {
    const doc = await this.model.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      runValidators: true,
      ...options,
    }).exec();
    return doc!;
  }

  async deleteById(id: string): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async deleteOne(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.deleteOne(filter).exec();
    return result.deletedCount > 0;
  }

  async deleteMany(filter: FilterQuery<T>): Promise<number> {
    const result = await this.model.deleteMany(filter).exec();
    return result.deletedCount || 0;
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const result = await this.model.exists(filter).exec();
    return result !== null;
  }

  async paginate(
    filter: FilterQuery<T> = {},
    options: PaginationOptions
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sort } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort || { createdAt: -1 } as Record<string, 1 | -1>)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async aggregate(pipeline: PipelineStage[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }

  async bulkCreate(data: Record<string, unknown>[]): Promise<T[]> {
    return this.model.insertMany(data, { ordered: false }) as unknown as Promise<T[]>;
  }

  async bulkUpdate(
    operations: Array<{
      filter: FilterQuery<T>;
      update: UpdateQuery<T>;
    }>
  ): Promise<void> {
    const bulkOps: any[] = operations.map((op) => ({
      updateOne: {
        filter: op.filter,
        update: op.update,
        upsert: true,
      },
    }));
    await this.model.bulkWrite(bulkOps as any);
  }

  async startSession(): Promise<mongoose.ClientSession> {
    return mongoose.startSession();
  }

  protected toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
  }
}
