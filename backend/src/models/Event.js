const mongoose = require("mongoose");

const TARGET_TYPES = [
  "EVERYONE",
  "STUDENTS_ALL",
  "STUDENTS_FACULTY",
  "STUDENTS_FACULTY_YEAR",
  "STUDENTS_FACULTY_YEAR_SEMESTER",
  "TUTORS_ALL",
  "TUTORS_FACULTY",
  "FACULTY",
  "YEAR_SEM",
  "FACULTY_YEAR_SEM",
];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // store event date/time as one field (easy for reminders later)
    startsAt: { type: Date, required: true },

    location: { type: String, required: true, trim: true },

    // targeting rules
    targetType: { type: String, enum: TARGET_TYPES, required: true },

    targetFaculty: { type: String, default: null },
    targetYear: { type: Number, default: null },
    targetSemester: { type: Number, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    isCancelled: { type: Boolean, default: false }
  },
  { timestamps: true }
);

eventSchema.pre("validate", function () {
  if (this.targetType === "EVERYONE" || this.targetType === "STUDENTS_ALL" || this.targetType === "TUTORS_ALL") {
    this.targetFaculty = null;
    this.targetYear = null;
    this.targetSemester = null;
  }

  if (
    this.targetType === "FACULTY" ||
    this.targetType === "STUDENTS_FACULTY" ||
    this.targetType === "TUTORS_FACULTY"
  ) {
    if (!this.targetFaculty) throw new Error(`${this.targetType} target requires targetFaculty.`);
    this.targetYear = null;
    this.targetSemester = null;
  }

  if (this.targetType === "YEAR_SEM") {
    if (this.targetYear == null || this.targetSemester == null) {
      throw new Error("YEAR_SEM target requires targetYear and targetSemester.");
    }
    this.targetFaculty = null;
  }

  if (this.targetType === "STUDENTS_FACULTY_YEAR") {
    if (!this.targetFaculty || this.targetYear == null) {
      throw new Error("STUDENTS_FACULTY_YEAR requires targetFaculty and targetYear.");
    }
    this.targetSemester = null;
  }

  if (this.targetType === "FACULTY_YEAR_SEM" || this.targetType === "STUDENTS_FACULTY_YEAR_SEMESTER") {
    if (!this.targetFaculty || this.targetYear == null || this.targetSemester == null) {
      throw new Error(`${this.targetType} requires targetFaculty, targetYear, targetSemester.`);
    }
  }
});

module.exports = mongoose.model("Event", eventSchema);
