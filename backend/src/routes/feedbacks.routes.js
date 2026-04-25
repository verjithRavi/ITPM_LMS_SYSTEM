const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  listFeedbacks,
  createFeedback,
  updateFeedback,
  deleteFeedback,
} = require("../controllers/feedbacks.controller");

router.get("/", requireAuth, requireRole("ADMIN", "STUDENT", "TUTOR"), listFeedbacks);
router.post("/", requireAuth, requireRole("STUDENT", "TUTOR"), createFeedback);
router.patch("/:id", requireAuth, requireRole("STUDENT", "TUTOR"), updateFeedback);
router.delete("/:id", requireAuth, requireRole("STUDENT", "TUTOR"), deleteFeedback);

module.exports = router;
