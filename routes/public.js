const router = require('express').Router();
const User = require('../models/User');
const Link = require('../models/Link');
const Appearance = require('../models/Appearance');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { getLimits } = require('../middleware/planGate');

router.get('/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username, isBanned: false })
    .select('name username avatar bio plan');
  if (!user) return res.status(404).json({ error: 'Profile not found' });

  const links = await Link.find({ userId: user._id, enabled: true }).sort({ order: 1 });
  const appearance = await Appearance.findOne({ userId: user._id });

  const limits = getLimits(user.plan);

  res.json({
    user,
    links,
    appearance,
    showBranding: limits.showBranding,
    showQR: limits.hasQR,
  });
});

router.post('/:username/view', async (req, res) => {
  const user = await User.findOne({ username: req.params.username, isBanned: false });
  if (!user) return res.status(404).json({ error: 'User not found' });

  await AnalyticsEvent.create({
    userId: user._id,
    type: 'profile_view',
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
  });

  res.json({ success: true });
});

router.post('/:username/click', async (req, res) => {
  const user = await User.findOne({ username: req.params.username, isBanned: false });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { linkId } = req.body;

  await AnalyticsEvent.create({
    userId: user._id,
    type: 'link_click',
    linkId: linkId || undefined,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    referer: req.headers['referer'],
  });

  if (linkId) {
    await Link.findByIdAndUpdate(linkId, { $inc: { clicks: 1 } });
  }

  res.json({ success: true });
});

module.exports = router;