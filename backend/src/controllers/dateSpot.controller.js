import mongoose from 'mongoose';
import { Location } from '../models/appointments.model.js';

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const getDateSpots = async (req, res) => {
  try {
    const { search = '', category, budget } = req.query;
    const page = parsePositiveNumber(req.query.page, 1);
    const limit = Math.min(parsePositiveNumber(req.query.limit, 12), 50);
    const skip = (page - 1) * limit;

    const match = {};
    if (category && category !== 'all') {
      match.category = category;
    }

    if (budget != null && budget !== '') {
      const parsedBudget = Number(budget);
      if (!Number.isFinite(parsedBudget)) {
        return res.status(400).json({ message: 'Invalid budget' });
      }
      match.averagePrice = { $lte: parsedBudget };
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      match.$or = [
        { name: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'reviews',
          let: { locationId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$locationId', '$$locationId'] },
                    { $eq: ['$status', 'published'] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
              },
            },
          ],
          as: 'reviewStats',
        },
      },
      {
        $addFields: {
          averageRating: {
            $ifNull: [{ $arrayElemAt: ['$reviewStats.averageRating', 0] }, 0],
          },
          totalReviews: {
            $ifNull: [{ $arrayElemAt: ['$reviewStats.totalReviews', 0] }, 0],
          },
        },
      },
      {
        $project: {
          reviewStats: 0,
        },
      },
      { $sort: { averageRating: -1, totalReviews: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const [items, total] = await Promise.all([
      Location.aggregate(pipeline),
      Location.countDocuments(match),
    ]);

    return res.status(200).json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
};

export const getDateSpotReviews = async (req, res) => {
  try {
    const { locationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({ message: 'Invalid location id' });
    }

    const reviews = await mongoose.connection.collection('reviews')
      .aggregate([
        {
          $match: {
            locationId: new mongoose.Types.ObjectId(locationId),
            status: 'published',
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
      ])
      .toArray();

    return res.status(200).json(reviews);
  } catch (err) {
    return res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
  }
};
