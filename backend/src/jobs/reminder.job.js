const cron = require("node-cron");
const Event = require("../models/Event");
const Notification = require("../models/Notification");
const { getRecipientUsersForEvent } = require("../services/event-targeting");

// helper: check if current time is within window (in minutes)
function inWindow(now, targetTime, windowMinutes = 1) {
  const diffMs = Math.abs(now.getTime() - targetTime.getTime());
  return diffMs <= windowMinutes * 60 * 1000;
}

function buildReminderKey(kind) {
  // kind: "24H" or "1H"
  return `REMINDER_${kind}`;
}

async function processReminders() {
  const now = new Date();

  // fetch upcoming events (next 7 days) to reduce DB load
  const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const events = await Event.find({
    isCancelled: false,
    startsAt: { $gte: now, $lte: in7days }
  }).lean();

  for (const event of events) {
    const startsAt = new Date(event.startsAt);

    const t24h = new Date(startsAt.getTime() - 24 * 60 * 60 * 1000);
    const t1h = new Date(startsAt.getTime() - 1 * 60 * 60 * 1000);

    const shouldSend24h = inWindow(now, t24h, 1);
    const shouldSend1h = inWindow(now, t1h, 1);

    if (!shouldSend24h && !shouldSend1h) continue;

    const recipients = await getRecipientUsersForEvent(event);

    // send reminders (dedup using unique index)
    for (const recipient of recipients) {
      if (shouldSend24h) {
        try {
          await Notification.create({
            user: recipient._id,
            type: "REMINDER",
            message: `Reminder (24h): ${event.title} on ${startsAt.toLocaleString()} at ${event.location}`,
            relatedEvent: event._id,
            meta: { reminderKey: buildReminderKey("24H") }
          });
        } catch (e) {
          // duplicate key => already sent, ignore
        }
      }

      if (shouldSend1h) {
        try {
          await Notification.create({
            user: recipient._id,
            type: "REMINDER",
            message: `Reminder (1h): ${event.title} at ${event.location} starts in 1 hour`,
            relatedEvent: event._id,
            meta: { reminderKey: buildReminderKey("1H") }
          });
        } catch (e) {
          // duplicate key => already sent, ignore
        }
      }
    }
  }
}

// Run every minute
function startReminderJob() {
  cron.schedule("* * * * *", async () => {
    try {
      await processReminders();
    } catch (err) {
      console.error("Reminder job error:", err.message);
    }
  });

  console.log("Reminder job scheduled (runs every minute)");
}

module.exports = startReminderJob;
