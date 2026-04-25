const Cv = require("../models/Cv");
const CvTemplate = require("../models/CvTemplate");
const { generateCvPdfBuffer } = require("../services/pdfService");

const getAllCvs = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const cvs = await Cv.find({ userId })
      .populate("templateId", "name previewImageUrl isActive")
      .sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: cvs.length, data: cvs });
  } catch (error) {
    next(error);
  }
};

const getCvById = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const cv = await Cv.findOne({ _id: req.params.id, userId }).populate("templateId", "name previewImageUrl isActive htmlTemplate");
    if (!cv) return res.status(404).json({ success: false, message: "CV not found" });
    res.status(200).json({ success: true, data: cv });
  } catch (error) {
    next(error);
  }
};

const createCv = async (req, res, next) => {
  try {
    const { templateId, data, status } = req.body;
    const userId = req.user._id.toString();

    if (!templateId) return res.status(400).json({ success: false, message: "templateId is required" });

    const template = await CvTemplate.findById(templateId);
    if (!template) return res.status(404).json({ success: false, message: "CV template not found" });

    const cv = await Cv.create({
      userId,
      templateId,
      data: {
        personal: data?.personal || {},
        summary: data?.summary || "",
        education: data?.education || [],
        experience: data?.experience || [],
        projects: data?.projects || [],
        skills: data?.skills || [],
        links: data?.links || [],
      },
      status: status || "draft",
    });

    const createdCv = await Cv.findById(cv._id).populate("templateId", "name previewImageUrl isActive");
    res.status(201).json({ success: true, message: "CV created successfully", data: createdCv });
  } catch (error) {
    next(error);
  }
};

const updateCv = async (req, res, next) => {
  try {
    const { templateId, data, status } = req.body;
    const userId = req.user._id.toString();

    const cv = await Cv.findOne({ _id: req.params.id, userId });
    if (!cv) return res.status(404).json({ success: false, message: "CV not found" });

    if (templateId) {
      const template = await CvTemplate.findById(templateId);
      if (!template) return res.status(404).json({ success: false, message: "CV template not found" });
      cv.templateId = templateId;
    }

    if (data) {
      cv.data = {
        personal: data.personal || cv.data.personal || {},
        summary: data.summary ?? cv.data.summary ?? "",
        education: data.education || cv.data.education || [],
        experience: data.experience || cv.data.experience || [],
        projects: data.projects || cv.data.projects || [],
        skills: data.skills || cv.data.skills || [],
        links: data.links || cv.data.links || [],
      };
    }

    if (status) cv.status = status;
    await cv.save();

    const updatedCv = await Cv.findById(cv._id).populate("templateId", "name previewImageUrl isActive");
    res.status(200).json({ success: true, message: "CV updated successfully", data: updatedCv });
  } catch (error) {
    next(error);
  }
};

const deleteCv = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const cv = await Cv.findOneAndDelete({ _id: req.params.id, userId });
    if (!cv) return res.status(404).json({ success: false, message: "CV not found" });
    res.status(200).json({ success: true, message: "CV deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getCvTemplates = async (req, res, next) => {
  try {
    const templates = await CvTemplate.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: templates.length, data: templates });
  } catch (error) {
    next(error);
  }
};

const downloadCvPdf = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const cv = await Cv.findOne({ _id: req.params.id, userId }).populate("templateId");
    if (!cv) return res.status(404).json({ success: false, message: "CV not found" });

    const pdfBuffer = await generateCvPdfBuffer(cv);
    const safeName = (cv?.data?.personal?.fullName || "cv").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
    const templateName = typeof cv.templateId === "object" && cv.templateId?.name ? cv.templateId.name : "template";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName || "cv"}-${String(templateName).toLowerCase().replace(/\s+/g, "-")}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllCvs, getCvById, createCv, updateCv, deleteCv, getCvTemplates, downloadCvPdf };
