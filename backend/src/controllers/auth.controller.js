const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { syncModulesForStudent } = require("../services/student-module-sync");
const { createUserWithGeneratedId } = require("../services/user-id");

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phoneNumber, role, faculty, year, semester } = req.body;

    if (!fullName || !email || !password || !phoneNumber || !role) {
      return res.status(400).json({ message: "fullName, email, password, phoneNumber, role are required." });
    }
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET missing in server config." });
    }
    if (role === "TUTOR") {
      return res.status(403).json({ message: "Tutor accounts are created by admins." });
    }
    if (role !== "STUDENT" && role !== "ADMIN") {
      return res.status(400).json({ message: "Invalid role for self-registration." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ message: "Email already registered." });

    const passwordHash = await bcrypt.hash(password, 10);
    const isStudent = role === "STUDENT";

    const user = await createUserWithGeneratedId({
      fullName,
      email,
      phoneNumber,
      passwordHash,
      role,
      approvalStatus: isStudent ? "PENDING" : "APPROVED",
      approvedAt: isStudent ? null : new Date(),
      faculty: faculty ?? null,
      year: year ?? null,
      semester: semester ?? null,
    });
    if (isStudent) {
      await syncModulesForStudent(user);
    }

    if (isStudent) {
      const admins = await User.find({ role: "ADMIN" }).select("_id").lean();
      if (admins.length > 0) {
        await Notification.insertMany(
          admins.map((admin) => ({
            user: admin._id,
            type: "STUDENT_REGISTRATION_REQUEST",
            message: `New student registration pending approval: ${user.fullName} (${user.userId})`,
            meta: {
              redirectPath: "/admin/students",
              studentId: user._id.toString(),
              studentUserId: user.userId,
            },
          }))
        );
      }

      return res.status(201).json({
        requiresApproval: true,
        user: {
          id: user._id,
          userId: user.userId,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          approvalStatus: user.approvalStatus,
          faculty: user.faculty,
          year: user.year,
          semester: user.semester,
        },
      });
    }

    const token = signToken(user);

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        approvalStatus: user.approvalStatus,
        faculty: user.faculty,
        year: user.year,
        semester: user.semester,
      },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, identifier, userId, password } = req.body;
    const loginValue = (identifier || email || userId || "").toString().trim();

    if (!loginValue || !password) {
      return res.status(400).json({ message: "identifier and password required." });
    }

    const normalizedEmail = loginValue.toLowerCase();
    const normalizedUserId = loginValue.toUpperCase();

    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { userId: normalizedUserId }],
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    if ((user.role === "STUDENT" || user.role === "TUTOR") && user.passwordResetRequested) {
      return res.status(403).json({
        message: "Your password reset request is pending admin approval.",
        code: "PASSWORD_RESET_PENDING",
        email: user.email,
        userId: user.userId,
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      if ((user.role === "STUDENT" || user.role === "TUTOR") && user.passwordResetResolvedAt) {
        return res.status(403).json({
          message: "Your password reset request was approved. Please login using your User ID as password.",
          code: "PASSWORD_RESET_APPROVED",
          userId: user.userId,
        });
      }
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (user.passwordResetResolvedAt) {
      user.passwordResetResolvedAt = null;
      await user.save();
    }
    const approvalStatus = user.approvalStatus || "APPROVED";

    if (user.role === "STUDENT" && approvalStatus !== "APPROVED") {
      return res.status(403).json({
        message: "Your registration is pending admin approval.",
        code: "APPROVAL_PENDING",
        approvalStatus,
        email: user.email,
        userId: user.userId,
      });
    }

    const token = signToken(user);

    return res.json({
      token,
      user: {
        id: user._id,
        userId: user.userId,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        approvalStatus,
        faculty: user.faculty,
        year: user.year,
        semester: user.semester,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

exports.approvalStatus = async (req, res) => {
  try {
    const rawIdentifier = (req.query.identifier || req.query.email || req.query.userId || "").toString().trim();
    if (!rawIdentifier) {
      return res.status(400).json({ message: "identifier query param is required." });
    }

    const normalizedEmail = rawIdentifier.toLowerCase();
    const normalizedUserId = rawIdentifier.toUpperCase();

    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { userId: normalizedUserId }],
    }).select("email userId role approvalStatus");

    if (!user || user.role !== "STUDENT") {
      return res.json({
        email: normalizedEmail,
        userId: normalizedUserId,
        approvalStatus: "NOT_FOUND",
        isApproved: false,
      });
    }

    const status = user.approvalStatus || "APPROVED";

    return res.json({
      email: user.email,
      userId: user.userId,
      approvalStatus: status,
      isApproved: status === "APPROVED",
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};

exports.requestStudentPasswordReset = async (req, res) => {
  try {
    const rawIdentifier = (req.body.identifier || req.body.email || req.body.userId || "").toString().trim();
    if (!rawIdentifier) {
      return res.status(400).json({ message: "identifier is required." });
    }

    const normalizedEmail = rawIdentifier.toLowerCase();
    const normalizedUserId = rawIdentifier.toUpperCase();
    const user = await User.findOne({
      role: { $in: ["STUDENT", "TUTOR"] },
      $or: [{ email: normalizedEmail }, { userId: normalizedUserId }],
    });

    // Generic response for unknown users to avoid account enumeration.
    if (!user) {
      return res.json({
        code: "PASSWORD_RESET_REQUEST_SUBMITTED",
        status: "PENDING",
        message: "Password reset request sent to admin for review.",
      });
    }

    if (user.passwordResetRequested) {
      return res.json({
        code: "PASSWORD_RESET_ALREADY_SUBMITTED",
        status: "PENDING",
        userId: user.userId,
        message: `Your password reset request is already submitted and still pending admin approval. User ID: ${user.userId}`,
      });
    }

    if (user.passwordResetResolvedAt && !user.passwordResetRequested) {
      return res.json({
        code: "PASSWORD_RESET_APPROVED",
        status: "APPROVED",
        userId: user.userId,
        message: `Your password reset request is approved. Use your User ID (${user.userId}) as current temporary password for login. Then change it.`,
      });
    }

    if (!user.passwordResetRequested) {
      user.passwordResetRequested = true;
      user.passwordResetRequestedAt = new Date();
      user.passwordResetResolvedAt = null;
      await user.save();
      const admins = await User.find({ role: "ADMIN" }).select("_id").lean();
      if (admins.length > 0) {
        await Notification.insertMany(
          admins.map((admin) => ({
            user: admin._id,
            type: "STUDENT_PASSWORD_RESET_REQUEST",
            message: `${user.role} password reset request: ${user.fullName} (${user.userId})`,
            meta: {
              redirectPath: "/admin/students",
              studentId: user._id.toString(),
              studentUserId: user.userId,
            },
          }))
        );
      }
    }

    return res.json({
      code: "PASSWORD_RESET_REQUEST_SUBMITTED",
      status: "PENDING",
      userId: user.userId,
      message: `Password reset request sent to admin for review. Status: Pending. User ID: ${user.userId}`,
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
};
