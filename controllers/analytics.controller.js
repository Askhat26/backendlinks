const mongoose = require("mongoose");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const Link = require("../models/Link");

/** GET /api/analytics/overview */
async function getOverview(req, res, next) {
  try {
    const userId = req.user.id;

    const [views, clicks, qrScans, linkCount] = await Promise.all([
      AnalyticsEvent.countDocuments({ user: userId, event_type: "view" }),
      AnalyticsEvent.countDocuments({ user: userId, event_type: "click" }),
      AnalyticsEvent.countDocuments({ user: userId, event_type: "qr_scan" }),
      Link.countDocuments({ user: userId }),
    ]);

    res.json({
      total_views: views,
      total_clicks: clicks,
      total_qr_scans: qrScans,
      total_links: linkCount,
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/chart?range=7d|4w|6m */
async function getChartData(req, res, next) {
  try {
    const range = req.query.range || "7d";
    const userId = new mongoose.Types.ObjectId(req.user.id);

    let days;
    switch (range) {
      case "4w":
        days = 28;
        break;
      case "6m":
        days = 180;
        break;
      default:
        days = 7;
        break;
    }

    const from = new Date();
    from.setDate(from.getDate() - days);

    const result = await AnalyticsEvent.aggregate([
      {
        $match: {
          user: userId,
          created_at: { $gte: from },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
          },
          views: {
            $sum: {
              $cond: [{ $eq: ["$event_type", "view"] }, 1, 0],
            },
          },
          clicks: {
            $sum: {
              $cond: [{ $eq: ["$event_type", "click"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          views: 1,
          clicks: 1,
        },
      },
    ]);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/top-links */
async function getTopLinks(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const result = await AnalyticsEvent.aggregate([
      {
        $match: {
          user: userId,
          event_type: "click",
          link: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$link",
          clicks: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "links",
          localField: "_id",
          foreignField: "_id",
          as: "linkDoc",
        },
      },
      { $unwind: "$linkDoc" },
      {
        $project: {
          _id: 0,
          title: "$linkDoc.title",
          url: "$linkDoc.url",
          clicks: 1,
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
    ]);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** GET /api/analytics/sources */
async function getSources(req, res, next) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const result = await AnalyticsEvent.aggregate([
      {
        $match: {
          user: userId,
          event_type: "view",
        },
      },
      {
        $addFields: {
          source: {
            $cond: [
              {
                $or: [
                  { $eq: ["$referrer", null] },
                  { $eq: ["$referrer", ""] },
                ],
              },
              "Direct",
              "$referrer",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 6 },
      {
        $project: {
          _id: 0,
          source: "$_id",
          count: 1,
        },
      },
    ]);

    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getChartData,
  getTopLinks,
  getSources,
};