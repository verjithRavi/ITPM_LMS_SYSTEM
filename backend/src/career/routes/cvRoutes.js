const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { getAllCvs, getCvById, createCv, updateCv, deleteCv, getCvTemplates, downloadCvPdf } = require("../controllers/cvController");

const router = express.Router();
router.use(requireAuth);

router.get("/templates", getCvTemplates);
router.get("/", getAllCvs);
router.post("/", createCv);
router.get("/:id", getCvById);
router.put("/:id", updateCv);
router.delete("/:id", deleteCv);
router.get("/:id/download", downloadCvPdf);

module.exports = router;
