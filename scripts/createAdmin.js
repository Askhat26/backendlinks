// scripts/createAdmin.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");

async function createAdmin() {
  try {
    const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME } = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error(
        "❌ ADMIN_EMAIL or ADMIN_PASSWORD not set in .env. Aborting."
      );
      process.exit(1);
    }

    await connectDB();

    const email = ADMIN_EMAIL.toLowerCase().trim();

    // Check if an admin with this email already exists
    let user = await User.findOne({ email });
    if (user) {
      if (user.role !== "admin") {
        user.role = "admin";
        await user.save();
        console.log("✅ Existing user promoted to admin:", user.email);
      } else {
        console.log("ℹ️ Admin already exists:", user.email);
      }
      process.exit(0);
    }

    const password_hash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    user = await User.create({
      email,
      full_name: ADMIN_FULL_NAME || "Admin User",
      password_hash,
      role: "admin",
    });

    console.log("✅ Admin created:", user.email, "role:", user.role);
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create admin:", err);
    process.exit(1);
  }
}

createAdmin();