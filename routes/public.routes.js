const router = require("express").Router();
const ctrl = require("../controllers/public.controller");

// No auth — public endpoints
router.get("/:username", ctrl.getPublicPage);
router.post("/:username/click", ctrl.recordClick);

module.exports = router;