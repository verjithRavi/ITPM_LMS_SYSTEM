const JobRole = require("../models/JobRole");
const { getJobSuggestionsForUser } = require("../services/jobMatchService");

const getJobRoles = async (req, res, next) => {
  try {
    const roles = await JobRole.find().select("title keywords requiredSkills").sort({ title: 1 });
    res.status(200).json({ success: true, count: roles.length, data: roles });
  } catch (error) {
    next(error);
  }
};

const getJobSuggestions = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const { targetCareer } = req.query;
    const suggestions = await getJobSuggestionsForUser({ userId, targetCareer });
    res.status(200).json({ success: true, count: suggestions.length, data: suggestions });
  } catch (error) {
    next(error);
  }
};

module.exports = { getJobRoles, getJobSuggestions };
