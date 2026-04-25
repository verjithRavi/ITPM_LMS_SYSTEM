const mongoose = require("mongoose");

const quizAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: { type: String, default: "" },
    isCorrect: { type: Boolean, default: false },
    marksAwarded: { type: Number, default: 0 },
    reviewComment: { type: String, default: "" },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["STARTED", "SUBMITTED"], default: "STARTED" },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    answers: { type: [quizAnswerSchema], default: [] },
    score: { type: Number, default: 0 },
    reviewStatus: { type: String, enum: ["AUTO_GRADED", "REVIEWED"], default: "AUTO_GRADED" },
    overallFeedback: { type: String, default: "" },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

quizAttemptSchema.index({ quiz: 1, student: 1, status: 1 });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
