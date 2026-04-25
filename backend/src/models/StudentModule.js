const mongoose = require("mongoose");

const studentModuleSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    module: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true },
  },
  { timestamps: true }
);

studentModuleSchema.index({ student: 1, module: 1 }, { unique: true });

module.exports = mongoose.model("StudentModule", studentModuleSchema);
