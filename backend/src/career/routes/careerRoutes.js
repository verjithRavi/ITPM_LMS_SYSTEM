const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { getCareerRoles, getCareerRoadmapByRoleId, getRoadmapProgress, updateRoadmapProgress } = require("../controllers/careerController");

const router = express.Router();
router.use(requireAuth);

router.get("/", getCareerRoles);
router.get("/:id/roadmap", getCareerRoadmapByRoleId);
router.get("/:id/progress", getRoadmapProgress);
router.put("/:id/progress", updateRoadmapProgress);

module.exports = router;
