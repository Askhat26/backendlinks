const router = require('express').Router();
const Coupon = require('../models/Coupon');
const AppliedCoupon = require('../models/AppliedCoupon');
const auth = require('../middleware/auth');

const PRICES = { pro: 499, premium: 999 };

// Validate coupon (requires auth in your current design)
router.post('/validate', auth, async (req, res) => {
  try {
    const codeRaw = req.body?.code;
    const code = String(codeRaw || '').trim().toUpperCase();

    if (!code) return res.status(400).json({ error: 'Code required' });

    const coupon = await Coupon.findOne({ code });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    if (!coupon.isActive) return res.status(400).json({ error: 'Coupon inactive' });
    if (new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'Coupon expired' });
    if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Usage limit reached' });

    return res.json({ discountPercent: coupon.discountPercent, code: coupon.code });
  } catch (err) {
    console.error('COUPON VALIDATE ERROR:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Apply coupon
router.post('/apply', auth, async (req, res) => {
  try {
    const codeRaw = req.body?.code;
    const code = String(codeRaw || '').trim().toUpperCase();

    // support both "plan" and "planId" to avoid frontend mismatch breaking things
    const plan = req.body?.plan || req.body?.planId;

    if (!code || !plan) return res.status(400).json({ error: 'Code and plan required' });

    const base = PRICES[plan];
    if (!base) return res.status(400).json({ error: 'Invalid plan' });

    const coupon = await Coupon.findOne({ code });
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    if (!coupon.isActive) return res.status(400).json({ error: 'Coupon inactive' });
    if (new Date(coupon.expiresAt) < new Date()) return res.status(400).json({ error: 'Coupon expired' });
    if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Usage limit reached' });

    const already = await AppliedCoupon.findOne({ userId: req.user._id, couponId: coupon._id });
    if (already) return res.status(400).json({ error: 'Already used this coupon' });

    const discountAmount = base * (coupon.discountPercent / 100);
    const finalPrice = base - discountAmount;

    // increment usage
    coupon.usedCount += 1;
    await coupon.save();

    await AppliedCoupon.create({
      userId: req.user._id,
      couponId: coupon._id,
      discountPercent: coupon.discountPercent,
    });

    return res.json({
      discountPercent: coupon.discountPercent,
      discountAmount,
      finalPrice,
      basePrice: base,
    });
  } catch (err) {
    console.error('COUPON APPLY ERROR:', err);

    // If AppliedCoupon unique index triggers duplicate (rare race)
    if (err?.code === 11000) {
      return res.status(400).json({ error: 'Already used this coupon' });
    }

    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;