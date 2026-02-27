const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/analytics.controller");

router.get("/overview", auth, ctrl.getOverview);
router.get("/chart", auth, ctrl.getChartData);
router.get("/top-links", auth, ctrl.getTopLinks);
router.get("/sources", auth, ctrl.getSources);

module.exports = router;