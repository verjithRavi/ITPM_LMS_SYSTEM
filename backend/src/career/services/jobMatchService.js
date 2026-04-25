const Skill = require("../models/Skill");
const JobRole = require("../models/JobRole");

const levelRank = { beginner: 1, intermediate: 2, advanced: 3 };
const normalizeText = (value = "") => String(value).trim().toLowerCase();

const getUserSkillsMap = async (userId) => {
  const skills = await Skill.find({ userId });
  const skillMap = new Map();
  skills.forEach((skill) => {
    skillMap.set(normalizeText(skill.skillName), {
      name: skill.skillName,
      level: skill.level,
      rank: levelRank[skill.level] || 0,
    });
  });
  return skillMap;
};

const calculateJobMatch = (jobRole, userSkillsMap) => {
  const requiredSkills = jobRole.requiredSkills || [];
  if (requiredSkills.length === 0) return { matchPercentage: 0, matchedSkills: [], missingSkills: [] };

  let earnedPoints = 0;
  const totalPoints = requiredSkills.length;
  const matchedSkills = [];
  const missingSkills = [];

  requiredSkills.forEach((requiredSkill) => {
    const requiredName = normalizeText(requiredSkill.name);
    const requiredLevel = requiredSkill.minLevel || "beginner";
    const requiredRank = levelRank[requiredLevel] || 1;
    const userSkill = userSkillsMap.get(requiredName);

    if (!userSkill) {
      missingSkills.push({ name: requiredSkill.name, requiredLevel, reason: "Skill not added yet" });
      return;
    }

    if (userSkill.rank >= requiredRank) {
      earnedPoints += 1;
      matchedSkills.push({ name: requiredSkill.name, userLevel: userSkill.level, requiredLevel });
    } else {
      missingSkills.push({ name: requiredSkill.name, userLevel: userSkill.level, requiredLevel, reason: "Skill level is below requirement" });
    }
  });

  return { matchPercentage: Math.round((earnedPoints / totalPoints) * 100), matchedSkills, missingSkills };
};

const getJobSuggestionsForUser = async ({ userId, targetCareer }) => {
  const userSkillsMap = await getUserSkillsMap(userId);
  const filter = {};
  if (targetCareer && targetCareer.trim()) {
    filter.title = { $regex: targetCareer.trim(), $options: "i" };
  }

  const jobRoles = await JobRole.find(filter).populate("linkedCareerRoleId", "title description").sort({ createdAt: -1 });

  const suggestions = jobRoles.map((jobRole) => {
    const matchResult = calculateJobMatch(jobRole, userSkillsMap);
    return {
      _id: jobRole._id,
      title: jobRole.title,
      linkedCareerRoleId: jobRole.linkedCareerRoleId,
      requiredSkills: jobRole.requiredSkills,
      keywords: jobRole.keywords || [],
      matchPercentage: matchResult.matchPercentage,
      matchedSkills: matchResult.matchedSkills,
      missingSkills: matchResult.missingSkills,
    };
  });

  suggestions.sort((a, b) => b.matchPercentage - a.matchPercentage);
  return suggestions;
};

module.exports = { getJobSuggestionsForUser };
