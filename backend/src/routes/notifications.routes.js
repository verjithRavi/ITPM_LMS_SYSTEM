const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const {
  listMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getNotificationEvent,
} = require("../controllers/notifications.controller");

router.get("/", requireAuth, listMyNotifications);
router.get("/unread-count", requireAuth, getUnreadCount);
router.get("/:id/event", requireAuth, getNotificationEvent);
router.patch("/read-all", requireAuth, markAllAsRead);
router.patch("/:id/read", requireAuth, markAsRead);

module.exports = router;
