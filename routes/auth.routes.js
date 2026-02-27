const router = require("express").Router();
const { register, login, forgotPassword } = require("../controllers/auth.controller");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema, forgotPasswordSchema } = require("../schemas/auth.schema");

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

// IMPORTANT: CommonJS export
module.exports = router;