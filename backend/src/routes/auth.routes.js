const router = require("express").Router();
const { register, login, approvalStatus, requestStudentPasswordReset } = require("../controllers/auth.controller");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password-request", requestStudentPasswordReset);
router.get("/approval-status", approvalStatus);

module.exports = router;
