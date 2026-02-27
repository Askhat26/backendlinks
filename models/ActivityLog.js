// models/ActivityLog.js
const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "user_created",
        "first_link_created",
        "reached_1000_views",
        "plan_upgraded",
      ],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true, timestamps: false }
);

activityLogSchema.index({ user: 1, created_at: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);