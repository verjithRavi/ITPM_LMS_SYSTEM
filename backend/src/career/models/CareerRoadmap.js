const mongoose = require("mongoose");

const roadmapStepSchema = new mongoose.Schema({
  title: { type: String, required: true },
  skills: [String],
  certifications: [String],
  projects: [String],
  resources: [String],
});

const careerRoadmapSchema = new mongoose.Schema(
  {
    careerRoleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareerRole",
      required: true,
      unique: true,
    },
    steps: [roadmapStepSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("CareerRoadmap", careerRoadmapSchema);
