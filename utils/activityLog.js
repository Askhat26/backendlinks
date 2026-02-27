// utils/activityLog.js
const ActivityLog = require("../models/ActivityLog");

/**
 * Log an activity event for a user.
 * @param {string | import("mongoose").Types.ObjectId} userId
 * @param {"user_created" | "first_link_created" | "reached_1000_views" | "plan_upgraded"} type
 * @param {string} message
 * @param {Record<string, any>} metadata
 */
async function logActivity(userId, type, message, metadata = {}) {
  try {
    await ActivityLog.create({
      user: userId,
      type,
      message,
      metadata,
    });
  } catch (err) {
    console.error("Failed to log activity:", err.message);
  }
}

module.exports = { logActivity };