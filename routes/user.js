const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

router.put('/profile', auth, async (req, res) => {
  const { name, username, bio } = req.body;

  if (username && username !== req.user.username) {
    const u = username.toLowerCase();
    if (!/^[a-z0-9_]+$/.test(u)) return res.status(400).json({ error: 'Invalid username format' });
    if (await User.findOne({ username: u })) return res.status(400).json({ error: 'Username taken' });
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { name, username: username ? username.toLowerCase() : undefined, bio },
    { new: true }
  ).select('-password');

  res.json({ user: updated });
});

router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });

  const user = await User.findById(req.user._id).select('+password');
  const ok = await user.comparePassword(currentPassword);
  if (!ok) return res.status(400).json({ error: 'Wrong current password' });

  user.password = newPassword;
  await user.save();

  res.json({ success: true });
});

router.delete('/account', auth, async (req, res) => {
  const userId = req.user._id;
  await User.findByIdAndDelete(userId);

  const Link = require('../models/Link');
  const Appearance = require('../models/Appearance');
  const Card = require('../models/Card');
  const AnalyticsEvent = require('../models/AnalyticsEvent');

  await Promise.all([
    Link.deleteMany({ userId }),
    Appearance.deleteOne({ userId }),
    Card.deleteOne({ userId }),
    AnalyticsEvent.deleteMany({ userId }),
  ]);

  res.json({ success: true });
});

module.exports = router;