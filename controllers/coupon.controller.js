const Coupon = require("../models/Coupon");

// POST /api/coupons/validate
// body: { code }
async function validateCoupon(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Coupon code is required" });
    }

    const normalized = String(code).toUpperCase().trim();
    const coupon = await Coupon.findOne({ code: normalized });

    if (!coupon || !coupon.is_active) {
      return res
        .status(404)
        .json({ error: "Coupon not found or not active" });
    }

    if (coupon.expires_at <= new Date()) {
      return res.status(410).json({ error: "Coupon has expired" });
    }

    res.json({
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      expires_at: coupon.expires_at,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { validateCoupon };