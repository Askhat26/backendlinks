const router = require("express").Router();
const { validateCoupon } = require("../controllers/coupon.controller");

// Public endpoint to validate coupon codes
router.post("/validate", validateCoupon);

module.exports = router;