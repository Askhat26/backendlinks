// controllers/public.controller.js
const User = require("../models/User");
const Profile = require("../models/Profile");
const Link = require("../models/Link");
const AppearanceSettings = require("../models/AppearanceSettings");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const { logActivity } = require("../utils/activityLog");

/**
 * GET /api/public/:username
 * No auth required — serves the public link page.
 * Also records a 'view' event and logs when reaching 1,000 views.
 */
async function getPublicPage(req, res, next) {
  try {
    const { username } = req.params;

    // Find user by username (lowercased)
    const user = await User.findOne({ username: username.toLowerCase() })
      .select("_id full_name username")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "Page not found" });
    }

    const userId = user._id;

    const [profile, links, appearance] = await Promise.all([
      Profile.findOne({ user: userId })
        .select("bio location avatar_url")
        .lean(),
      Link.find({ user: userId, enabled: true })
        .sort({ position: 1 })
        .select("_id title url")
        .lean(),
      AppearanceSettings.findOne({ user: userId }).lean(),
    ]);

    // Record page view
    await AnalyticsEvent.create({
      user: userId,
      event_type: "view",
      referrer: req.headers.referer || "",
      user_agent: req.headers["user-agent"] || "",
      ip_address: req.ip || "",
    });

    // Check if reached 1,000 views
    const viewsCount = await AnalyticsEvent.countDocuments({
      user: userId,
      event_type: "view",
    });
    if (viewsCount === 1000) {
      await logActivity(
        userId,
        "reached_1000_views",
        "Profile reached 1,000 views",
        { views: viewsCount }
      );
    }

    res.json({
      profile: {
        id: userId.toString(),
        full_name: user.full_name,
        username: user.username,
        bio: profile?.bio || "",
        location: profile?.location || "",
        avatar_url: profile?.avatar_url || "",
      },
      links: links.map((l) => ({
        id: l._id.toString(),
        title: l.title,
        url: l.url,
      })),
      appearance: appearance || {},
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/public/:username/click
 * Records a link click event.
 */
async function recordClick(req, res, next) {
  try {
    const { username } = req.params;
    const { link_id } = req.body;

    const user = await User.findOne({ username: username.toLowerCase() })
      .select("_id")
      .lean();

    if (!user) {
      return res.status(404).json({ error: "Page not found" });
    }

    await AnalyticsEvent.create({
      user: user._id,
      link: link_id,
      event_type: "click",
      referrer: req.headers.referer || "",
      user_agent: req.headers["user-agent"] || "",
      ip_address: req.ip || "",
    });

    res.json({ message: "Click recorded" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPublicPage, recordClick };