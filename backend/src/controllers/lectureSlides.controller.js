const LectureSlide = require("../models/LectureSlide");

function normalizeLectureSlide(slide) {
  return {
    _id: slide._id,
    topic: slide.topic,
    moduleName: slide.moduleName,
    fileData: slide.fileData,
    fileName: slide.fileName,
    fileType: slide.fileType,
    createdAt: slide.createdAt,
  };
}

async function listSlides(req, res) {
  try {
    const filter = {};
    if (req.query.moduleName) {
      filter.moduleName = req.query.moduleName;
    }
    if (req.user.role === "TUTOR") {
      filter.createdBy = req.user._id;
    }
    const slides = await LectureSlide.find(filter).sort({ createdAt: -1 });
    res.json({ slides: slides.map(normalizeLectureSlide) });
  } catch {
    res.status(500).json({ message: "Failed to load lecture slides." });
  }
}

async function createSlide(req, res) {
  try {
    const { topic, moduleName, fileData, fileName, fileType } = req.body;

    if (!topic || !moduleName || !fileData || !fileName || !fileType) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (topic.trim().length > 50) {
      return res.status(400).json({ message: "Topic must be 50 characters or fewer." });
    }
    if (!["PDF", "PPTX"].includes(fileType)) {
      return res.status(400).json({ message: "File must be a PDF or PPTX." });
    }

    const slide = await LectureSlide.create({
      topic: topic.trim(),
      moduleName: moduleName.trim(),
      fileData,
      fileName,
      fileType,
      createdBy: req.user._id,
    });

    res.status(201).json({ slide: normalizeLectureSlide(slide) });
  } catch {
    res.status(500).json({ message: "Failed to create lecture slide." });
  }
}

async function deleteSlide(req, res) {
  try {
    const slide = await LectureSlide.findById(req.params.id);
    if (!slide) return res.status(404).json({ message: "Slide not found." });
    if (slide.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this slide." });
    }
    await slide.deleteOne();
    res.json({ message: "Lecture slide deleted successfully." });
  } catch {
    res.status(500).json({ message: "Failed to delete lecture slide." });
  }
}

module.exports = { listSlides, createSlide, deleteSlide };
