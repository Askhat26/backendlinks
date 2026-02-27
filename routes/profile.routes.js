// routes/profile.routes.js
const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../utils/upload");
const {
  updateProfileSchema,
  changePasswordSchema,
} = require("../schemas/profile.schema");
const ctrl = require("../controllers/profile.controller");

router.get("/", auth, ctrl.getProfile);
router.put("/", auth, validate(updateProfileSchema), ctrl.updateProfile);
router.post("/avatar", auth, upload.single("avatar"), ctrl.uploadAvatar);
router.put("/password", auth, validate(changePasswordSchema), ctrl.changePassword);
router.put("/notifications", auth, ctrl.updateNotifications);

// NEW: user self-serve plan selection
router.put("/plan", auth, ctrl.updateOwnPlan);

router.delete("/account", auth, ctrl.deleteAccount);

module.exports = router;