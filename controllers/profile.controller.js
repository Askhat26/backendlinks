// controllers/profile.controller.js
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Profile = require("../models/Profile");
const NotificationPreferences = require("../models/NotificationPreferences");
const Link = require("../models/Link");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const AppearanceSettings = require("../models/AppearanceSettings");
const PdfCardSettings = require("../models/PdfCardSettings");

/** GET /api/profile */
async function getProfile(req, res, next) {
  try {
    const [user, profile, notif] = await Promise.all([
      // include role + plan fields
      User.findById(req.user.id).select(
        "email full_name username role plan plan_status plan_renewal_date"
      ),
      Profile.findOne({ user: req.user.id }).select("bio location avatar_url"),
      NotificationPreferences.findOne({ user: req.user.id }).select(
        "email_weekly click_alerts security_alerts"
      ),
    ]);

    if (!user || !profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      // plan info
      plan: user.plan,
      plan_status: user.plan_status,
      plan_renewal_date: user.plan_renewal_date,
      // profile info
      bio: profile.bio || "",
      location: profile.location || "",
      avatar_url: profile.avatar_url || "",
      // notifications
      email_weekly: notif?.email_weekly ?? true,
      click_alerts: notif?.click_alerts ?? false,
      security_alerts: notif?.security_alerts ?? true,
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/profile */
async function updateProfile(req, res, next) {
  try {
    const { full_name, username, bio, location } = req.body;

    if (username) {
      const normalizedUsername = username.toLowerCase();
      const taken = await User.findOne({
        username: normalizedUsername,
        _id: { $ne: req.user.id },
      });
      if (taken) {
        return res.status(409).json({ error: "Username already taken" });
      }
    }

    const userUpdates = {};
    if (full_name !== undefined) userUpdates.full_name = full_name;
    if (username !== undefined) userUpdates.username = username.toLowerCase();

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(
        req.user.id,
        { $set: userUpdates },
        { new: true }
      );
    }

    const profileUpdates = {};
    if (bio !== undefined) profileUpdates.bio = bio;
    if (location !== undefined) profileUpdates.location = location;

    if (Object.keys(profileUpdates).length > 0) {
      await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileUpdates },
        { new: true, upsert: true }
      );
    }

    res.json({ message: "Profile updated" });
  } catch (err) {
    next(err);
  }
}

/** POST /api/profile/avatar — multipart upload */
async function uploadAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const avatar_url = `/uploads/${req.file.filename}`;
    await Profile.findOneAndUpdate(
      { user: req.user.id },
      { $set: { avatar_url } },
      { new: true, upsert: true }
    );

    res.json({ avatar_url });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/profile/password */
async function changePassword(req, res, next) {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findById(req.user.id).select("password_hash");
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hash = await bcrypt.hash(new_password, 12);
    await User.findByIdAndUpdate(req.user.id, {
      $set: { password_hash: hash },
    });

    res.json({ message: "Password changed" });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/profile/notifications */
async function updateNotifications(req, res, next) {
  try {
    const { email_weekly, click_alerts, security_alerts } = req.body;

    const updates = {};
    if (email_weekly !== undefined) updates.email_weekly = email_weekly;
    if (click_alerts !== undefined) updates.click_alerts = click_alerts;
    if (security_alerts !== undefined) updates.security_alerts = security_alerts;

    await NotificationPreferences.findOneAndUpdate(
      { user: req.user.id },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({ message: "Notification preferences updated" });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/profile/plan
 *  User self‑serve plan selection
 *  body: { plan: string }
 */
async function updateOwnPlan(req, res, next) {
  try {
    const { plan } = req.body;

    if (!plan || typeof plan !== "string") {
      return res
        .status(400)
        .json({ error: "Plan is required as a non-empty string" });
    }

    const updates = {
      plan: plan.trim(),
      plan_status: "active", // you can adjust later if you add billing
    };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true }
    ).lean();

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      plan: user.plan,
      plan_status: user.plan_status,
      plan_renewal_date: user.plan_renewal_date,
    });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/profile/account */
async function deleteAccount(req, res, next) {
  try {
    const userId = req.user.id;

    await Promise.all([
      Profile.deleteOne({ user: userId }),
      Link.deleteMany({ user: userId }),
      AnalyticsEvent.deleteMany({ user: userId }),
      AppearanceSettings.deleteOne({ user: userId }),
      PdfCardSettings.deleteOne({ user: userId }),
      NotificationPreferences.deleteOne({ user: userId }),
      User.deleteOne({ _id: userId }),
    ]);

    res.json({ message: "Account deleted" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  updateNotifications,
  updateOwnPlan,   // NEW export
  deleteAccount,
};