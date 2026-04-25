const mongoose = require("mongoose");

const moduleResultSchema = new mongoose.Schema(
  {
    module: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    obtainedMarks: { type: Number, default: 0, min: 0 },
    totalMarks: { type: Number, default: 100, min: 0 },
    percentage: { type: Number, default: 0, min: 0 },
    grade: { type: String, default: "F", trim: true },
    passStatus: { type: String, enum: ["PASS", "CONDITIONAL_PASS", "FAIL", "ABSENT"], default: "FAIL" },
    publicationStatus: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
    hasPendingGrading: { type: Boolean, default: false },
    calculatedAt: { type: Date, default: Date.now },
    publishedAt: { type: Date, default: null },
    breakdown: {
      assignmentObtained: { type: Number, default: 0 },
      assignmentTotal: { type: Number, default: 0 },
      quizObtained: { type: Number, default: 0 },
      quizTotal: { type: Number, default: 0 },
      combinedObtained: { type: Number, default: 0 },
      combinedTotal: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

moduleResultSchema.index({ module: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("ModuleResult", moduleResultSchema);
