const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    skillName: { type: String, required: true, trim: true },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
  },
  { timestamps: true }
);

skillSchema.index({ userId: 1, skillName: 1 }, { unique: true });

module.exports = mongoose.model("CareerSkill", skillSchema);
