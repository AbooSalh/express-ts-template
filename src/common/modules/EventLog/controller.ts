import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import EventLog from "./model";
import ApiSuccess from "@/common/utils/api/ApiSuccess";
import { ApiFeatures } from "@/common/utils/api/ApiFeatures";
import { sanitizeMongooseData } from "@/common/utils/sanitizeData";

export const EventLogC = {
  // Get all events with filtering and pagination
  getAll: {
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const apiFeatures = new ApiFeatures(EventLog.find(), req.query as any);
      apiFeatures.filter().sort().limitFields().paginate();

      const events = await apiFeatures.mongooseQuery;
      const total = await EventLog.countDocuments(apiFeatures.queryParams);

      ApiSuccess.send(res, "OK", "Events retrieved successfully", {
        events: sanitizeMongooseData(events),
        total,
        page: apiFeatures.pagination.currentPage,
        limit: apiFeatures.pagination.limit,
        totalPages: apiFeatures.pagination.totalPages,
      });
    }),
    validator: [],
  },

  // Get analytics summary
  getAnalytics: {
    handler: expressAsyncHandler(async (req: Request, res: Response) => {
      const { model, type, tourId } = req.query;

      let matchQuery: any = {};
      if (model) matchQuery.refModel = model;
      if (type) matchQuery.type = type;
      if (tourId) {
        matchQuery.refModel = "Tour";
        matchQuery.refId = tourId;
      }

      const analytics = await EventLog.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              refModel: "$refModel",
              refId: "$refId",
              type: "$type",
            },
            totalViews: { $sum: "$viewCount" }, // Sum of all view counts
            uniqueIPs: { $addToSet: "$ip" },
            countries: { $addToSet: "$country" },
            lastViewed: { $max: "$lastViewedAt" },
            firstViewed: { $min: "$createdAt" },
            eventCount: { $sum: 1 }, // Number of unique IP/user combinations
          },
        },
        {
          $group: {
            _id: "$_id.type",
            totalViews: { $sum: "$totalViews" },
            uniqueDocuments: { $addToSet: "$_id.refId" },
            uniqueIPs: { $addToSet: { $size: "$uniqueIPs" } },
            countries: { $addToSet: "$countries" },
            eventCount: { $sum: "$eventCount" },
            avgViewsPerIP: { $avg: "$totalViews" },
          },
        },
        {
          $project: {
            type: "$_id",
            totalViews: 1,
            uniqueDocuments: { $size: "$uniqueDocuments" },
            uniqueIPs: { $sum: "$uniqueIPs" },
            countries: { $size: { $setUnion: "$countries" } },
            eventCount: 1,
            avgViewsPerIP: { $round: ["$avgViewsPerIP", 2] },
          },
        },
      ]);

      ApiSuccess.send(res, "OK", "Analytics retrieved successfully", {
        analytics: sanitizeMongooseData(analytics),
      });
    }),
    validator: [],
  },
};

export default EventLogC;
