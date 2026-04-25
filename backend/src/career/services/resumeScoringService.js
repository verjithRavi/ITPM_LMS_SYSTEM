const JobRole = require("../models/JobRole");

const normalizeText = (text = "") => String(text).toLowerCase().trim();

const extractCvText = (cvData = {}) => {
  const parts = [];
  const personal = cvData.personal || {};
  const summary = cvData.summary || "";

  if (personal.fullName) parts.push(personal.fullName);
  if (personal.email) parts.push(personal.email);
  if (personal.location) parts.push(personal.location);
  if (summary) parts.push(summary);

  (cvData.education || []).forEach((item) => {
    if (item.institution) parts.push(item.institution);
    if (item.degree) parts.push(item.degree);
    if (item.fieldOfStudy) parts.push(item.fieldOfStudy);
    if (item.description) parts.push(item.description);
  });

  (cvData.experience || []).forEach((item) => {
    if (item.company) parts.push(item.company);
    if (item.jobTitle) parts.push(item.jobTitle);
    if (item.description) parts.push(item.description);
  });

  (cvData.projects || []).forEach((item) => {
    if (item.title) parts.push(item.title);
    if (item.description) parts.push(item.description);
    (item.technologies || []).forEach((tech) => parts.push(tech));
  });

  (cvData.skills || []).forEach((skill) => parts.push(skill));

  (cvData.links || []).forEach((link) => {
    if (link.label) parts.push(link.label);
    if (link.url) parts.push(link.url);
  });

  return normalizeText(parts.join(" "));
};

const calculateCompletenessScore = (cvData = {}) => {
  let score = 0;
  const personal = cvData.personal || {};
  const education = cvData.education || [];
  const experience = cvData.experience || [];
  const projects = cvData.projects || [];
  const skills = cvData.skills || [];
  const links = cvData.links || [];
  const summary = cvData.summary || "";

  if (personal.fullName) score += 10;
  if (personal.email) score += 5;
  if (personal.phone) score += 5;
  if (personal.location) score += 5;
  if (summary && summary.trim().length >= 10) score += 15;
  if (education.length > 0) score += 15;
  if (experience.length > 0) score += 15;
  if (projects.length > 0) score += 15;
  if (skills.length >= 3) score += 10;
  if (links.length > 0 || personal.linkedin || personal.github || personal.portfolio) score += 5;

  return Math.min(score, 100);
};

const calculateProjectStrengthScore = (cvData = {}) => {
  const projects = cvData.projects || [];
  if (projects.length === 0) return 0;

  let score = 0;
  projects.forEach((project) => {
    if (project.title) score += 5;
    if (project.description && project.description.trim().length >= 20) score += 8;
    if (project.link) score += 4;
    if (project.technologies && project.technologies.length > 0) score += 8;
  });

  return Math.min(score, 25);
};

const calculateKeywordMatchScore = (cvText, keywords = []) => {
  if (!keywords.length) return { score: 0, matchedKeywords: [], missingKeywords: [] };

  const matchedKeywords = [];
  const missingKeywords = [];

  keywords.forEach((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedKeyword && cvText.includes(normalizedKeyword)) {
      matchedKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });

  return { score: Math.round((matchedKeywords.length / keywords.length) * 100), matchedKeywords, missingKeywords };
};

const generateSuggestions = ({ cvData, completenessScore, projectStrengthScore, missingKeywords, hasTargetRole }) => {
  const suggestions = [];
  const personal = cvData.personal || {};
  const education = cvData.education || [];
  const experience = cvData.experience || [];
  const projects = cvData.projects || [];
  const skills = cvData.skills || [];
  const summary = cvData.summary || "";

  if (!personal.fullName || !personal.email || !personal.phone) {
    suggestions.push("Complete your personal information section with full name, email, and phone number.");
  }
  if (!summary || summary.trim().length < 10) {
    suggestions.push("Add a stronger professional summary with at least a few clear sentences about your skills and goals.");
  }
  if (education.length === 0) {
    suggestions.push("Add at least one education entry to improve your resume completeness.");
  }
  if (experience.length === 0) {
    suggestions.push("Add internship, freelance, volunteer, or part-time experience if available.");
  }
  if (projects.length === 0) {
    suggestions.push("Add at least one project to demonstrate practical experience.");
  }
  if (projects.length > 0 && projectStrengthScore < 15) {
    suggestions.push("Improve your project descriptions by adding technologies used, outcomes, and project links.");
  }
  if (skills.length < 3) {
    suggestions.push("Add more relevant technical skills to strengthen your resume.");
  }
  if (hasTargetRole && missingKeywords.length > 0) {
    suggestions.push(`Add more target-role keywords to your resume, such as: ${missingKeywords.slice(0, 5).join(", ")}.`);
  }
  if (completenessScore < 60) {
    suggestions.push("Your resume is missing several important sections. Try filling all major sections before finalizing it.");
  }

  return suggestions.slice(0, 6);
};

const scoreResume = async ({ cv, targetRoleId }) => {
  const cvData = cv.data || {};
  const cvText = extractCvText(cvData);

  const completenessScore = calculateCompletenessScore(cvData);
  const projectStrengthScore = calculateProjectStrengthScore(cvData);

  let keywordScore = 0;
  let missingKeywords = [];
  let targetRole = null;

  if (targetRoleId) {
    targetRole = await JobRole.findById(targetRoleId);
    if (!targetRole) throw new Error("Target job role not found");

    const keywordMatch = calculateKeywordMatchScore(cvText, targetRole.keywords || []);
    keywordScore = keywordMatch.score;
    missingKeywords = keywordMatch.missingKeywords;
  }

  const finalScore = Math.round(
    targetRole
      ? completenessScore * 0.5 + projectStrengthScore * 0.15 + keywordScore * 0.35
      : completenessScore * 0.8 + projectStrengthScore * 0.2
  );

  const suggestions = generateSuggestions({ cvData, completenessScore, projectStrengthScore, missingKeywords, hasTargetRole: Boolean(targetRole) });

  return {
    score: Math.max(0, Math.min(finalScore, 100)),
    missingKeywords,
    suggestions,
    breakdown: { completenessScore, projectStrengthScore, keywordScore },
    targetRole,
  };
};

module.exports = { scoreResume };
