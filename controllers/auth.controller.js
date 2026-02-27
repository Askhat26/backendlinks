// controllers/auth.controller.js
const bcrypt = require("bcryptjs");
const { signToken } = require("../utils/token");
const { logActivity } = require("../utils/activityLog");
const User = require("../models/User");
const Profile = require("../models/Profile");
const AppearanceSettings = require("../models/AppearanceSettings");
const PdfCardSettings = require("../models/PdfCardSettings");
const NotificationPreferences = require("../models/NotificationPreferences");

/**
 * POST /api/auth/register
 * Creates user + profile + default settings documents.
 */
async function register(req, res, next) {
  try {
    const { full_name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    // Check if email exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      full_name,
      email: normalizedEmail,
      password_hash,
      // role: "user", plan: "Free", etc. come from defaults
    });

    // Create related default docs
    await Promise.all([
      Profile.create({ user: user._id }),
      AppearanceSettings.create({ user: user._id }),
      PdfCardSettings.create({
        user: user._id,
        name: full_name,
        email: normalizedEmail,
      }),
      NotificationPreferences.create({ user: user._id }),
    ]);

    // Log activity
    await logActivity(user._id, "user_created", "User account created", {});

    const token = signToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    res.json({ message: "If an account exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, forgotPassword };