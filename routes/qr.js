const router = require('express').Router();
const QRCode = require('qrcode');
const auth = require('../middleware/auth');
const { requireFeature } = require('../middleware/planGate');
const AnalyticsEvent = require('../models/AnalyticsEvent');

router.get('/stats', auth, requireFeature('hasQR'), async (req, res) => {
  const total = await AnalyticsEvent.countDocuments({ userId: req.user._id, type: 'qr_scan' });
  res.json({ total });
});

router.get('/download', auth, requireFeature('hasQR'), async (req, res) => {
  const url = `${process.env.BASE_URL}/${req.user.username}`;
  const buf = await QRCode.toBuffer(url, { type: 'png', width: 512, margin: 2 });
  res.setHeader('Content-Type', 'image/png');
  res.send(buf);
});

module.exports = router;