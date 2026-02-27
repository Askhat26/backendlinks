// controllers/adminUsers.controller.js
const mongoose = require("mongoose");
const User = require("../models/User");
const Profile = require("../models/Profile");
const Link = require("../models/Link");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("../utils/activityLog");

// GET /api/admin/users
// Query: ?q=search&page=1&limit=20
async function listUsers(req, res, next) {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (q) {
      const regex = new RegExp(String(q), "i");
      filter.$or = [
        { email: regex },
        { full_name: regex },
        { username: regex },
      ];
    }

    const pageNum = Number(page) || 1;
    const pageSize = Number(limit) || 20;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      total,
      page: pageNum,
      pageSize,
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        full_name: u.full_name,
        username: u.username,
        role: u.role,
        status: u.status,
        created_at: u.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id
async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const [user, profile, linksCount, views, clicks] = await Promise.all([
      User.findById(id).lean(),
      Profile.findOne({ user: id }).lean(),
      Link.countDocuments({ user: id }),
      AnalyticsEvent.countDocuments({ user: id, event_type: "view" }),
      AnalyticsEvent.countDocuments({ user: id, event_type: "click" }),
    ]);

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      plan: user.plan,
      plan_status: user.plan_status,
      plan_renewal_date: user.plan_renewal_date,
      profile: {
        bio: profile?.bio || "",
        location: profile?.location || "",
        avatar_url: profile?.avatar_url || "",
      },
      stats: {
        links: linksCount,
        views,
        clicks,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id/status
// body: { status: "active" | "suspended" }
async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res
        .status(400)
        .json({ error: 'Status must be "active" or "suspended"' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/users/:id/plan
// body: { plan: string, plan_status?: string, plan_renewal_date?: string | null }
async function updateUserPlan(req, res, next) {
  try {
    const { id } = req.params;
    const { plan, plan_status, plan_renewal_date } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    if (!plan || typeof plan !== "string") {
      return res
        .status(400)
        .json({ error: "plan (string) is required, e.g. 'Pro 2025'" });
    }

    const updates = { plan: plan.trim() };

    if (plan_status !== undefined) {
      const allowed = ["active", "past_due", "canceled", "trialing"];
      if (!allowed.includes(plan_status)) {
        return res.status(400).json({ error: "Invalid plan_status" });
      }
      updates.plan_status = plan_status;
    }

    if (plan_renewal_date !== undefined) {
      if (!plan_renewal_date) {
        updates.plan_renewal_date = null;
      } else {
        const d = new Date(plan_renewal_date);
        if (Number.isNaN(d.getTime())) {
          return res.status(400).json({ error: "Invalid plan_renewal_date" });
        }
        updates.plan_renewal_date = d;
      }
    }

    const existing = await User.findById(id).lean();
    if (!existing) return res.status(404).json({ error: "User not found" });

    const prevPlan = existing.plan || "Free";

    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean();

    // Log upgrade if moving from a "free"-like plan to something else
    if (
      user &&
      prevPlan.toLowerCase().includes("free") &&
      !user.plan.toLowerCase().includes("free")
    ) {
      await logActivity(user._id, "plan_upgraded", "Plan upgraded", {
        from: prevPlan,
        to: user.plan,
        plan_status: user.plan_status,
        plan_renewal_date: user.plan_renewal_date,
      });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      plan: user.plan,
      plan_status: user.plan_status,
      plan_renewal_date: user.plan_renewal_date,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id/activity?limit=5
async function getUserActivity(req, res, next) {
  try {
    const { id } = req.params;
    const limit = Number(req.query.limit) || 5;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const logs = await ActivityLog.find({ user: id })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    res.json(
      logs.map((l) => ({
        id: l._id.toString(),
        type: l.type,
        message: l.message,
        created_at: l.created_at,
        metadata: l.metadata,
      }))
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUserDetail,
  updateUserStatus,
  updateUserPlan,
  getUserActivity,
};