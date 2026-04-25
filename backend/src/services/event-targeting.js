const User = require("../models/User");

const TARGET_TYPES = {
  EVERYONE: "EVERYONE",
  STUDENTS_ALL: "STUDENTS_ALL",
  STUDENTS_FACULTY: "STUDENTS_FACULTY",
  STUDENTS_FACULTY_YEAR: "STUDENTS_FACULTY_YEAR",
  STUDENTS_FACULTY_YEAR_SEMESTER: "STUDENTS_FACULTY_YEAR_SEMESTER",
  TUTORS_ALL: "TUTORS_ALL",
  TUTORS_FACULTY: "TUTORS_FACULTY",
  FACULTY: "FACULTY",
  YEAR_SEM: "YEAR_SEM",
  FACULTY_YEAR_SEM: "FACULTY_YEAR_SEM",
};

const STUDENT_TARGET_TYPES = new Set([
  TARGET_TYPES.STUDENTS_ALL,
  TARGET_TYPES.STUDENTS_FACULTY,
  TARGET_TYPES.STUDENTS_FACULTY_YEAR,
  TARGET_TYPES.STUDENTS_FACULTY_YEAR_SEMESTER,
  TARGET_TYPES.FACULTY,
  TARGET_TYPES.YEAR_SEM,
  TARGET_TYPES.FACULTY_YEAR_SEM,
]);

function buildVisibilityQueryForUser(user) {
  if (user.role === "ADMIN") {
    return { isCancelled: false };
  }

  if (user.role === "STUDENT") {
    return {
      isCancelled: false,
      $or: [
        { targetType: TARGET_TYPES.EVERYONE },
        { targetType: TARGET_TYPES.STUDENTS_ALL },
        { targetType: TARGET_TYPES.STUDENTS_FACULTY, targetFaculty: user.faculty },
        {
          targetType: TARGET_TYPES.STUDENTS_FACULTY_YEAR,
          targetFaculty: user.faculty,
          targetYear: user.year,
        },
        {
          targetType: TARGET_TYPES.STUDENTS_FACULTY_YEAR_SEMESTER,
          targetFaculty: user.faculty,
          targetYear: user.year,
          targetSemester: user.semester,
        },
        { targetType: TARGET_TYPES.FACULTY, targetFaculty: user.faculty },
        { targetType: TARGET_TYPES.YEAR_SEM, targetYear: user.year, targetSemester: user.semester },
        {
          targetType: TARGET_TYPES.FACULTY_YEAR_SEM,
          targetFaculty: user.faculty,
          targetYear: user.year,
          targetSemester: user.semester,
        },
      ],
    };
  }

  if (user.role === "TUTOR") {
    return {
      isCancelled: false,
      $or: [
        { targetType: TARGET_TYPES.EVERYONE },
        { targetType: TARGET_TYPES.TUTORS_ALL },
        { targetType: TARGET_TYPES.TUTORS_FACULTY, targetFaculty: user.faculty },
        { createdBy: user._id },
      ],
    };
  }

  return { isCancelled: false, _id: null };
}

function buildRecipientQueryForRole(event, role) {
  if (event.targetType === TARGET_TYPES.EVERYONE) {
    return { role };
  }

  if (role === "STUDENT") {
    if (event.targetType === TARGET_TYPES.STUDENTS_ALL) return { role };
    if (event.targetType === TARGET_TYPES.STUDENTS_FACULTY) {
      return { role, faculty: event.targetFaculty };
    }
    if (event.targetType === TARGET_TYPES.STUDENTS_FACULTY_YEAR) {
      return { role, faculty: event.targetFaculty, year: event.targetYear };
    }
    if (event.targetType === TARGET_TYPES.STUDENTS_FACULTY_YEAR_SEMESTER) {
      return {
        role,
        faculty: event.targetFaculty,
        year: event.targetYear,
        semester: event.targetSemester,
      };
    }

    if (event.targetType === TARGET_TYPES.FACULTY) {
      return { role, faculty: event.targetFaculty };
    }
    if (event.targetType === TARGET_TYPES.YEAR_SEM) {
      return { role, year: event.targetYear, semester: event.targetSemester };
    }
    if (event.targetType === TARGET_TYPES.FACULTY_YEAR_SEM) {
      return {
        role,
        faculty: event.targetFaculty,
        year: event.targetYear,
        semester: event.targetSemester,
      };
    }
  }

  if (role === "TUTOR") {
    if (event.targetType === TARGET_TYPES.TUTORS_ALL) return { role };
    if (event.targetType === TARGET_TYPES.TUTORS_FACULTY) {
      return { role, faculty: event.targetFaculty };
    }
  }

  return { role, _id: null };
}

async function getRecipientUsersForEvent(event) {
  const studentsQuery = buildRecipientQueryForRole(event, "STUDENT");
  const tutorsQuery = buildRecipientQueryForRole(event, "TUTOR");
  const recipients = await User.find({
    $or: [studentsQuery, tutorsQuery],
  });

  // If a tutor creates a student-targeted event, the event is also for that tutor.
  if (event?.createdBy && STUDENT_TARGET_TYPES.has(event.targetType)) {
    let creatorId = null;
    let creatorRole = null;

    if (typeof event.createdBy === "object" && event.createdBy !== null) {
      creatorId = event.createdBy._id || event.createdBy;
      creatorRole = event.createdBy.role || null;
    } else {
      creatorId = event.createdBy;
    }

    if (creatorId && !creatorRole) {
      const creatorUser = await User.findById(creatorId).select("_id role");
      creatorRole = creatorUser?.role || null;
    }

    if (creatorId && creatorRole === "TUTOR") {
      const alreadyIncluded = recipients.some(
        (recipient) => String(recipient._id) === String(creatorId)
      );
      if (!alreadyIncluded) {
        const tutorCreator = await User.findById(creatorId);
        if (tutorCreator) {
          recipients.push(tutorCreator);
        }
      }
    }
  }

  return recipients;
}

module.exports = {
  TARGET_TYPES,
  buildVisibilityQueryForUser,
  getRecipientUsersForEvent,
};
