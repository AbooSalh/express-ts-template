import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventLog } from './event-log.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class EventLogService {
  constructor(
    @InjectModel(EventLog)
    private eventLogModel: Model<EventLog>,
  ) {}

  async findAll(query: any): Promise<{ events: EventLog[]; total: number; page: number; limit: number }> {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};
    if (query.refModel) filter.refModel = query.refModel;
    if (query.type) filter.type = query.type;
    if (query.refId) filter.refId = new ObjectId(query.refId);

    const [events, total] = await Promise.all([
      this.eventLogModel.find({
        where: filter,
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      }),
      this.eventLogModel.count(filter),
    ]);

    return {
      events,
      total,
      page,
      limit,
    };
  }

  async getAnalytics(query: any): Promise<any> {
    const { model, type, tourId } = query;

    const matchQuery: any = {};
    if (model) matchQuery.refModel = model;
    if (type) matchQuery.type = type;
    if (tourId) {
      matchQuery.refModel = 'Tour';
      matchQuery.refId = new ObjectId(tourId);
    }

    const analytics = await this.eventLogModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            refModel: '$refModel',
            refId: '$refId',
            type: '$type',
          },
          totalViews: { $sum: '$viewCount' },
          uniqueIPs: { $addToSet: '$ip' },
          countries: { $addToSet: '$country' },
          lastViewed: { $max: '$lastViewedAt' },
          firstViewed: { $min: '$createdAt' },
          eventCount: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.type',
          totalViews: { $sum: '$totalViews' },
          uniqueDocuments: { $addToSet: '$_id.refId' },
          uniqueIPs: { $addToSet: { $size: '$uniqueIPs' } },
          countries: { $addToSet: '$countries' },
          eventCount: { $sum: '$eventCount' },
          avgViewsPerIP: { $avg: '$totalViews' },
        },
      },
      {
        $project: {
          type: '$_id',
          totalViews: 1,
          uniqueDocuments: { $size: '$uniqueDocuments' },
          uniqueIPs: { $sum: '$uniqueIPs' },
          countries: { $size: { $setUnion: '$countries' } },
          eventCount: 1,
          avgViewsPerIP: { $round: ['$avgViewsPerIP', 2] },
        },
      },
    ]).toArray();

    return { analytics };
  }
}
