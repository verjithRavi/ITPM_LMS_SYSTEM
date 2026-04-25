const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { getJobSuggestions } = require("../controllers/jobController");

const router = express.Router();
router.use(requireAuth);

router.get("/suggestions", getJobSuggestions);

module.exports = router;
