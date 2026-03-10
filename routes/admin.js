const router = require('express').Router();
const crypto = require('crypto');

const User = require('../models/User');
const Link = require('../models/Link');
const Coupon = require('../models/Coupon');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Appearance = require('../models/Appearance');
const Card = require('../models/Card');

const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.use(auth, admin);

/**
 * Helpers
 */
const PLAN_PRICES_INR = { starter: 0, pro: 499, premium: 999 };

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}
function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function isoDay(d) {
  return new Date(d).toISOString().slice(0, 10);
}
function makeDayRange(days) {
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(new Date(Date.now() - i * 86400000));
    arr.push(isoDay(d));
  }
  return arr;
}

/**
 * ─────────────────────────────────────────────────────────────
 * EXISTING (keep working)
 * ─────────────────────────────────────────────────────────────
 */
router.get('/dashboard', async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalLinks = await Link.countDocuments();
  const activeCoupons = await Coupon.countDocuments({ isActive: true });
  const totalQrScans = await AnalyticsEvent.countDocuments({ type: 'qr_scan' });

  res.json({ totalUsers, totalLinks, activeCoupons, totalQrScans });
});

/**
 * Upgraded GET /admin/users (but still backward-compatible)
 *
 * Supports filters:
 *  - q: search name/email/username (contains)
 *  - email, username: exact/contains search
 *  - plan: starter|pro|premium or comma list (e.g. pro,premium)
 *  - from, to: signup date range (ISO)
 *  - status: active|inactive  (based on events in last `activeDays`, default 30)
 *  - activeDays: number (default 30)
 *  - page, limit
 */
router.get('/users', async (req, res) => {
  try {
    const {
      q,
      email,
      username,
      plan,
      from,
      to,
      status,
      activeDays,
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = clamp(Number(page) || 1, 1, 100000);
    const limitNum = clamp(Number(limit) || 50, 1, 200);

    const filter = {};

    // Search (q) across name/email/username
    if (q && String(q).trim()) {
      const re = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: re }, { email: re }, { username: re }];
    }

    // Specific email/username contains match
    if (email && String(email).trim()) {
      const re = new RegExp(String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.email = re;
    }
    if (username && String(username).trim()) {
      const re = new RegExp(String(username).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.username = re;
    }

    // Plan filter
    if (plan) {
      const plans = String(plan)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (plans.length === 1) filter.plan = plans[0];
      else if (plans.length > 1) filter.plan = { $in: plans };
    }

    // Signup date range
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    // Activity status filter based on AnalyticsEvent in last N days
    if (status === 'active' || status === 'inactive') {
      const days = clamp(Number(activeDays) || 30, 1, 365);
      const since = new Date(Date.now() - days * 86400000);
      const activeUserIds = await AnalyticsEvent.distinct('userId', { createdAt: { $gte: since } });

      filter._id = status === 'active'
        ? { $in: activeUserIds }
        : { $nin: activeUserIds };
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error('ADMIN USERS LIST ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Existing toggle-ban (keep as-is)
router.put('/users/:id/ban', async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ error: 'Not found' });
  u.isBanned = !u.isBanned;
  await u.save();
  res.json({ user: { _id: u._id, isBanned: u.isBanned } });
});

// Existing delete (keep as-is)
router.delete('/users/:id', async (req, res) => {
  const userId = req.params.id;
  await User.findByIdAndDelete(userId);
  await Promise.all([
    Link.deleteMany({ userId }),
    Appearance.deleteOne({ userId }),
    Card.deleteOne({ userId }),
    AnalyticsEvent.deleteMany({ userId }),
  ]);
  res.json({ success: true });
});

router.get('/coupons', async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ coupons });
});

