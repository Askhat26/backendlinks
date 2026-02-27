const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { appearanceSchema } = require("../schemas/appearance.schema");
const ctrl = require("../controllers/appearance.controller");

router.get("/", auth, ctrl.getAppearance);
router.put("/", auth, validate(appearanceSchema), ctrl.updateAppearance);

module.exports = router;