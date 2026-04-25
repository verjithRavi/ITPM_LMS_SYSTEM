const mongoose = require("mongoose");
const CareerRole = require("../models/CareerRole");
const CareerRoadmap = require("../models/CareerRoadmap");
const RoadmapProgress = require("../models/RoadmapProgress");

const getCareerRoles = async (req, res, next) => {
  try {
    const careers = await CareerRole.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: careers.length, data: careers });
  } catch (error) {
    next(error);
  }
};

const getCareerRoadmapByRoleId = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid career role id" });

    const career = await CareerRole.findById(id);
    if (!career) return res.status(404).json({ success: false, message: "Career role not found" });

    const roadmap = await CareerRoadmap.findOne({ careerRoleId: id }).populate("careerRoleId", "title description");
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found for this career role" });

    res.status(200).json({ success: true, data: roadmap });
  } catch (error) {
    next(error);
  }
};

const getRoadmapProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid career role id" });

    const career = await CareerRole.findById(id);
    if (!career) return res.status(404).json({ success: false, message: "Career role not found" });

    const roadmap = await CareerRoadmap.findOne({ careerRoleId: id });
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found for this career role" });

    let progress = await RoadmapProgress.findOne({ userId, careerRoleId: id });
    if (!progress) {
      progress = { userId, careerRoleId: id, completedStepIndexes: [] };
    }

    const totalSteps = roadmap.steps.length;
    const completedCount = progress.completedStepIndexes.length;
    const completionPercentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

    res.status(200).json({
      success: true,
      data: { userId: progress.userId, careerRoleId: progress.careerRoleId, completedStepIndexes: progress.completedStepIndexes, totalSteps, completedCount, completionPercentage },
    });
  } catch (error) {
    next(error);
  }
};

const updateRoadmapProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completedStepIndexes } = req.body;
    const userId = req.user._id.toString();

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid career role id" });
    if (!Array.isArray(completedStepIndexes)) return res.status(400).json({ success: false, message: "completedStepIndexes must be an array" });

    const career = await CareerRole.findById(id);
    if (!career) return res.status(404).json({ success: false, message: "Career role not found" });

    const roadmap = await CareerRoadmap.findOne({ careerRoleId: id });
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found for this career role" });

    const totalSteps = roadmap.steps.length;
    const sanitizedIndexes = [...new Set(completedStepIndexes)]
      .filter((index) => Number.isInteger(index))
      .filter((index) => index >= 0 && index < totalSteps)
      .sort((a, b) => a - b);

    const progress = await RoadmapProgress.findOneAndUpdate(
      { userId, careerRoleId: id },
      { userId, careerRoleId: id, completedStepIndexes: sanitizedIndexes },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const completedCount = progress.completedStepIndexes.length;
    const completionPercentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

    res.status(200).json({
      success: true,
      message: "Roadmap progress updated successfully",
      data: { ...progress.toObject(), totalSteps, completedCount, completionPercentage },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCareerRoles, getCareerRoadmapByRoleId, getRoadmapProgress, updateRoadmapProgress };
