const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  listQuizzes,
  createQuiz,
  startQuizAttempt,
  submitQuizAttempt,
  getQuizAttemptsOverview,
  reviewQuizAttempt,
  publishQuiz,
  getQuizById,
  updateQuiz,
  deleteQuiz,
} = require("../controllers/quizzes.controller");

router.get("/", requireAuth, listQuizzes);
router.post("/", requireAuth, requireRole("TUTOR", "ADMIN"), createQuiz);
router.get("/:id", requireAuth, getQuizById);
router.patch("/:id", requireAuth, requireRole("TUTOR", "ADMIN"), updateQuiz);
router.delete("/:id", requireAuth, requireRole("TUTOR", "ADMIN"), deleteQuiz);
router.patch("/:id/publish", requireAuth, requireRole("TUTOR", "ADMIN"), publishQuiz);
router.get("/:id/attempts", requireAuth, requireRole("TUTOR", "ADMIN"), getQuizAttemptsOverview);
router.patch("/:id/attempts/:attemptId/review", requireAuth, requireRole("TUTOR", "ADMIN"), reviewQuizAttempt);
router.post("/:id/attempts/start", requireAuth, requireRole("STUDENT"), startQuizAttempt);
router.post("/:id/attempts/:attemptId/submit", requireAuth, requireRole("STUDENT"), submitQuizAttempt);

module.exports = router;
