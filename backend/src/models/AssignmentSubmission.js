const mongoose = require("mongoose");

const assignmentCriterionScoreSchema = new mongoose.Schema(
  {
    criterion: { type: String, required: true, trim: true },
    marksAwarded: { type: Number, default: 0, min: 0 },
    comment: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    submissionText: { type: String, default: "" },
    attachmentUrl: { type: String, default: "" },
    status: { type: String, enum: ["SUBMITTED"], default: "SUBMITTED" },
    submittedAt: { type: Date, default: Date.now },
    criteriaScores: { type: [assignmentCriterionScoreSchema], default: [] },
    totalMarksAwarded: { type: Number, default: null, min: 0 },
    comments: { type: String, default: "" },
    overallFeedback: { type: String, default: "" },
    gradingStatus: { type: String, enum: ["PENDING", "GRADED"], default: "PENDING" },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);
