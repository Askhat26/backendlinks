const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, default: '' },
  role: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  website: { type: String, default: '' },
  location: { type: String, default: '' },
  template: { type: String, default: 'minimal-white' },
  brandName: { type: String, default: '' },
  tagline: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  servicesText: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Card', cardSchema);