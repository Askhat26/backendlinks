const router = require('express').Router();
const User = require('../models/User');
const Link = require('../models/Link');
const Appearance = require('../models/Appearance');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { getLimits } = require('../middleware/planGate');

// Get public profile by username (no auth required)
router.get('/:username', async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username.toLowerCase(),
      isBanned: false,
    }).select('name username avatar bio plan');

    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get enabled links sorted by order
    const links = await Link.find({
      userId: user._id,
      enabled: true,
    }).sort('order');

    // Get appearance settings
    const appearance = await Appearance.findOne({ userId: user._id });

    // Get plan limits for this user
    const limits = getLimits(user.plan);

    // Track profile view
    await AnalyticsEvent.create({
      userId: user._id,
      type: 'profile_view',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'] || req.headers['referrer'],
    });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
      },
      links,
      appearance,
      showBranding: limits.showBranding,
      showQR: limits.hasQR,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;