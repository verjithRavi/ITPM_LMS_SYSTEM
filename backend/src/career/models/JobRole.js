const mongoose = require("mongoose");

const jobRoleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    linkedCareerRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareerRole",
      default: null,
    },
    requiredSkills: [
      {
        name: { type: String, required: true },
        minLevel: {
          type: String,
          enum: ["beginner", "intermediate", "advanced"],
          default: "beginner",
        },
      },
    ],
    keywords: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("JobRole", jobRoleSchema);
