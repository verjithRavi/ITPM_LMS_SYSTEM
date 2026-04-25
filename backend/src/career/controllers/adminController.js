const mongoose = require("mongoose");
const CvTemplate = require("../models/CvTemplate");
const CareerRole = require("../models/CareerRole");
const CareerRoadmap = require("../models/CareerRoadmap");
const JobRole = require("../models/JobRole");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// CV TEMPLATES
const getCvTemplatesAdmin = async (req, res, next) => {
  try {
    const templates = await CvTemplate.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: templates.length, data: templates });
  } catch (error) { next(error); }
};

const createCvTemplate = async (req, res, next) => {
  try {
    const { name, isActive, previewImageUrl, layoutConfig, htmlTemplate } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Template name is required" });
    const template = await CvTemplate.create({ name: name.trim(), isActive: isActive ?? true, previewImageUrl: previewImageUrl || "", layoutConfig: layoutConfig || {}, htmlTemplate: htmlTemplate || "" });
    res.status(201).json({ success: true, message: "CV template created successfully", data: template });
  } catch (error) { next(error); }
};

const updateCvTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid template id" });
    const template = await CvTemplate.findById(id);
    if (!template) return res.status(404).json({ success: false, message: "CV template not found" });
    const { name, isActive, previewImageUrl, layoutConfig, htmlTemplate } = req.body;
    if (name !== undefined) template.name = name.trim();
    if (isActive !== undefined) template.isActive = isActive;
    if (previewImageUrl !== undefined) template.previewImageUrl = previewImageUrl;
    if (layoutConfig !== undefined) template.layoutConfig = layoutConfig;
    if (htmlTemplate !== undefined) template.htmlTemplate = htmlTemplate;
    await template.save();
    res.status(200).json({ success: true, message: "CV template updated successfully", data: template });
  } catch (error) { next(error); }
};

const deleteCvTemplate = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid template id" });
    const template = await CvTemplate.findByIdAndDelete(id);
    if (!template) return res.status(404).json({ success: false, message: "CV template not found" });
    res.status(200).json({ success: true, message: "CV template deleted successfully" });
  } catch (error) { next(error); }
};

// CAREER ROLES
const getCareerRolesAdmin = async (req, res, next) => {
  try {
    const roles = await CareerRole.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: roles.length, data: roles });
  } catch (error) { next(error); }
};

const createCareerRole = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ success: false, message: "Career role title is required" });
    const role = await CareerRole.create({ title: title.trim(), description: description || "" });
    res.status(201).json({ success: true, message: "Career role created successfully", data: role });
  } catch (error) { next(error); }
};

const updateCareerRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid career role id" });
    const role = await CareerRole.findById(id);
    if (!role) return res.status(404).json({ success: false, message: "Career role not found" });
    const { title, description } = req.body;
    if (title !== undefined) role.title = title.trim();
    if (description !== undefined) role.description = description;
    await role.save();
    res.status(200).json({ success: true, message: "Career role updated successfully", data: role });
  } catch (error) { next(error); }
};

const deleteCareerRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid career role id" });
    const role = await CareerRole.findByIdAndDelete(id);
    if (!role) return res.status(404).json({ success: false, message: "Career role not found" });
    await CareerRoadmap.deleteOne({ careerRoleId: id });
    res.status(200).json({ success: true, message: "Career role deleted successfully" });
  } catch (error) { next(error); }
};

// ROADMAPS
const getRoadmapsAdmin = async (req, res, next) => {
  try {
    const roadmaps = await CareerRoadmap.find().populate("careerRoleId", "title description").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: roadmaps.length, data: roadmaps });
  } catch (error) { next(error); }
};

const createRoadmap = async (req, res, next) => {
  try {
    const { careerRoleId, steps } = req.body;
    if (!careerRoleId) return res.status(400).json({ success: false, message: "careerRoleId is required" });
    if (!isValidObjectId(careerRoleId)) return res.status(400).json({ success: false, message: "Invalid careerRoleId" });
    const role = await CareerRole.findById(careerRoleId);
    if (!role) return res.status(404).json({ success: false, message: "Career role not found" });
    const existingRoadmap = await CareerRoadmap.findOne({ careerRoleId });
    if (existingRoadmap) return res.status(409).json({ success: false, message: "Roadmap already exists for this career role" });
    const roadmap = await CareerRoadmap.create({ careerRoleId, steps: Array.isArray(steps) ? steps : [] });
    const populatedRoadmap = await CareerRoadmap.findById(roadmap._id).populate("careerRoleId", "title description");
    res.status(201).json({ success: true, message: "Roadmap created successfully", data: populatedRoadmap });
  } catch (error) { next(error); }
};

