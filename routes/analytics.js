const router = require('express').Router();
const AnalyticsEvent = require('../models/AnalyticsEvent');
const Link = require('../models/Link');
const auth = require('../middleware/auth');
const { getLimits } = require('../middleware/planGate');

function buildChart(events) {
  const daily = {};
  for (const e of events) {
    const day = e.createdAt.toISOString().slice(0, 10);
    daily[day] ||= { date: day, views: 0, clicks: 0, qrScans: 0 };
    if (e.type === 'profile_view') daily[day].views++;
    if (e.type === 'link_click') daily[day].clicks++;
    if (e.type === 'qr_scan') daily[day].qrScans++;
  }
  return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date));
}

router.get('/stats', auth, async (req, res) => {
  const limits = getLimits(req.user.plan);
  const days = limits.hasAdvancedAnalytics ? Number(req.query.days || 30) : 7;

  const since = new Date(Date.now() - days * 86400000);
  const events = await AnalyticsEvent.find({ userId: req.user._id, createdAt: { $gte: since } });

  const totalViews = events.filter(e => e.type === 'profile_view').length;
  const totalClicks = events.filter(e => e.type === 'link_click').length;
  const totalQrScans = events.filter(e => e.type === 'qr_scan').length;
  const clickRate = totalViews ? Number(((totalClicks / totalViews) * 100).toFixed(1)) : 0;

  res.json({
    totalViews,
    totalClicks,
    totalQrScans,
    clickRate,
    maxDaysAllowed: limits.hasAdvancedAnalytics ? 90 : 7,
    plan: req.user.plan,
  });
});

router.get('/chart', auth, async (req, res) => {
  const limits = getLimits(req.user.plan);
  const days = limits.hasAdvancedAnalytics ? Number(req.query.days || 30) : 7;

  const since = new Date(Date.now() - days * 86400000);
  const events = await AnalyticsEvent.find({ userId: req.user._id, createdAt: { $gte: since } }).sort({ createdAt: 1 });

  res.json({ chart: buildChart(events), days });
});

router.post('/track', async (req, res) => {
  const { userId, type, linkId } = req.body;
  if (!userId || !type) return res.status(400).json({ error: 'userId and type required' });

  await AnalyticsEvent.create({
    userId,
    type,
    linkId: linkId || undefined,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
  });

  if (type === 'link_click' && linkId) {
    await Link.findByIdAndUpdate(linkId, { $inc: { clicks: 1 } });
  }

  res.json({ success: true });
});

module.exports = router;