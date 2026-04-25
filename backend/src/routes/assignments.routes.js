const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  listAssignments,
  createAssignment,
  submitAssignment,
  publishAssignment,
  getAssignmentById,
  getAssignmentSubmissionsOverview,
  reviewAssignmentSubmission,
  updateAssignment,
  deleteAssignment,
  closeAssignment,
} = require("../controllers/assignments.controller");

router.get("/", requireAuth, listAssignments);
router.post("/", requireAuth, requireRole("TUTOR", "ADMIN"), createAssignment);
router.get("/:id", requireAuth, getAssignmentById);
router.patch("/:id", requireAuth, requireRole("TUTOR", "ADMIN"), updateAssignment);
router.delete("/:id", requireAuth, requireRole("TUTOR", "ADMIN"), deleteAssignment);
router.patch("/:id/publish", requireAuth, requireRole("TUTOR", "ADMIN"), publishAssignment);
router.patch("/:id/close", requireAuth, requireRole("TUTOR", "ADMIN"), closeAssignment);
router.get("/:id/submissions", requireAuth, requireRole("TUTOR", "ADMIN"), getAssignmentSubmissionsOverview);
router.patch("/:id/submissions/:submissionId/review", requireAuth, requireRole("TUTOR", "ADMIN"), reviewAssignmentSubmission);
router.post("/:id/submissions", requireAuth, requireRole("STUDENT"), submitAssignment);

module.exports = router;
