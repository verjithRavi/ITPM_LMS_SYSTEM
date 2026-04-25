const mongoose = require("mongoose");

const resumeScoreSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    cvId: { type: mongoose.Schema.Types.ObjectId, ref: "Cv" },
    targetRoleId: { type: mongoose.Schema.Types.ObjectId, ref: "JobRole", default: null },
    score: { type: Number, min: 0, max: 100 },
    missingKeywords: [String],
    suggestions: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ResumeScore", resumeScoreSchema);
