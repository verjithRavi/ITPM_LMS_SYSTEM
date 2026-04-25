const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "NEW_EVENT",
  "EVENT_UPDATED",
  "LOCATION_CHANGED",
  "EVENT_CANCELLED",
  "REMINDER",
  "STUDENT_REGISTRATION_REQUEST",
  "STUDENT_PASSWORD_RESET_REQUEST",
  "ASSIGNMENT_PUBLISHED",
  "ASSIGNMENT_UPDATED",
  "QUIZ_PUBLISHED",
  "QUIZ_UPDATED",
  "MODULE_ASSIGNED",
  "MODULE_RESULTS_PUBLISHED"
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: { type: String, enum: NOTIFICATION_TYPES, required: true },

    message: { type: String, required: true },

    relatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: "Event", default: null },

    isRead: { type: Boolean, default: false },

    meta: {
      reminderKey: { type: String, default: undefined },
      redirectPath: { type: String, default: undefined },
      studentId: { type: String, default: undefined },
      studentUserId: { type: String, default: undefined },
    },
  },
  { timestamps: true }
);

notificationSchema.index(
  { user: 1, relatedEvent: 1, "meta.reminderKey": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "meta.reminderKey": { $exists: true, $type: "string" },
    },
  }
);

notificationSchema.pre("validate", function stripEmptyMetaFields() {
  if (this.meta && !this.meta.reminderKey) {
    delete this.meta.reminderKey;
  }
  if (this.meta && !this.meta.redirectPath) {
    delete this.meta.redirectPath;
  }
  if (this.meta && !this.meta.studentId) {
    delete this.meta.studentId;
  }
  if (this.meta && !this.meta.studentUserId) {
    delete this.meta.studentUserId;
  }
  if (
    this.meta &&
    !this.meta.reminderKey &&
    !this.meta.redirectPath &&
    !this.meta.studentId &&
    !this.meta.studentUserId
  ) {
    this.meta = undefined;
  }
});

const Notification = mongoose.model("Notification", notificationSchema);

let indexesEnsured = false;

async function ensureNotificationIndexes() {
  if (indexesEnsured || mongoose.connection.readyState !== 1) return;
  indexesEnsured = true;

  try {
    await Notification.collection.dropIndex("user_1_relatedEvent_1_meta.reminderKey_1").catch((err) => {
      if (!err || err.codeName === "IndexNotFound" || err.codeName === "NamespaceNotFound") return;
      throw err;
    });

    await Notification.collection.createIndex(
      { user: 1, relatedEvent: 1, "meta.reminderKey": 1 },
      {
        name: "user_1_relatedEvent_1_meta.reminderKey_1",
        unique: true,
        partialFilterExpression: {
          "meta.reminderKey": { $exists: true, $type: "string" },
        },
      }
    );
  } catch (err) {
    console.error("Failed to ensure notification indexes:", err);
  }
}

if (mongoose.connection.readyState === 1) {
  void ensureNotificationIndexes();
} else {
  mongoose.connection.once("open", () => {
    void ensureNotificationIndexes();
  });
}

module.exports = Notification;
