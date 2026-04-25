const mongoose = require("mongoose");

const ROLES = ["STUDENT", "TUTOR", "ADMIN"];
const APPROVAL_STATUSES = ["PENDING", "APPROVED"];

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    userId: { type: String, required: true, trim: true, uppercase: true, unique: true, sparse: true },
    phoneNumber: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },

    role: { type: String, enum: ROLES, required: true },
    approvalStatus: { type: String, enum: APPROVAL_STATUSES, default: "APPROVED" },
    approvedAt: { type: Date, default: Date.now },

    faculty: { type: String, default: null },
    year: { type: Number, default: null },
    semester: { type: Number, default: null },

    dpUrl: { type: String, default: null },
    passwordResetRequested: { type: Boolean, default: false },
    passwordResetRequestedAt: { type: Date, default: null },
    passwordResetResolvedAt: { type: Date, default: null },
    forcePasswordChange: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Validation rule based on role
userSchema.pre("validate", function () {
  if (this.role === "STUDENT") {
    if (!this.faculty || this.year == null || this.semester == null) {
      throw new Error("Student must have faculty, year, and semester.");
    }
    if (this.approvalStatus === "APPROVED") {
      this.approvedAt = this.approvedAt ?? new Date();
    } else {
      this.approvedAt = null;
    }
  }

  if (this.role === "TUTOR") {
    if (!this.faculty) {
      throw new Error("Tutor must have faculty.");
    }
    this.year = null;
    this.semester = null;
    this.approvalStatus = "APPROVED";
    this.approvedAt = this.approvedAt ?? new Date();
  }

  if (this.role === "ADMIN") {
    this.faculty = this.faculty ?? null;
    this.year = null;
    this.semester = null;
    this.approvalStatus = "APPROVED";
    this.approvedAt = this.approvedAt ?? new Date();
  }
});

module.exports = mongoose.model("User", userSchema);
