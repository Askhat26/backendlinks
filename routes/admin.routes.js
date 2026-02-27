const router = require("express").Router();
const auth = require("../middleware/auth");
const requireAdmin = require("../middleware/admin");
const adminCtrl = require("../controllers/admin.controller");
const adminUsersCtrl = require("../controllers/adminUsers.controller");

// All admin routes require auth + admin role
router.use(auth, requireAdmin);

// Overview + coupons
router.get("/overview", adminCtrl.getOverview);

router.get("/coupons", adminCtrl.getCoupons);
router.post("/coupons", adminCtrl.createCoupon);
router.put("/coupons/:id", adminCtrl.updateCoupon);
router.delete("/coupons/:id", adminCtrl.deleteCoupon);

// Users management
router.get("/users", adminUsersCtrl.listUsers);
router.get("/users/:id", adminUsersCtrl.getUserDetail);
router.put("/users/:id/status", adminUsersCtrl.updateUserStatus);

// Plan & billing (manual plan changes)
router.put("/users/:id/plan", adminUsersCtrl.updateUserPlan);

// Activity timeline
router.get("/users/:id/activity", adminUsersCtrl.getUserActivity);

module.exports = router;