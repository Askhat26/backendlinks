const router = require('express').Router();
const Link = require('../models/Link');
const auth = require('../middleware/auth');
const { getLimits } = require('../middleware/planGate');

router.get('/', auth, async (req, res) => {
  const links = await Link.find({ userId: req.user._id }).sort({ order: 1 });
  res.json({ links });
});

router.post('/', auth, async (req, res) => {
  const { title, url } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'Title and URL required' });

  const limits = getLimits(req.user.plan);
  const count = await Link.countDocuments({ userId: req.user._id });
  if (count >= limits.maxLinks) {
    return res.status(403).json({
      error: `${req.user.plan} plan allows max ${limits.maxLinks} links.`,
      currentPlan: req.user.plan,
    });
  }

  const highest = await Link.findOne({ userId: req.user._id }).sort({ order: -1 });
  const link = await Link.create({
    userId: req.user._id,
    title,
    url,
    order: highest ? highest.order + 1 : 0,
  });

  res.status(201).json({ link });
});

router.put('/:id', auth, async (req, res) => {
  const link = await Link.findOne({ _id: req.params.id, userId: req.user._id });
  if (!link) return res.status(404).json({ error: 'Not found' });

  const { title, url, enabled } = req.body;
  if (title !== undefined) link.title = title;
  if (url !== undefined) link.url = url;
  if (enabled !== undefined) link.enabled = enabled;

  await link.save();
  res.json({ link });
});

// frontend sometimes calls /reorder
router.put('/reorder', auth, async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds array required' });

  await Link.bulkWrite(
    orderedIds.map((id, i) => ({
      updateOne: { filter: { _id: id, userId: req.user._id }, update: { order: i } },
    }))
  );

  res.json({ success: true });
});

// also keep /reorder/batch (from your earlier doc)
router.put('/reorder/batch', auth, async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds array required' });

  await Link.bulkWrite(
    orderedIds.map((id, i) => ({
      updateOne: { filter: { _id: id, userId: req.user._id }, update: { order: i } },
    }))
  );

  res.json({ success: true });
});

router.delete('/:id', auth, async (req, res) => {
  await Link.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ success: true });
});

module.exports = router;