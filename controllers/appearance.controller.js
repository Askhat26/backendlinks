const AppearanceSettings = require("../models/AppearanceSettings");

/** GET /api/appearance */
async function getAppearance(req, res, next) {
  try {
    const doc = await AppearanceSettings.findOne({ user: req.user.id });
    res.json(doc || {});
  } catch (err) {
    next(err);
  }
}

/** PUT /api/appearance */
async function updateAppearance(req, res, next) {
  try {
    const {
      accent_color,
      bg_style,
      font_family,
      button_radius,
      dark_mode,
      show_avatar,
    } = req.body;

    const updates = {};
    if (accent_color !== undefined) updates.accent_color = accent_color;
    if (bg_style !== undefined) updates.bg_style = bg_style;
    if (font_family !== undefined) updates.font_family = font_family;
    if (button_radius !== undefined) updates.button_radius = button_radius;
    if (dark_mode !== undefined) updates.dark_mode = dark_mode;
    if (show_avatar !== undefined) updates.show_avatar = show_avatar;

    await AppearanceSettings.findOneAndUpdate(
      { user: req.user.id },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({ message: "Appearance updated" });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAppearance, updateAppearance };