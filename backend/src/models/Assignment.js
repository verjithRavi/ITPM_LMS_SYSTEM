const mongoose = require("mongoose");

const SUBMISSION_TYPES = ["PDF", "DOCX", "ZIP", "TEXT"];
const ASSIGNMENT_STATUSES = ["DRAFT", "PUBLISHED"];

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    moduleName: { type: String, required: true, trim: true },
    totalMarks: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },
    submissionType: { type: String, enum: SUBMISSION_TYPES, required: true },
    instructions: { type: String, required: true, trim: true },
    status: { type: String, enum: ASSIGNMENT_STATUSES, default: "PUBLISHED" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
