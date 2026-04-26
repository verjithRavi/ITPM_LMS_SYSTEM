const mongoose = require("mongoose");
const Cv = require("../models/Cv");
const ResumeScore = require("../models/ResumeScore");
const { scoreResume } = require("../services/resumeScoringService");

const createResumeScore = async (req, res, next) => {
  try {
    const { cvId, targetRoleId } = req.body;
    const userId = req.user._id.toString();

    if (!cvId) return res.status(400).json({ success: false, message: "cvId is required" });
    if (!mongoose.Types.ObjectId.isValid(cvId)) return res.status(400).json({ success: false, message: "Invalid cvId" });
    if (targetRoleId && !mongoose.Types.ObjectId.isValid(targetRoleId)) return res.status(400).json({ success: false, message: "Invalid targetRoleId" });

    const cv = await Cv.findOne({ _id: cvId, userId });
    if (!cv) return res.status(404).json({ success: false, message: "CV not found" });

    const result = await scoreResume({ cv, targetRoleId });

    const savedScore = await ResumeScore.create({
      userId,
      cvId: cv._id,
      targetRoleId: targetRoleId || null,
      score: result.score,
      missingKeywords: result.missingKeywords,
      suggestions: result.suggestions,
    });

    const populatedScore = await ResumeScore.findById(savedScore._id)
      .populate("cvId", "data.personal.fullName status updatedAt")
      .populate("targetRoleId", "title keywords");

    res.status(201).json({
      success: true,
      message: "Resume scored successfully",
      data: { ...populatedScore.toObject(), breakdown: result.breakdown },
    });
  } catch (error) {
    next(error);
  }
};

const getResumeScoreHistory = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const history = await ResumeScore.find({ userId })
      .populate("cvId", "data.personal.fullName status updatedAt")
      .populate("targetRoleId", "title keywords")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    next(error);
  }
};

const deleteResumeScore = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const deletedScore = await ResumeScore.findOneAndDelete({ _id: req.params.id, userId });
    if (!deletedScore) return res.status(404).json({ success: false, message: "Resume score history item not found" });
    res.status(200).json({ success: true, message: "Resume score history item deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { createResumeScore, getResumeScoreHistory, deleteResumeScore };
