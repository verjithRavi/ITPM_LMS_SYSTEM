const mongoose = require("mongoose");

const roadmapProgressSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    careerRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareerRole",
      required: true,
    },
    completedStepIndexes: [Number],
  },
  { timestamps: true }
);

roadmapProgressSchema.index({ userId: 1, careerRoleId: 1 }, { unique: true });

module.exports = mongoose.model("RoadmapProgress", roadmapProgressSchema);
