const router = require("express").Router();

router.get("/", (req, res) => {
  res.json({ status: "ok", service: "lms-component-backend" });
});

module.exports = router;