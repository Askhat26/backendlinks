const router = require("express").Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const upload = require("../utils/upload");
const { pdfCardSchema } = require("../schemas/pdfcard.schema");
const ctrl = require("../controllers/pdfcard.controller");

router.get("/", auth, ctrl.getPdfCard);
router.put("/", auth, validate(pdfCardSchema), ctrl.updatePdfCard);
router.post("/photo", auth, upload.single("photo"), ctrl.uploadPhoto);

module.exports = router;