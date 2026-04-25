const Skill = require("../models/Skill");

const getSkills = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const skills = await Skill.find({ userId }).sort({ updatedAt: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: skills.length, data: skills });
  } catch (error) {
    next(error);
  }
};

const createSkill = async (req, res, next) => {
  try {
    const { skillName, level } = req.body;
    const userId = req.user._id.toString();

    if (!skillName || !skillName.trim()) {
      return res.status(400).json({ success: false, message: "skillName is required" });
    }

    const normalizedSkillName = skillName.trim();
    const existingSkill = await Skill.findOne({
      userId,
      skillName: { $regex: new RegExp(`^${normalizedSkillName}$`, "i") },
    });

    if (existingSkill) {
      return res.status(409).json({ success: false, message: "Skill already exists for this user" });
    }

    const skill = await Skill.create({ userId, skillName: normalizedSkillName, level: level || "beginner" });
    res.status(201).json({ success: true, message: "Skill created successfully", data: skill });
  } catch (error) {
    next(error);
  }
};

const updateSkill = async (req, res, next) => {
  try {
    const { skillName, level } = req.body;
    const userId = req.user._id.toString();

    const skill = await Skill.findOne({ _id: req.params.id, userId });
    if (!skill) return res.status(404).json({ success: false, message: "Skill not found" });

    if (skillName !== undefined) {
      if (!skillName.trim()) return res.status(400).json({ success: false, message: "skillName cannot be empty" });

      const normalizedSkillName = skillName.trim();
      const duplicateSkill = await Skill.findOne({
        _id: { $ne: skill._id },
        userId,
        skillName: { $regex: new RegExp(`^${normalizedSkillName}$`, "i") },
      });

      if (duplicateSkill) return res.status(409).json({ success: false, message: "Another skill with this name already exists" });
      skill.skillName = normalizedSkillName;
    }

    if (level !== undefined) skill.level = level;
    await skill.save();
    res.status(200).json({ success: true, message: "Skill updated successfully", data: skill });
  } catch (error) {
    next(error);
  }
};

const deleteSkill = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const skill = await Skill.findOneAndDelete({ _id: req.params.id, userId });
    if (!skill) return res.status(404).json({ success: false, message: "Skill not found" });
    res.status(200).json({ success: true, message: "Skill deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSkills, createSkill, updateSkill, deleteSkill };
