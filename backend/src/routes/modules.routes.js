const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  listModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule,
  calculateModuleResults,
  listModuleResults,
  publishModuleResults,
  listMyModuleResults,
} = require("../controllers/modules.controller");

router.get("/", requireAuth, listModules);
router.get("/my-results", requireAuth, requireRole("STUDENT"), listMyModuleResults);
router.get("/:id", requireAuth, getModuleById);
router.get("/:id/final-results", requireAuth, requireRole("TUTOR", "ADMIN", "STUDENT"), listModuleResults);
router.post("/:id/final-results/calculate", requireAuth, requireRole("TUTOR", "ADMIN"), calculateModuleResults);
router.patch("/:id/final-results/publish", requireAuth, requireRole("TUTOR", "ADMIN"), publishModuleResults);
router.post("/", requireAuth, requireRole("ADMIN"), createModule);
router.patch("/:id", requireAuth, requireRole("ADMIN"), updateModule);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteModule);

module.exports = router;
