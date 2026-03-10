const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', required: true },
  discountPercent: { type: Number, required: true },
}, { timestamps: true });

schema.index({ userId: 1, couponId: 1 }, { unique: true });

module.exports = mongoose.model('AppliedCoupon', schema);