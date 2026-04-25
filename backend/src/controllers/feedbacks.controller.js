const Feedback = require("../models/Feedback");

function normalizeFeedback(item) {
  return {
    _id: item._id,
    role: item.role,
    subject: item.subject,
    message: item.message,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    user: item.user
      ? {
          _id: item.user._id,
          userId: item.user.userId,
          fullName: item.user.fullName,
          email: item.user.email,
          faculty: item.user.faculty || null,
        }
      : null,
  };
}

exports.listFeedbacks = async (req, res) => {
  try {
    const query = req.user.role === "ADMIN" ? {} : { user: req.user._id };
    const feedbacks = await Feedback.find(query)
      .populate("user", "userId fullName email faculty")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ feedbacks: feedbacks.map(normalizeFeedback) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load feedbacks." });
  }
};

exports.createFeedback = async (req, res) => {
  try {
    if (!["STUDENT", "TUTOR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only students and tutors can submit feedback." });
    }

    const subject = req.body?.subject?.toString().trim() || "";
    const message = req.body?.message?.toString().trim() || "";

    if (!subject) {
      return res.status(400).json({ message: "Subject is required." });
    }
    if (!message) {
      return res.status(400).json({ message: "Message is required." });
    }

    const feedback = await Feedback.create({
      user: req.user._id,
      role: req.user.role,
      subject,
      message,
    });

    await feedback.populate("user", "userId fullName email faculty");

    return res.status(201).json({
      message: "Feedback submitted successfully.",
      feedback: normalizeFeedback(feedback),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to submit feedback." });
  }
};

exports.updateFeedback = async (req, res) => {
  try {
    if (!["STUDENT", "TUTOR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only students and tutors can update feedback." });
    }

    const subject = req.body?.subject?.toString().trim() || "";
    const message = req.body?.message?.toString().trim() || "";

    if (!subject) {
      return res.status(400).json({ message: "Subject is required." });
    }
    if (!message) {
      return res.status(400).json({ message: "Message is required." });
    }

    const feedback = await Feedback.findOne({ _id: req.params.id, user: req.user._id });
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    feedback.subject = subject;
    feedback.message = message;
    await feedback.save();
    await feedback.populate("user", "userId fullName email faculty");

    return res.json({
      message: "Feedback updated successfully.",
      feedback: normalizeFeedback(feedback),
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update feedback." });
  }
};

exports.deleteFeedback = async (req, res) => {
  try {
    if (!["STUDENT", "TUTOR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only students and tutors can delete feedback." });
    }

    const feedback = await Feedback.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found." });
    }

    return res.json({ message: "Feedback deleted successfully." });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete feedback." });
  }
};
