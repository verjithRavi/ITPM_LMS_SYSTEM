const Notification = require("../models/Notification");
const Event = require("../models/Event");

// GET /api/notifications
exports.listMyNotifications = async (req, res) => {
  try {
    const items = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({ notifications: items });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, isRead: false });
    return res.json({ unreadCount: count });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!n) return res.status(404).json({ message: "Notification not found." });
    return res.json({ notification: n });
  } catch (err) {
    return res.status(400).json({ message: "Invalid notification id." });
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );
    return res.json({ message: "All notifications marked as read." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

// GET /api/notifications/:id/event
exports.getNotificationEvent = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    if (!notification.relatedEvent) {
      return res.status(404).json({ message: "No related event for this notification.", event: null });
    }

    const event = await Event.findById(notification.relatedEvent).lean();
    if (!event) {
      return res.json({ event: null, message: "Event record no longer exists." });
    }

    return res.json({ event });
  } catch (err) {
    return res.status(400).json({ message: "Invalid notification id." });
  }
};
