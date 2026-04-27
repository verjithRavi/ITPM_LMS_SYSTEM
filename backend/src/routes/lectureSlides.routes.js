const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { listSlides, createSlide, deleteSlide } = require("../controllers/lectureSlides.controller");

router.get("/", requireAuth, listSlides);
router.post("/", requireAuth, requireRole("TUTOR", "ADMIN"), createSlide);
router.delete("/:id", requireAuth, requireRole("TUTOR", "ADMIN"), deleteSlide);

module.exports = router;