const updateRoadmap = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { careerRoleId, steps } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid roadmap id" });
    const roadmap = await CareerRoadmap.findById(id);
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found" });
    if (careerRoleId !== undefined) {
      if (!isValidObjectId(careerRoleId)) return res.status(400).json({ success: false, message: "Invalid careerRoleId" });
      const role = await CareerRole.findById(careerRoleId);
      if (!role) return res.status(404).json({ success: false, message: "Career role not found" });
      const duplicateRoadmap = await CareerRoadmap.findOne({ _id: { $ne: roadmap._id }, careerRoleId });
      if (duplicateRoadmap) return res.status(409).json({ success: false, message: "Another roadmap already exists for this career role" });
      roadmap.careerRoleId = careerRoleId;
    }
    if (steps !== undefined) roadmap.steps = Array.isArray(steps) ? steps : [];
    await roadmap.save();
    const populatedRoadmap = await CareerRoadmap.findById(roadmap._id).populate("careerRoleId", "title description");
    res.status(200).json({ success: true, message: "Roadmap updated successfully", data: populatedRoadmap });
  } catch (error) { next(error); }
};

const deleteRoadmap = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid roadmap id" });
    const roadmap = await CareerRoadmap.findByIdAndDelete(id);
    if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found" });
    res.status(200).json({ success: true, message: "Roadmap deleted successfully" });
  } catch (error) { next(error); }
};

// JOB ROLES
const getJobRolesAdmin = async (req, res, next) => {
  try {
    const jobs = await JobRole.find().populate("linkedCareerRoleId", "title description").sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) { next(error); }
};

const createJobRole = async (req, res, next) => {
  try {
    const { title, linkedCareerRoleId, requiredSkills, keywords } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ success: false, message: "Job role title is required" });
    if (linkedCareerRoleId && !isValidObjectId(linkedCareerRoleId)) return res.status(400).json({ success: false, message: "Invalid linkedCareerRoleId" });
    if (linkedCareerRoleId) {
      const role = await CareerRole.findById(linkedCareerRoleId);
      if (!role) return res.status(404).json({ success: false, message: "Linked career role not found" });
    }
    const jobRole = await JobRole.create({ title: title.trim(), linkedCareerRoleId: linkedCareerRoleId || null, requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [], keywords: Array.isArray(keywords) ? keywords : [] });
    const populatedJobRole = await JobRole.findById(jobRole._id).populate("linkedCareerRoleId", "title description");
    res.status(201).json({ success: true, message: "Job role created successfully", data: populatedJobRole });
  } catch (error) { next(error); }
};

const updateJobRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, linkedCareerRoleId, requiredSkills, keywords } = req.body;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid job role id" });
    const jobRole = await JobRole.findById(id);
    if (!jobRole) return res.status(404).json({ success: false, message: "Job role not found" });
    if (title !== undefined) jobRole.title = title.trim();
    if (linkedCareerRoleId !== undefined) {
      if (linkedCareerRoleId !== null && linkedCareerRoleId !== "" && !isValidObjectId(linkedCareerRoleId)) return res.status(400).json({ success: false, message: "Invalid linkedCareerRoleId" });
      if (linkedCareerRoleId) {
        const role = await CareerRole.findById(linkedCareerRoleId);
        if (!role) return res.status(404).json({ success: false, message: "Linked career role not found" });
        jobRole.linkedCareerRoleId = linkedCareerRoleId;
      } else {
        jobRole.linkedCareerRoleId = null;
      }
    }
    if (requiredSkills !== undefined) jobRole.requiredSkills = Array.isArray(requiredSkills) ? requiredSkills : [];
    if (keywords !== undefined) jobRole.keywords = Array.isArray(keywords) ? keywords : [];
    await jobRole.save();
    const populatedJobRole = await JobRole.findById(jobRole._id).populate("linkedCareerRoleId", "title description");
    res.status(200).json({ success: true, message: "Job role updated successfully", data: populatedJobRole });
  } catch (error) { next(error); }
};

const deleteJobRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ success: false, message: "Invalid job role id" });
    const jobRole = await JobRole.findByIdAndDelete(id);
    if (!jobRole) return res.status(404).json({ success: false, message: "Job role not found" });
    res.status(200).json({ success: true, message: "Job role deleted successfully" });
  } catch (error) { next(error); }
};

module.exports = {
  getCvTemplatesAdmin, createCvTemplate, updateCvTemplate, deleteCvTemplate,
  getCareerRolesAdmin, createCareerRole, updateCareerRole, deleteCareerRole,
  getRoadmapsAdmin, createRoadmap, updateRoadmap, deleteRoadmap,
  getJobRolesAdmin, createJobRole, updateJobRole, deleteJobRole,
};
