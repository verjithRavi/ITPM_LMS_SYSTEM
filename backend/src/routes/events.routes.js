const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { createEvent, listEvents } = require("../controllers/events.controller");
const { updateEvent, deleteEvent } = require("../controllers/events.controller");


// list events for logged-in user (student filtered)
router.get("/", requireAuth, listEvents);

// create event (only ADMIN or TUTOR)
router.post("/", requireAuth, requireRole("ADMIN", "TUTOR"), createEvent);

router.put("/:id", requireAuth, requireRole("ADMIN", "TUTOR"), updateEvent);
router.delete("/:id", requireAuth, requireRole("ADMIN", "TUTOR"), deleteEvent);

module.exports = router;
