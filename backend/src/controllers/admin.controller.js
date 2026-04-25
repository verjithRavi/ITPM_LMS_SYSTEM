const User = require("../models/User");
const bcrypt = require("bcryptjs");
const StudentModule = require("../models/StudentModule");
const { syncModulesForStudent } = require("../services/student-module-sync");
const { createUserWithGeneratedId } = require("../services/user-id");

exports.listPendingStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "STUDENT", approvalStatus: "PENDING" })
      .select("userId fullName email phoneNumber faculty year semester createdAt approvalStatus")
      .sort({ createdAt: 1 });

    return res.json({ students });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

exports.listStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "STUDENT" })
      .select("userId fullName email phoneNumber faculty year semester approvalStatus createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.json({ students });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

exports.listPasswordResetRequests = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["STUDENT", "TUTOR"] },
      passwordResetRequested: true,
    })
      .select("role userId fullName email phoneNumber faculty year semester passwordResetRequestedAt")
      .sort({ passwordResetRequestedAt: -1, createdAt: -1 });

    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

exports.resetUserPasswordToUserId = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id, role: { $in: ["STUDENT", "TUTOR"] } });
    if (!user) return res.status(404).json({ message: "User not found." });

    user.passwordHash = await bcrypt.hash(user.userId, 10);
    user.passwordResetRequested = false;
    user.passwordResetRequestedAt = null;
    user.passwordResetResolvedAt = new Date();
    user.forcePasswordChange = true;
    await user.save();

    return res.json({
      message: `Password reset successfully for ${user.userId}.`,
      user: {
        id: user._id,
        role: user.role,
        userId: user.userId,
        fullName: user.fullName,
      },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findOne({ _id: id, role: "STUDENT" })
      .select("userId fullName email phoneNumber faculty year semester approvalStatus createdAt updatedAt");

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    return res.json({ student });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, faculty, year, semester, approvalStatus } = req.body;

    if (!fullName || !email || !phoneNumber || !password || !faculty || year == null || semester == null) {
      return res.status(400).json({
        message: "fullName, email, phoneNumber, password, faculty, year, semester are required.",
      });
    }

    const normalizedEmail = email.toString().trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email already registered." });

    const passwordHash = await bcrypt.hash(password, 10);
    const nextStatus = approvalStatus === "PENDING" ? "PENDING" : "APPROVED";

    const student = await createUserWithGeneratedId({
      fullName: fullName.toString().trim(),
      email: normalizedEmail,
      phoneNumber: phoneNumber.toString().trim(),
      passwordHash,
      role: "STUDENT",
      faculty: faculty.toString().trim(),
      year: Number(year),
      semester: Number(semester),
      approvalStatus: nextStatus,
      approvedAt: nextStatus === "APPROVED" ? new Date() : null,
    });
    await syncModulesForStudent(student);

    return res.status(201).json({
      student: {
        id: student._id,
        userId: student.userId,
        fullName: student.fullName,
        email: student.email,
        phoneNumber: student.phoneNumber,
        faculty: student.faculty,
        year: student.year,
        semester: student.semester,
        approvalStatus: student.approvalStatus,
      },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.listTutors = async (req, res) => {
  try {
    const tutors = await User.find({ role: "TUTOR" })
      .select("userId fullName email phoneNumber faculty approvalStatus createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.json({ tutors });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

exports.getTutorById = async (req, res) => {
  try {
    const { id } = req.params;
    const tutor = await User.findOne({ _id: id, role: "TUTOR" })
      .select("userId fullName email phoneNumber faculty approvalStatus createdAt updatedAt");

    if (!tutor) {
      return res.status(404).json({ message: "Tutor not found." });
    }

    return res.json({ tutor });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.createTutor = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, faculty } = req.body;

    if (!fullName || !email || !phoneNumber || !password || !faculty) {
      return res.status(400).json({
        message: "fullName, email, phoneNumber, password, faculty are required.",
      });
    }

    const normalizedEmail = email.toString().trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email already registered." });

    const passwordHash = await bcrypt.hash(password, 10);

    const tutor = await createUserWithGeneratedId({
      fullName: fullName.toString().trim(),
      email: normalizedEmail,
      phoneNumber: phoneNumber.toString().trim(),
      passwordHash,
      role: "TUTOR",
      faculty: faculty.toString().trim(),
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
    });

    return res.status(201).json({
      tutor: {
        id: tutor._id,
        userId: tutor.userId,
        fullName: tutor.fullName,
        email: tutor.email,
        phoneNumber: tutor.phoneNumber,
        faculty: tutor.faculty,
        approvalStatus: tutor.approvalStatus,
      },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.deleteTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.findOneAndDelete({ _id: id, role: "TUTOR" });

    if (!deleted) {
      return res.status(404).json({ message: "Tutor not found." });
    }

    return res.json({ message: "Tutor deleted successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.updateTutor = async (req, res) => {
  try {
    const { id } = req.params;
    const tutor = await User.findOne({ _id: id, role: "TUTOR" });
    if (!tutor) return res.status(404).json({ message: "Tutor not found." });

    const { fullName, email, phoneNumber, faculty } = req.body;

    if (fullName !== undefined) tutor.fullName = fullName.toString().trim();
    if (email !== undefined) tutor.email = email.toString().trim().toLowerCase();
    if (phoneNumber !== undefined) tutor.phoneNumber = phoneNumber.toString().trim();
    if (faculty !== undefined) tutor.faculty = faculty.toString().trim();

    await tutor.save();

    return res.json({
      tutor: {
        id: tutor._id,
        userId: tutor.userId,
        fullName: tutor.fullName,
        email: tutor.email,
        phoneNumber: tutor.phoneNumber,
        faculty: tutor.faculty,
        approvalStatus: tutor.approvalStatus,
      },
      message: "Tutor updated successfully.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await User.findOne({ _id: id, role: "STUDENT" });
    if (!student) return res.status(404).json({ message: "Student not found." });

    const {
      fullName,
      email,
      phoneNumber,
      password,
      faculty,
      year,
      semester,
      approvalStatus,
    } = req.body;

    if (fullName !== undefined) student.fullName = fullName.toString().trim();
    if (email !== undefined) student.email = email.toString().trim().toLowerCase();
    if (phoneNumber !== undefined) student.phoneNumber = phoneNumber.toString().trim();
    if (faculty !== undefined) student.faculty = faculty.toString().trim();
    if (year !== undefined) student.year = Number(year);
    if (semester !== undefined) student.semester = Number(semester);

    if (approvalStatus === "PENDING" || approvalStatus === "APPROVED") {
      student.approvalStatus = approvalStatus;
      student.approvedAt = approvalStatus === "APPROVED" ? new Date() : null;
    }

    if (password) {
      student.passwordHash = await bcrypt.hash(password, 10);
      student.passwordResetRequested = false;
      student.passwordResetRequestedAt = null;
    }

    await student.save();
    await syncModulesForStudent(student);

    return res.json({
      student: {
        id: student._id,
        userId: student.userId,
        fullName: student.fullName,
        email: student.email,
        phoneNumber: student.phoneNumber,
        faculty: student.faculty,
        year: student.year,
        semester: student.semester,
        approvalStatus: student.approvalStatus,
      },
      message: "Student updated successfully.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await StudentModule.deleteMany({ student: id });
    const deleted = await User.findOneAndDelete({ _id: id, role: "STUDENT" });

    if (!deleted) {
      return res.status(404).json({ message: "Student not found." });
    }

    return res.json({ message: "Student deleted successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.approveStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await User.findOneAndUpdate(
      { _id: id, role: "STUDENT" },
      { approvalStatus: "APPROVED", approvedAt: new Date() },
      { new: true }
    ).select("userId fullName email phoneNumber faculty year semester approvalStatus approvedAt");

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    return res.json({ student, message: "Student registration approved." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};
