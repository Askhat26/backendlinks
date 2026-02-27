const User = require("../models/User");
const Link = require("../models/Link");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const Coupon = require("../models/Coupon");

// GET /api/admin/overview
// Basic global stats for admin dashboard
async function getOverview(req, res, next) {
  try {
    const [users, links, events, coupons] = await Promise.all([
      User.countDocuments(),
      Link.countDocuments(),
      AnalyticsEvent.countDocuments(),
      Coupon.countDocuments(),
    ]);

    const [views, clicks, qrScans] = await Promise.all([
      AnalyticsEvent.countDocuments({ event_type: "view" }),
      AnalyticsEvent.countDocuments({ event_type: "click" }),
      AnalyticsEvent.countDocuments({ event_type: "qr_scan" }),
    ]);

    res.json({
      totals: {
        users,
        links,
        events,
        coupons,
      },
      analytics: {
        total_views: views,
        total_clicks: clicks,
        total_qr_scans: qrScans,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/coupons
async function getCoupons(req, res, next) {
  try {
    const coupons = await Coupon.find().sort({ created_at: -1 }).lean();
    res.json(
      coupons.map((c) => ({
        id: c._id.toString(),
        code: c.code,
        discount_percent: c.discount_percent,
        expires_at: c.expires_at,
        is_active: c.is_active,
        created_at: c.created_at,
      }))
    );
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/coupons
// body: { code, discountPercent, expiresAt }
async function createCoupon(req, res, next) {
  try {
    let { code, discountPercent, expiresAt } = req.body;
    if (!code || !discountPercent || !expiresAt) {
      return res
        .status(400)
        .json({ error: "code, discountPercent and expiresAt are required" });
    }

    code = String(code).toUpperCase().trim();
    discountPercent = Number(discountPercent);
    const expiresDate = new Date(expiresAt);

    if (
      !Number.isFinite(discountPercent) ||
      discountPercent < 1 ||
      discountPercent > 100
    ) {
      return res
        .status(400)
        .json({ error: "discountPercent must be between 1 and 100" });
    }

    if (Number.isNaN(expiresDate.getTime()) || expiresDate <= new Date()) {
      return res
        .status(400)
        .json({ error: "expiresAt must be a future date/time" });
    }

    const existing = await Coupon.findOne({ code });
    if (existing) {
      return res.status(409).json({ error: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code,
      discount_percent: discountPercent,
      expires_at: expiresDate,
      is_active: true,
      created_by: req.user.id,
    });

    res.status(201).json({
      id: coupon._id.toString(),
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      expires_at: coupon.expires_at,
      is_active: coupon.is_active,
      created_at: coupon.created_at,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/coupons/:id
// body: { discountPercent?, expiresAt?, isActive? }
async function updateCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const { discountPercent, expiresAt, isActive } = req.body;

    const updates = {};

    if (discountPercent !== undefined) {
      const dp = Number(discountPercent);
      if (!Number.isFinite(dp) || dp < 1 || dp > 100) {
        return res
          .status(400)
          .json({ error: "discountPercent must be between 1 and 100" });
      }
      updates.discount_percent = dp;
    }

    if (expiresAt !== undefined) {
      const d = new Date(expiresAt);
      if (Number.isNaN(d.getTime()) || d <= new Date()) {
        return res
          .status(400)
          .json({ error: "expiresAt must be a future date/time" });
      }
      updates.expires_at = d;
    }

    if (isActive !== undefined) {
      updates.is_active = !!isActive;
    }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    res.json({
      id: coupon._id.toString(),
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      expires_at: coupon.expires_at,
      is_active: coupon.is_active,
      created_at: coupon.created_at,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/coupons/:id
async function deleteCoupon(req, res, next) {
  try {
    const { id } = req.params;
    const result = await Coupon.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};