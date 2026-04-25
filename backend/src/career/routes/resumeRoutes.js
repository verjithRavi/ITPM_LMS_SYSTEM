const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { createResumeScore, getResumeScoreHistory, deleteResumeScore } = require("../controllers/resumeController");

const router = express.Router();
router.use(requireAuth);

router.post("/score", createResumeScore);
router.get("/scores/history", getResumeScoreHistory);
router.delete("/scores/:id", deleteResumeScore);

module.exports = router;
