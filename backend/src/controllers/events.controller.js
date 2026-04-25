const Event = require("../models/Event");
const Notification = require("../models/Notification");
const {
  buildVisibilityQueryForUser,
  getRecipientUsersForEvent,
} = require("../services/event-targeting");

const TUTOR_ALLOWED_TARGET_TYPES = new Set([
  "STUDENTS_ALL",
  "STUDENTS_FACULTY",
  "STUDENTS_FACULTY_YEAR",
  "STUDENTS_FACULTY_YEAR_SEMESTER",
  "FACULTY",
  "YEAR_SEM",
  "FACULTY_YEAR_SEM",
]);

async function findAudienceClashAtSameDateTime({ startsAt, candidateEventLike, excludeEventId = null }) {
  const sameTimeEvents = await Event.find({
    isCancelled: false,
    startsAt: new Date(startsAt),
    ...(excludeEventId ? { _id: { $ne: excludeEventId } } : {}),
  }).populate("createdBy", "_id role");

  if (sameTimeEvents.length === 0) return null;

  const candidateRecipients = await getRecipientUsersForEvent(candidateEventLike);
  const candidateRecipientIds = new Set(
    candidateRecipients.map((recipient) => String(recipient._id))
  );

  if (candidateRecipientIds.size === 0) return null;

  for (const existingEvent of sameTimeEvents) {
    const existingRecipients = await getRecipientUsersForEvent(existingEvent);
    const hasOverlap = existingRecipients.some((recipient) =>
      candidateRecipientIds.has(String(recipient._id))
    );
    if (hasOverlap) return existingEvent;
  }

  return null;
}

function excludeActorFromRecipients(recipients, actor) {
  if (!actor || actor.role !== "TUTOR") return recipients;
  return recipients.filter((recipient) => String(recipient._id) !== String(actor._id));
}

// Tutor/Admin create event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, startsAt, location, targetType, targetFaculty, targetYear, targetSemester } = req.body;

    if (!title || !startsAt || !location || !targetType) {
      return res.status(400).json({ message: "title, startsAt, location, targetType are required." });
    }
    if (req.user.role === "TUTOR" && !TUTOR_ALLOWED_TARGET_TYPES.has(targetType)) {
      return res.status(403).json({ message: "Tutors can create events for students only." });
    }

    const eventLike = {
      startsAt: new Date(startsAt),
      targetType,
      targetFaculty: targetFaculty ?? null,
      targetYear: targetYear ?? null,
      targetSemester: targetSemester ?? null,
      createdBy: req.user,
      isCancelled: false,
    };

    const clash = await findAudienceClashAtSameDateTime({
      startsAt: eventLike.startsAt,
      candidateEventLike: eventLike,
    });
    if (clash) {
      return res.status(409).json({
        message:
          "Event time clash detected. Another event already exists at this same date/time for one or more same students/tutors.",
      });
    }

    const event = await Event.create({
      title,
      description: description ?? "",
      startsAt: new Date(startsAt),
      location,
      targetType,
      targetFaculty: targetFaculty ?? null,
      targetYear: targetYear ?? null,
      targetSemester: targetSemester ?? null,
      createdBy: req.user._id,
    });

    const recipients = excludeActorFromRecipients(await getRecipientUsersForEvent(event), req.user);

    for (const recipient of recipients) {
      await Notification.create({
        user: recipient._id,
        type: "NEW_EVENT",
        message: `New Event: ${event.title} on ${event.startsAt.toLocaleString()} at ${event.location}`,
        relatedEvent: event._id,
      });
    }

    return res.status(201).json({ event });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

// Student/Admin/Tutor fetch events (role filtered)
exports.listEvents = async (req, res) => {
  try {
    const query = buildVisibilityQueryForUser(req.user);
    const events = await Event.find(query).sort({ startsAt: 1 });
    return res.json({ events });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (req.user.role === "TUTOR" && String(event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Tutors can update only their own events." });
    }

    const oldLocation = event.location;

    const { title, description, startsAt, location, targetType, targetFaculty, targetYear, targetSemester } = req.body;

    if (title !== undefined) event.title = title;
    if (description !== undefined) event.description = description;
    if (startsAt !== undefined) event.startsAt = new Date(startsAt);
    if (location !== undefined) event.location = location;
    if (targetType !== undefined) event.targetType = targetType;
    if (req.user.role === "TUTOR" && !TUTOR_ALLOWED_TARGET_TYPES.has(event.targetType)) {
      return res.status(403).json({ message: "Tutors can target students only." });
    }
    if (targetFaculty !== undefined) event.targetFaculty = targetFaculty;
    if (targetYear !== undefined) event.targetYear = targetYear;
    if (targetSemester !== undefined) event.targetSemester = targetSemester;

    const clash = await findAudienceClashAtSameDateTime({
      startsAt: event.startsAt,
      candidateEventLike: {
        startsAt: event.startsAt,
        targetType: event.targetType,
        targetFaculty: event.targetFaculty,
        targetYear: event.targetYear,
        targetSemester: event.targetSemester,
        createdBy: req.user.role === "TUTOR" ? req.user : event.createdBy,
        isCancelled: false,
      },
      excludeEventId: event._id,
    });
    if (clash) {
      return res.status(409).json({
        message:
          "Event time clash detected. Another event already exists at this same date/time for one or more same students/tutors.",
      });
    }

    await event.save();

    const recipients = excludeActorFromRecipients(await getRecipientUsersForEvent(event), req.user);

    let notificationType = "EVENT_UPDATED";
    let message = `Event Updated: ${event.title}`;

    if (oldLocation !== event.location) {
      notificationType = "LOCATION_CHANGED";
      message = `Location changed: ${event.title} moved to ${event.location}`;
    }

    for (const recipient of recipients) {
      await Notification.create({
        user: recipient._id,
        type: notificationType,
        message,
        relatedEvent: event._id,
      });
    }

    return res.json({ event });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found." });
    if (req.user.role === "TUTOR" && String(event.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Tutors can delete only their own events." });
    }

    if (event.isCancelled) {
      return res.json({ event, message: "Event already cancelled." });
    }

    event.isCancelled = true;
    await event.save();

    const recipients = await getRecipientUsersForEvent(event);

    for (const recipient of recipients) {
      await Notification.create({
        user: recipient._id,
        type: "EVENT_CANCELLED",
        message: `Event Cancelled: ${event.title} scheduled on ${event.startsAt.toLocaleString()}`,
        relatedEvent: event._id,
      });
    }

    return res.json({ event, message: "Event cancelled and users notified." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
