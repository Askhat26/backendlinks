const mongoose = require("mongoose");

const pdfCardSettingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    template: {
      type: String,
      enum: ["classic", "minimal", "bold", "elegant"],
      default: "classic",
    },
    theme: {
      type: String,
      enum: ["coral", "ocean", "forest", "midnight", "rose", "violet"],
      default: "coral",
    },
    name: { type: String, default: "" },
    title: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    bio: { type: String, default: "" },
    photo_url: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("PdfCardSettings", pdfCardSettingsSchema);