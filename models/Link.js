const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  url: { type: String, required: true, trim: true },
  enabled: { type: Boolean, default: true },
  clicks: { type: Number, default: 0 },
  order: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Link', linkSchema);