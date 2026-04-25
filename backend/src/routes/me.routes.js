const router = require("express").Router();
const { requireAuth } = require("../middlewares/auth.middleware");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

function serializeUser(user) {
  return {
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    userId: user.userId,
    phoneNumber: user.phoneNumber,
    role: user.role,
    approvalStatus: user.approvalStatus,
    approvedAt: user.approvedAt,
    faculty: user.faculty,
    year: user.year,
    semester: user.semester,
    dpUrl: user.dpUrl,
    forcePasswordChange: user.forcePasswordChange,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function isValidProfileImage(value) {
  if (value == null || value === "") return true;
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (trimmed.length > 3_000_000) return false;

  return (
    /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(trimmed) ||
    /^https?:\/\/\S+$/i.test(trimmed)
  );
}

router.get("/", requireAuth, (req, res) => {
  res.json({ user: serializeUser(req.user) });
});

router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const {
      fullName,
      email,
      phoneNumber,
      dpUrl,
    } = req.body;

    if (fullName !== undefined) user.fullName = String(fullName).trim();
    if (email !== undefined) user.email = String(email).trim().toLowerCase();
    if (phoneNumber !== undefined) user.phoneNumber = String(phoneNumber).trim();
    if (dpUrl !== undefined) {
      if (!isValidProfileImage(dpUrl)) {
        return res.status(400).json({
          message: "Profile image must be a valid image upload or URL under 3 MB.",
        });
      }
      user.dpUrl = dpUrl ? String(dpUrl).trim() : null;
    }

    if (!user.fullName || !user.email || !user.phoneNumber) {
      return res.status(400).json({
        message: "fullName, email, and phoneNumber are required.",
      });
    }

    const duplicate = await User.findOne({
      email: user.email,
      _id: { $ne: user._id },
    }).select("_id");

    if (duplicate) {
      return res.status(409).json({ message: "Email already registered." });
    }

    await user.save();

    return res.json({
      message: "Profile updated successfully.",
      user: serializeUser(user),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update profile." });
  }
});

router.patch("/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required." });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found." });

    const ok = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!ok) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    user.forcePasswordChange = false;
    user.passwordResetResolvedAt = null;
    user.passwordResetRequested = false;
    user.passwordResetRequestedAt = null;
    await user.save();

    return res.json({ message: "Password changed successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
