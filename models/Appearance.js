const mongoose = require('mongoose');

const appearanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  layout: { type: String, default: 'classic-glass' },
  theme: { type: String, default: 'neon-cyber' },
  accentColor: { type: String, default: '#7c3aed' },
  backgroundColor: { type: String, default: '#0a0a0f' },
  font: { type: String, default: 'Space Grotesk' },
  buttonStyle: { type: String, default: 'rounded' },
  animation: { type: String, default: 'fade-up' },
  avatarStyle: { type: String, default: 'circle' },
}, { timestamps: true });

module.exports = mongoose.model('Appearance', appearanceSchema);