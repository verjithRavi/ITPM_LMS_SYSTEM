const mongoose = require("mongoose");

const QUIZ_STATUSES = ["DRAFT", "PUBLISHED"];
const QUESTION_TYPES = ["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "FILL_IN_THE_BLANKS"];

const quizQuestionSchema = new mongoose.Schema(
  {
    questionType: { type: String, enum: QUESTION_TYPES, required: true },
    questionText: { type: String, required: true, trim: true },
    options: { type: [String], default: [] },
    correctAnswer: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, min: 0 },
    topicCategory: { type: String, required: true, trim: true },
  },
  { _id: true }
);

quizQuestionSchema.pre("validate", function () {
  this.options = Array.isArray(this.options)
    ? this.options.map((option) => String(option).trim()).filter(Boolean)
    : [];

  if (this.questionType === "MCQ") {
    if (this.options.length < 2) {
      throw new Error("MCQ questions must include at least two options.");
    }
  } else if (this.questionType === "TRUE_FALSE") {
    this.options = ["True", "False"];
  } else {
    this.options = [];
  }

  if (!this.correctAnswer) {
    throw new Error("Each quiz question must include a correct answer.");
  }
});

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    moduleName: { type: String, required: true, trim: true },
    totalMarks: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },
    instructions: { type: String, required: true, trim: true },
    status: { type: String, enum: QUIZ_STATUSES, default: "PUBLISHED" },
    questions: {
      type: [quizQuestionSchema],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: "Quiz must include at least one question.",
      },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
