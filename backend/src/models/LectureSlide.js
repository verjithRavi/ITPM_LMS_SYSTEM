const mongoose = require("mongoose");

const lectureSlideSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, trim: true, maxlength: 50 },
    moduleName: { type: String, required: true, trim: true },
    fileData: { type: String, required: true },
    fileName: { type: String, required: true, trim: true },
    fileType: { type: String, enum: ["PDF", "PPTX"], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LectureSlide", lectureSlideSchema);
