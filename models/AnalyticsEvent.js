const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['profile_view', 'link_click', 'qr_scan'], required: true },
  linkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Link' },
  ip: String,
  userAgent: String,
  referer: String,
}, { timestamps: true });

module.exports = mongoose.model('AnalyticsEvent', schema);