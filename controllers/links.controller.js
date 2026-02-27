// controllers/links.controller.js
const Link = require("../models/Link");
const { logActivity } = require("../utils/activityLog");

/** GET /api/links */
async function getLinks(req, res, next) {
  try {
    const links = await Link.find({ user: req.user.id })
      .sort({ position: 1, created_at: -1 })
      .lean();

    res.json(
      links.map((l) => ({
        id: l._id.toString(),
        user: l.user,
        title: l.title,
        url: l.url,
        enabled: l.enabled,
        position: l.position,
        created_at: l.created_at,
      }))
    );
  } catch (err) {
    next(err);
  }
}

/** POST /api/links */
async function createLink(req, res, next) {
  try {
    const { title, url, enabled, position } = req.body;

    // Count existing links before creating
    const existingCount = await Link.countDocuments({ user: req.user.id });

    const link = await Link.create({
      user: req.user.id,
      title,
      url,
      enabled,
      position,
    });

    // Log first link event
    if (existingCount === 0) {
      await logActivity(
        req.user.id,
        "first_link_created",
        "First link created",
        {
          link_id: link._id.toString(),
          title,
        }
      );
    }

    res.status(201).json({
      id: link._id.toString(),
      user: link.user,
      title: link.title,
      url: link.url,
      enabled: link.enabled,
      position: link.position,
      created_at: link.created_at,
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/links/:id */
async function updateLink(req, res, next) {
  try {
    const { title, url, enabled, position } = req.body;

    const link = await Link.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        $set: {
          ...(title !== undefined ? { title } : {}),
          ...(url !== undefined ? { url } : {}),
          ...(enabled !== undefined ? { enabled } : {}),
          ...(position !== undefined ? { position } : {}),
        },
      },
      { new: true }
    ).lean();

    if (!link) return res.status(404).json({ error: "Link not found" });

    res.json({
      id: link._id.toString(),
      user: link.user,
      title: link.title,
      url: link.url,
      enabled: link.enabled,
      position: link.position,
      created_at: link.created_at,
    });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/links/:id */
async function deleteLink(req, res, next) {
  try {
    const result = await Link.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!result) return res.status(404).json({ error: "Link not found" });

    res.json({ message: "Link deleted" });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/links/reorder */
async function reorderLinks(req, res, next) {
  try {
    const { order } = req.body; // [{ id, position }]

    const ops = order.map(({ id, position }) =>
      Link.updateOne(
        { _id: id, user: req.user.id },
        { $set: { position } }
      )
    );
    await Promise.all(ops);

    res.json({ message: "Links reordered" });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLinks,
  createLink,
  updateLink,
  deleteLink,
  reorderLinks,
};