const mongoose = require("mongoose");

const notificationPreferencesSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    email_weekly: { type: Boolean, default: true },
    click_alerts: { type: Boolean, default: false },
    security_alerts: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: false, updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("NotificationPreferences", notificationPreferencesSchema);