router.post('/coupons', async (req, res) => {
  try {
    const { code, discountPercent, maxUses, expiresAt } = req.body;
    if (!code || !discountPercent || !maxUses || !expiresAt) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const c = String(code).toUpperCase();
    if (await Coupon.findOne({ code: c })) return res.status(400).json({ error: 'Code exists' });

    const coupon = await Coupon.create({
      code: c,
      discountPercent,
      maxUses,
      expiresAt: new Date(expiresAt),
      createdBy: req.user._id,
    });

    res.status(201).json({ coupon });
  } catch (err) {
    console.error('ADMIN CREATE COUPON ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/coupons/:id/toggle', async (req, res) => {
  const c = await Coupon.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  c.isActive = !c.isActive;
  await c.save();
  res.json({ coupon: c });
});

router.delete('/coupons/:id', async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/**
 * ─────────────────────────────────────────────────────────────
 * NEW: GLOBAL ADMIN ANALYTICS OVERVIEW
 * GET /admin/analytics/overview?days=30
 * ─────────────────────────────────────────────────────────────
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const days = clamp(Number(req.query.days || 30), 7, 365);
    const since = new Date(Date.now() - days * 86400000);
    const dayRange = makeDayRange(days);

    const today = startOfDay(new Date());
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const monthAgo = new Date(Date.now() - 30 * 86400000);

    const [
      totalUsers,
      totalLinksCreated,
      totalProfileViews,
      totalLinkClicks,
      totalQrScans,
      activeCoupons,
      couponSumAgg,
      newToday,
      newWeek,
      newMonth,
      proCount,
      premiumCount,
    ] = await Promise.all([
      User.countDocuments(),
      Link.countDocuments(),
      AnalyticsEvent.countDocuments({ type: 'profile_view' }),
      AnalyticsEvent.countDocuments({ type: 'link_click' }),
      AnalyticsEvent.countDocuments({ type: 'qr_scan' }),
      Coupon.countDocuments({ isActive: true }),
      Coupon.aggregate([{ $group: { _id: null, total: { $sum: '$usedCount' } } }]),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ createdAt: { $gte: monthAgo } }),
      User.countDocuments({ plan: 'pro' }),
      User.countDocuments({ plan: 'premium' }),
    ]);

    const totalCouponUsage = couponSumAgg?.[0]?.total || 0;

    // Active users = users with any event in last N days
    const activeUserIds = await AnalyticsEvent.distinct('userId', { createdAt: { $gte: since } });
    const activeUsers = activeUserIds.length;

    // Active subscriptions = pro + premium
    const activeSubscriptions = proCount + premiumCount;

    // Estimated MRR (no real payments yet)
    const estimatedMrrInr = (proCount * PLAN_PRICES_INR.pro) + (premiumCount * PLAN_PRICES_INR.premium);

    // User growth chart
    const userGrowthAgg = await User.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, users: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const userGrowthMap = new Map(userGrowthAgg.map(x => [x._id, x.users]));
    const userGrowthDaily = dayRange.map(date => ({ date, users: userGrowthMap.get(date) || 0 }));

    // Traffic chart
    const trafficAgg = await AnalyticsEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type',
          },
          count: { $sum: 1 },
        }
      },
      { $sort: { '_id.date': 1 } },
    ]);

    const trafficMap = {};
    for (const row of trafficAgg) {
      const date = row._id.date;
      const type = row._id.type;
      trafficMap[date] ||= { profile_view: 0, link_click: 0, qr_scan: 0 };
      trafficMap[date][type] = row.count;
    }

    const trafficDaily = dayRange.map(date => ({
      date,
      profileViews: trafficMap[date]?.profile_view || 0,
      linkClicks: trafficMap[date]?.link_click || 0,
      qrScans: trafficMap[date]?.qr_scan || 0,
    }));

    const trafficMix = [
      { name: 'Profile Views', value: totalProfileViews },
      { name: 'Link Clicks', value: totalLinkClicks },
      { name: 'QR Scans', value: totalQrScans },
    ];

    // Revenue placeholder chart until payments exist
    const revenueDaily = dayRange.map(date => ({ date, revenueInr: 0 }));

    return res.json({
      stats: {
        totalUsers,
        activeUsers,
        newSignups: { today: newToday, week: newWeek, month: newMonth },
        totalLinksCreated,
        totalProfileViews,
        totalLinkClicks,
        totalQrScans,

        totalRevenueInr: 0, // real revenue requires storing payments
        estimatedMrrInr,

        activeSubscriptions,
        couponUsage: {
          activeCoupons,
          totalUsage: totalCouponUsage,
        },
      },
      charts: {
        userGrowthDaily,
        trafficDaily,
        trafficMix,
        revenueDaily,
      },
      meta: { days },
    });
  } catch (err) {
    console.error('ADMIN OVERVIEW ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * NEW: ADVANCED USER MANAGEMENT
 * ─────────────────────────────────────────────────────────────
 */

// View single user profile (admin)
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json({ user });
  } catch (err) {
    console.error('ADMIN USER GET ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Suspend/unsuspend explicitly (does not remove existing /ban toggle)
router.patch('/users/:id/suspend', async (req, res) => {
  try {
    const { suspended } = req.body; // boolean expected
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ error: 'suspended(boolean) is required' });
    }

    u.isBanned = suspended;
    await u.save();

    res.json({ user: { _id: u._id, isBanned: u.isBanned } });
  } catch (err) {
    console.error('ADMIN USER SUSPEND ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upgrade/Downgrade plan
router.patch('/users/:id/plan', async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['starter', 'pro', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Not found' });

    u.plan = plan;
    await u.save();

    res.json({ user: { _id: u._id, plan: u.plan } });
  } catch (err) {
    console.error('ADMIN USER PLAN ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password (returns temp password to admin)
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select('+password');
    if (!u) return res.status(404).json({ error: 'Not found' });

    // temp password: 10 chars
    const tempPassword = crypto.randomBytes(8).toString('base64url').slice(0, 10);
    u.password = tempPassword;
    await u.save(); // will hash via pre-save hook

    res.json({ success: true, tempPassword });
  } catch (err) {
    console.error('ADMIN RESET PASSWORD ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// View user links
router.get('/users/:id/links', async (req, res) => {
  try {
    const links = await Link.find({ userId: req.params.id }).sort({ order: 1 }).lean();
    res.json({ links });
  } catch (err) {
    console.error('ADMIN USER LINKS ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// View user analytics summary (basic)
router.get('/users/:id/analytics', async (req, res) => {
  try {
    const userId = req.params.id;
    const days = clamp(Number(req.query.days || 30), 1, 365);
    const since = new Date(Date.now() - days * 86400000);

    const events = await AnalyticsEvent.find({ userId, createdAt: { $gte: since } }).lean();
    const profileViews = events.filter(e => e.type === 'profile_view').length;
    const linkClicks = events.filter(e => e.type === 'link_click').length;
    const qrScans = events.filter(e => e.type === 'qr_scan').length;

    res.json({
      stats: {
        profileViews,
        linkClicks,
        qrScans,
        clickRate: profileViews ? Number(((linkClicks / profileViews) * 100).toFixed(1)) : 0,
        days,
      }
    });
  } catch (err) {
    console.error('ADMIN USER ANALYTICS ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * NEW: COUPON PERFORMANCE STATS
 * GET /admin/coupons/stats
 * ─────────────────────────────────────────────────────────────
 */
router.get('/coupons/stats', async (req, res) => {
  try {
    const coupons = await Coupon.find().lean();
    const totalCoupons = coupons.length;
    const activeCoupons = coupons.filter(c => c.isActive).length;
    const expiredCoupons = coupons.filter(c => new Date(c.expiresAt) < new Date()).length;
    const totalUsage = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

    const mostUsed = coupons.reduce((best, c) => {
      if (!best) return c;
      return (c.usedCount || 0) > (best.usedCount || 0) ? c : best;
    }, null);

    res.json({
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      totalUsage,
      mostUsed: mostUsed
        ? { code: mostUsed.code, usedCount: mostUsed.usedCount, maxUses: mostUsed.maxUses }
        : null,
    });
  } catch (err) {
    console.error('ADMIN COUPON STATS ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * ─────────────────────────────────────────────────────────────
 * NEW: SUBSCRIPTION STATS (basic until payments exist)
 * GET /admin/subscriptions/stats
 * ─────────────────────────────────────────────────────────────
 */
router.get('/subscriptions/stats', async (req, res) => {
  try {
    const [pro, premium] = await Promise.all([
      User.countDocuments({ plan: 'pro' }),
      User.countDocuments({ plan: 'premium' }),
    ]);

    const activeSubscriptions = pro + premium;
    const estimatedMrrInr = (pro * PLAN_PRICES_INR.pro) + (premium * PLAN_PRICES_INR.premium);

    res.json({
      activeSubscriptions,
      activeProUsers: pro,
      activePremiumUsers: premium,
      estimatedMrrInr,
      churnRate: null, // requires payment/subscription history
    });
  } catch (err) {
    console.error('ADMIN SUBS STATS ERROR:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;