const mongoose = require("mongoose");

const appearanceSettingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    accent_color: { type: String, default: "#6366f1" },
    bg_style: { type: String, enum: ["solid", "gradient", "mesh"], default: "solid" },
    font_family: { type: String, default: "Inter" },
    button_radius: { type: String, enum: ["sm", "md", "lg", "full"], default: "md" },
    dark_mode: { type: Boolean, default: false },
    show_avatar: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("AppearanceSettings", appearanceSettingsSchema);