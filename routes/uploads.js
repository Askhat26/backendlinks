const router = require("express").Router();
const auth = require("../middleware/auth");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET /api/uploads/cloudinary-signature?folder=linkkora/avatars
router.get("/cloudinary-signature", auth, async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: "Cloudinary not configured" });
    }

    const timestamp = Math.round(Date.now() / 1000);

    // folder is optional; we default to per-user folder
    const folder =
      (req.query.folder && String(req.query.folder)) ||
      `linkkora/avatars/${req.user._id}`;

    const paramsToSign = { timestamp, folder };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.json({
      timestamp,
      signature,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) {
    console.error("CLOUDINARY SIGN ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;