const mongoose = require("mongoose");

const FACULTIES = [
  "Faculty of Computing",
  "Faculty of Engineering",
  "Faculty of Business",
  "Faculty of Humanities & Sciences",
  "Faculty of Law",
];

const FACULTY_CODE_PREFIXES = {
  "Faculty of Computing": "IT",
  "Faculty of Engineering": "EN",
  "Faculty of Business": "BU",
  "Faculty of Humanities & Sciences": "HS",
  "Faculty of Law": "LAW",
};

const moduleSchema = new mongoose.Schema(
  {
    moduleCode: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true, enum: FACULTIES },
    year: { type: Number, required: true, enum: [1, 2, 3, 4] },
    semester: { type: Number, required: true, enum: [1, 2] },
    description: { type: String, required: true, trim: true },
    assignedTutor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

moduleSchema.index({ faculty: 1, year: 1, semester: 1, name: 1 }, { unique: true });

module.exports = {
  Module: mongoose.model("Module", moduleSchema),
  FACULTIES,
  FACULTY_CODE_PREFIXES,
};
