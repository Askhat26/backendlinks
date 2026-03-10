const router = require('express').Router();
const Appearance = require('../models/Appearance');
const auth = require('../middleware/auth');
const { getLimits } = require('../middleware/planGate');

router.get('/', auth, async (req, res) => {
  let a = await Appearance.findOne({ userId: req.user._id });
  if (!a) a = await Appearance.create({ userId: req.user._id });
  res.json({ appearance: a });
});

router.put('/', auth, async (req, res) => {
  const limits = getLimits(req.user.plan);
  const update = req.body || {};

  if (limits.themes !== 'all' && update.theme && !limits.themes.includes(update.theme)) {
    return res.status(403).json({ error: 'Theme requires Pro plan or higher', currentPlan: req.user.plan });
  }
  if (limits.layouts !== 'all' && update.layout && !limits.layouts.includes(update.layout)) {
    return res.status(403).json({ error: 'Layout requires Pro plan or higher', currentPlan: req.user.plan });
  }

  const a = await Appearance.findOneAndUpdate(
    { userId: req.user._id },
    update,
    { new: true, upsert: true }
  );

  res.json({ appearance: a });
});

module.exports = router;