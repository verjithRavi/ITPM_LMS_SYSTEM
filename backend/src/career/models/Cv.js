const mongoose = require("mongoose");

const cvSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "CvTemplate" },
    data: {
      personal: {
        fullName: { type: String, default: "" },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        location: { type: String, default: "" },
        linkedin: { type: String, default: "" },
        github: { type: String, default: "" },
        portfolio: { type: String, default: "" },
      },
      summary: { type: String, default: "" },
      education: [
        {
          institution: String,
          degree: String,
          fieldOfStudy: String,
          startDate: String,
          endDate: String,
          description: String,
        },
      ],
      experience: [
        {
          company: String,
          jobTitle: String,
          startDate: String,
          endDate: String,
          description: String,
        },
      ],
      projects: [
        {
          title: String,
          description: String,
          link: String,
          technologies: [String],
        },
      ],
      skills: [String],
      links: [
        {
          label: String,
          url: String,
        },
      ],
    },
    status: { type: String, enum: ["draft", "final"], default: "draft" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cv", cvSchema);
