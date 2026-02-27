const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createLinkSchema, updateLinkSchema, reorderSchema } = require("../schemas/link.schema");
const ctrl = require("../controllers/links.controller");

router.get("/", auth, ctrl.getLinks);
router.post("/", auth, validate(createLinkSchema), ctrl.createLink);
router.put("/reorder", auth, validate(reorderSchema), ctrl.reorderLinks);
router.put("/:id", auth, validate(updateLinkSchema), ctrl.updateLink);
router.delete("/:id", auth, ctrl.deleteLink);

module.exports = router;