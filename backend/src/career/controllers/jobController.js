const { getJobSuggestionsForUser } = require("../services/jobMatchService");

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

module.exports = { getJobSuggestions };
