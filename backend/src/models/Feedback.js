const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["STUDENT", "TUTOR"],
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

feedbackSchema.index({ role: 1, createdAt: -1 });
feedbackSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);
