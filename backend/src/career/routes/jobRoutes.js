const express = require("express");
const { requireAuth } = require("../../middlewares/auth.middleware");
const { getJobRoles, getJobSuggestions } = require("../controllers/jobController");

const router = express.Router();
router.use(requireAuth);

router.get("/", getJobRoles);
router.get("/suggestions", getJobSuggestions);

module.exports = router;
