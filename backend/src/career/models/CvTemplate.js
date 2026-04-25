const mongoose = require("mongoose");

const cvTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    previewImageUrl: { type: String, default: "" },
    layoutConfig: { type: mongoose.Schema.Types.Mixed, default: {} },
    htmlTemplate: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CvTemplate", cvTemplateSchema);
