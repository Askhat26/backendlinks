const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    link: { type: mongoose.Schema.Types.ObjectId, ref: "Link", default: null },
    event_type: {
      type: String,
      enum: ["view", "click", "qr_scan"],
      required: true,
    },
    referrer: { type: String, default: "" },
    user_agent: { type: String, default: "" },
    ip_address: { type: String, default: "" },
    country: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);