const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStats
} = require("../controllers/course.controller");

// Public routes (no authentication required for reading)
router.get("/", getCourses);
router.get("/stats", getCourseStats);
router.get("/:id", getCourseById);

// Protected routes (require authentication)
router.post("/", requireAuth, requireRole("ADMIN"), createCourse);
router.put("/:id", requireAuth, requireRole("ADMIN"), updateCourse);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteCourse);

module.exports = router;
