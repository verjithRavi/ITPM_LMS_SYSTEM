const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { getSkills, createSkill, updateSkill, deleteSkill } = require("../controllers/skillController");

const router = express.Router();
router.use(requireAuth);

router.get("/", getSkills);
router.post("/", createSkill);
router.put("/:id", updateSkill);
router.delete("/:id", deleteSkill);

module.exports = router;
