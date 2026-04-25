const express = require("express");
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");
const {
  getCvTemplatesAdmin, createCvTemplate, updateCvTemplate, deleteCvTemplate,
  getCareerRolesAdmin, createCareerRole, updateCareerRole, deleteCareerRole,
  getRoadmapsAdmin, createRoadmap, updateRoadmap, deleteRoadmap,
  getJobRolesAdmin, createJobRole, updateJobRole, deleteJobRole,
} = require("../controllers/adminController");

const router = express.Router();
router.use(requireAuth, requireRole("ADMIN"));

// CV Templates
router.get("/cv-templates", getCvTemplatesAdmin);
router.post("/cv-templates", createCvTemplate);
router.put("/cv-templates/:id", updateCvTemplate);
router.delete("/cv-templates/:id", deleteCvTemplate);

// Career Roles
router.get("/careers", getCareerRolesAdmin);
router.post("/careers", createCareerRole);
router.put("/careers/:id", updateCareerRole);
router.delete("/careers/:id", deleteCareerRole);

// Roadmaps
router.get("/roadmaps", getRoadmapsAdmin);
router.post("/roadmaps", createRoadmap);
router.put("/roadmaps/:id", updateRoadmap);
router.delete("/roadmaps/:id", deleteRoadmap);

// Job Roles
router.get("/job-roles", getJobRolesAdmin);
router.post("/job-roles", createJobRole);
router.put("/job-roles/:id", updateJobRole);
router.delete("/job-roles/:id", deleteJobRole);

module.exports = router;
