const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  listPendingStudents,
  approveStudent,
  listStudents,
  listPasswordResetRequests,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  resetUserPasswordToUserId,
  listTutors,
  getTutorById,
  createTutor,
  updateTutor,
  deleteTutor,
} = require("../controllers/admin.controller");

router.get("/students/pending", requireAuth, requireRole("ADMIN"), listPendingStudents);
router.get("/students", requireAuth, requireRole("ADMIN"), listStudents);
router.get("/students/requests", requireAuth, requireRole("ADMIN"), listPasswordResetRequests);
router.patch("/users/:id/reset-password", requireAuth, requireRole("ADMIN"), resetUserPasswordToUserId);
router.get("/students/:id", requireAuth, requireRole("ADMIN"), getStudentById);
router.post("/students", requireAuth, requireRole("ADMIN"), createStudent);
router.patch("/students/:id", requireAuth, requireRole("ADMIN"), updateStudent);
router.patch("/students/:id/approve", requireAuth, requireRole("ADMIN"), approveStudent);
router.delete("/students/:id", requireAuth, requireRole("ADMIN"), deleteStudent);
router.get("/tutors", requireAuth, requireRole("ADMIN"), listTutors);
router.get("/tutors/:id", requireAuth, requireRole("ADMIN"), getTutorById);
router.post("/tutors", requireAuth, requireRole("ADMIN"), createTutor);
router.patch("/tutors/:id", requireAuth, requireRole("ADMIN"), updateTutor);
router.delete("/tutors/:id", requireAuth, requireRole("ADMIN"), deleteTutor);

module.exports = router;
