const PdfCardSettings = require("../models/PdfCardSettings");

/** GET /api/pdf-card */
async function getPdfCard(req, res, next) {
  try {
    const doc = await PdfCardSettings.findOne({ user: req.user.id });
    res.json(doc || {});
  } catch (err) {
    next(err);
  }
}

/** PUT /api/pdf-card */
async function updatePdfCard(req, res, next) {
  try {
    const { template, theme, name, title, email, phone, website, bio } =
      req.body;

    const updates = {};
    if (template !== undefined) updates.template = template;
    if (theme !== undefined) updates.theme = theme;
    if (name !== undefined) updates.name = name;
    if (title !== undefined) updates.title = title;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (website !== undefined) updates.website = website;
    if (bio !== undefined) updates.bio = bio;

    await PdfCardSettings.findOneAndUpdate(
      { user: req.user.id },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({ message: "PDF card settings updated" });
  } catch (err) {
    next(err);
  }
}

/** POST /api/pdf-card/photo — multipart upload */
async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const photo_url = `/uploads/${req.file.filename}`;
    await PdfCardSettings.findOneAndUpdate(
      { user: req.user.id },
      { $set: { photo_url } },
      { new: true, upsert: true }
    );

    res.json({ photo_url });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPdfCard, updatePdfCard, uploadPhoto };