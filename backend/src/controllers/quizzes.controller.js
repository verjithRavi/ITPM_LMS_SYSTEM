const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const { Module } = require("../models/Module");
const StudentModule = require("../models/StudentModule");
const Notification = require("../models/Notification");
const User = require("../models/User");

function normalizeQuiz(quiz) {
  const isClosed = quiz.status === "PUBLISHED" && new Date(quiz.deadline).getTime() < Date.now();
  return {
    _id: quiz._id,
    title: quiz.title,
    description: quiz.description,
    moduleName: quiz.moduleName,
    totalMarks: quiz.totalMarks,
    deadline: quiz.deadline,
    instructions: quiz.instructions,
    status: quiz.status,
    isClosed,
    questions: (quiz.questions || []).map((question) => ({
      _id: question._id,
      questionType: question.questionType,
      questionText: question.questionText,
      options: question.options || [],
      correctAnswer: question.correctAnswer,
      marks: question.marks,
      topicCategory: question.topicCategory,
    })),
    createdBy: quiz.createdBy,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    myAttempt: quiz.myAttempt || null,
  };
}

function isPastDeadline(value) {
  return new Date(value).getTime() < Date.now();
}

function normalizeQuizAttempt(attempt) {
  return {
    _id: attempt._id,
    status: attempt.status,
    score: attempt.score,
    submittedAt: attempt.submittedAt,
    startedAt: attempt.startedAt,
    answers: attempt.answers || [],
    reviewStatus: attempt.reviewStatus || "AUTO_GRADED",
    overallFeedback: attempt.overallFeedback || "",
    reviewedAt: attempt.reviewedAt,
  };
}

function normalizeQuestion(question = {}) {
  return {
    questionType: String(question.questionType || "").trim().toUpperCase(),
    questionText: String(question.questionText || "").trim(),
    options: Array.isArray(question.options) ? question.options : [],
    correctAnswer: String(question.correctAnswer || "").trim(),
    marks: Number(question.marks),
    topicCategory: String(question.topicCategory || "").trim(),
  };
}

function normalizeQuizPayload(body = {}) {
  const payload = {};

  if ("title" in body) payload.title = String(body.title || "").trim();
  if ("description" in body) payload.description = String(body.description || "").trim();
  if ("moduleName" in body) payload.moduleName = String(body.moduleName || "").trim();
  if ("totalMarks" in body) payload.totalMarks = Number(body.totalMarks);
  if ("deadline" in body) payload.deadline = new Date(body.deadline);
  if ("instructions" in body) payload.instructions = String(body.instructions || "").trim();
  if ("status" in body) payload.status = body.status === "DRAFT" ? "DRAFT" : "PUBLISHED";
  if ("questions" in body) payload.questions = Array.isArray(body.questions) ? body.questions.map(normalizeQuestion) : [];

  return payload;
}

function validateQuizPayload(payload) {
  if (!payload.title) return "title is required.";
  if (!payload.description) return "description is required.";
  if (!payload.moduleName) return "moduleName is required.";
  if (payload.totalMarks == null || Number.isNaN(payload.totalMarks)) return "totalMarks is required.";
  if (!(payload.deadline instanceof Date) || Number.isNaN(payload.deadline.getTime())) return "deadline is required.";
  if (!payload.instructions) return "instructions are required.";
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) return "At least one quiz question is required.";
  return null;
}

async function loadManagedQuiz(id, user) {
  const quiz = await Quiz.findById(id).populate("createdBy", "_id fullName role");
  if (!quiz) {
    return { error: { status: 404, message: "Quiz not found." } };
  }
  if (user.role === "TUTOR" && String(quiz.createdBy._id) !== String(user._id)) {
    return { error: { status: 403, message: "Tutors can manage only their own quizzes." } };
  }
  return { quiz };
}

async function buildModuleRecipientQuery(moduleName, createdBy) {
  const query = { name: String(moduleName).trim() };
  let creatorId = null;
  let creatorRole = null;

  if (createdBy && typeof createdBy === "object") {
    creatorId = createdBy._id ? String(createdBy._id) : String(createdBy);
    creatorRole = createdBy.role || null;
  } else if (createdBy) {
    creatorId = String(createdBy);
  }

  if (creatorId && !creatorRole) {
    const creator = await User.findById(creatorId).select("_id role");
    creatorRole = creator?.role || null;
  }

  if (creatorRole === "TUTOR" && creatorId) {
    query.assignedTutor = creatorId;
  }

  return query;
}

async function findRecipientStudentTargetsForModule(moduleName, createdBy) {
  const modules = await Module.find(await buildModuleRecipientQuery(moduleName, createdBy)).select("_id");
  if (modules.length === 0) return [];

  const studentModules = await StudentModule.find({
    module: { $in: modules.map((moduleItem) => moduleItem._id) },
  }).select("student module");

  const uniqueTargets = new Map();
  studentModules.forEach((studentModule) => {
    const studentId = String(studentModule.student);
    if (!uniqueTargets.has(studentId)) {
      uniqueTargets.set(studentId, {
        studentId,
        moduleId: String(studentModule.module),
      });
    }
  });

  return Array.from(uniqueTargets.values());
}

async function createQuizPublishedNotifications(quiz) {
  const targets = await findRecipientStudentTargetsForModule(quiz.moduleName, quiz.createdBy);
  if (targets.length === 0) return;

  await Notification.insertMany(
    targets.map((target) => ({
      user: target.studentId,
      type: "QUIZ_PUBLISHED",
      message: `New quiz published for ${quiz.moduleName}: ${quiz.title}`,
      meta: {
        redirectPath: `/student/modules/${target.moduleId}?quizId=${quiz._id}`,
      },
    }))
  );
}

async function createQuizUpdatedNotifications(quiz) {
  const targets = await findRecipientStudentTargetsForModule(quiz.moduleName, quiz.createdBy);
  if (targets.length === 0) return;

  await Notification.insertMany(
    targets.map((target) => ({
      user: target.studentId,
      type: "QUIZ_UPDATED",
      message: `Quiz updated for ${quiz.moduleName}: ${quiz.title}`,
      meta: {
        redirectPath: `/student/modules/${target.moduleId}?quizId=${quiz._id}`,
      },
    }))
  );
}

exports.listQuizzes = async (req, res) => {
  try {
    let query = {};
    const { moduleName } = req.query;

    if (req.user.role === "TUTOR") {
      query = { createdBy: req.user._id };
    } else if (req.user.role === "STUDENT") {
      query = { status: "PUBLISHED" };
    }
    if (moduleName) query.moduleName = String(moduleName).trim();

    const quizzes = await Quiz.find(query).sort({ createdAt: -1 }).populate("createdBy", "_id fullName role");

    if (req.user.role === "STUDENT") {
      const attempts = await QuizAttempt.find({
        student: req.user._id,
        quiz: { $in: quizzes.map((quiz) => quiz._id) },
      })
        .sort({ createdAt: -1 })
        .select("quiz status score submittedAt startedAt reviewStatus overallFeedback reviewedAt");

      const attemptsByQuizId = new Map();
      attempts.forEach((attempt) => {
        const key = String(attempt.quiz);
        if (!attemptsByQuizId.has(key)) {
          attemptsByQuizId.set(key, {
            ...normalizeQuizAttempt(attempt),
          });
        }
      });

      quizzes.forEach((quiz) => {
        quiz.myAttempt = attemptsByQuizId.get(String(quiz._id)) || null;
      });
    }

    return res.json({ quizzes: quizzes.map(normalizeQuiz) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load quizzes." });
  }
};

exports.createQuiz = async (req, res) => {
  try {
    const payload = normalizeQuizPayload(req.body);
    const validationError = validateQuizPayload(payload);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const quiz = await Quiz.create({
      ...payload,
      createdBy: req.user._id,
    });

    const populated = await quiz.populate("createdBy", "_id fullName role");
    if (quiz.status === "PUBLISHED") {
      await createQuizPublishedNotifications(quiz);
    }
    return res.status(201).json({ quiz: normalizeQuiz(populated) });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create quiz." });
  }
};

exports.getQuizById = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate("createdBy", "_id fullName role");
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    if (req.user.role === "TUTOR" && String(quiz.createdBy._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Tutors can view only their own quizzes." });
    }

    if (req.user.role === "STUDENT" && quiz.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Quiz not found." });
    }

    return res.json({ quiz: normalizeQuiz(quiz) });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load quiz." });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const { quiz, error } = await loadManagedQuiz(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const payload = normalizeQuizPayload(req.body);
    const nextData = {
      title: "title" in payload ? payload.title : quiz.title,
      description: "description" in payload ? payload.description : quiz.description,
      moduleName: "moduleName" in payload ? payload.moduleName : quiz.moduleName,
      totalMarks: "totalMarks" in payload ? payload.totalMarks : quiz.totalMarks,
      deadline: "deadline" in payload ? payload.deadline : quiz.deadline,
      instructions: "instructions" in payload ? payload.instructions : quiz.instructions,
      status: "status" in payload ? payload.status : quiz.status,
      questions: "questions" in payload ? payload.questions : quiz.questions,
    };

    const validationError = validateQuizPayload(nextData);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const wasPublished = quiz.status === "PUBLISHED";
    Object.assign(quiz, nextData);
    await quiz.save();

    if (quiz.status === "PUBLISHED" && (wasPublished || nextData.status === "PUBLISHED")) {
      await createQuizUpdatedNotifications(quiz);
    }

    return res.json({ quiz: normalizeQuiz(quiz), message: "Quiz updated successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update quiz." });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const { quiz, error } = await loadManagedQuiz(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    await QuizAttempt.deleteMany({ quiz: quiz._id });
    await quiz.deleteOne();

    return res.json({ message: "Quiz deleted successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete quiz." });
  }
};

exports.publishQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate("createdBy", "_id fullName role");
    if (!quiz) return res.status(404).json({ message: "Quiz not found." });
    if (req.user.role === "TUTOR" && String(quiz.createdBy._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Tutors can publish only their own quizzes." });
    }
    if (quiz.status === "PUBLISHED") {
      return res.json({ quiz: normalizeQuiz(quiz), message: "Quiz already published." });
    }

    quiz.status = "PUBLISHED";
    await quiz.save();
    await createQuizPublishedNotifications(quiz);

    return res.json({ quiz: normalizeQuiz(quiz), message: "Quiz published successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to publish quiz." });
  }
};

exports.startQuizAttempt = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || quiz.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Quiz not found." });
    }
    if (isPastDeadline(quiz.deadline)) {
      return res.status(400).json({ message: "This quiz is closed because the deadline has passed." });
    }
    if (req.user.role !== "STUDENT") {
      return res.status(403).json({ message: "Forbidden: not allowed." });
    }

    let attempt = await QuizAttempt.findOne({
      quiz: quiz._id,
      student: req.user._id,
      status: "STARTED",
    });

    if (!attempt) {
      attempt = await QuizAttempt.create({
        quiz: quiz._id,
        student: req.user._id,
        status: "STARTED",
      });
    }

    return res.status(201).json({
      attempt: {
        _id: attempt._id,
        status: attempt.status,
        startedAt: attempt.startedAt,
      },
      quiz: normalizeQuiz(quiz),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to start quiz." });
  }
};

exports.submitQuizAttempt = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz || quiz.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Quiz not found." });
    }
    if (isPastDeadline(quiz.deadline)) {
      return res.status(400).json({ message: "This quiz is closed because the deadline has passed." });
    }
    if (req.user.role !== "STUDENT") {
      return res.status(403).json({ message: "Forbidden: not allowed." });
    }

    const attempt = await QuizAttempt.findOne({
      _id: req.params.attemptId,
      quiz: quiz._id,
      student: req.user._id,
      status: "STARTED",
    });
    if (!attempt) {
      return res.status(404).json({ message: "Quiz attempt not found." });
    }

    const answersPayload = Array.isArray(req.body.answers) ? req.body.answers : [];
    const answersByQuestionId = new Map(
      answersPayload.map((answer) => [String(answer.questionId), String(answer.answer || "").trim()])
    );

    let score = 0;
    const answers = quiz.questions.map((question) => {
      const answer = answersByQuestionId.get(String(question._id)) || "";
      const isCorrect = answer.trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
      const marksAwarded = isCorrect ? Number(question.marks) : 0;
      score += marksAwarded;
      return {
        questionId: question._id,
        answer,
        isCorrect,
        marksAwarded,
      };
    });

    attempt.answers = answers;
    attempt.score = score;
    attempt.status = "SUBMITTED";
    attempt.reviewStatus = "AUTO_GRADED";
    attempt.overallFeedback = "";
    attempt.reviewedBy = null;
    attempt.reviewedAt = null;
    attempt.submittedAt = new Date();
    await attempt.save();

    return res.json({
      attempt: normalizeQuizAttempt(attempt),
      message: "Quiz submitted successfully.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to submit quiz." });
  }
};

exports.getQuizAttemptsOverview = async (req, res) => {
  try {
    const { quiz, error } = await loadManagedQuiz(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const modules = await Module.find(await buildModuleRecipientQuery(quiz.moduleName, quiz.createdBy)).select("_id");
    const studentModules = await StudentModule.find({
      module: { $in: modules.map((moduleItem) => moduleItem._id) },
    }).populate("student", "_id fullName email userId");

    const uniqueStudents = new Map();
    studentModules.forEach((studentModule) => {
      if (!studentModule.student) return;
      const studentId = String(studentModule.student._id);
      if (!uniqueStudents.has(studentId)) uniqueStudents.set(studentId, studentModule.student);
    });

    const attempts = await QuizAttempt.find({ quiz: quiz._id }).populate("student", "_id fullName email userId");
    const attemptsByStudentId = new Map(
      attempts
        .filter((attempt) => attempt.student)
        .map((attempt) => [String(attempt.student._id), attempt])
    );

    const rows = Array.from(uniqueStudents.values()).map((student) => {
      const attempt = attemptsByStudentId.get(String(student._id));
      const submittedAt = attempt?.submittedAt || null;
      const isLate = Boolean(submittedAt && new Date(submittedAt).getTime() > new Date(quiz.deadline).getTime());

      return {
        student: {
          _id: student._id,
          fullName: student.fullName,
          email: student.email,
          userId: student.userId,
        },
        attemptId: attempt?._id || null,
        submitted: Boolean(attempt && attempt.status === "SUBMITTED"),
        submittedAt,
        isLate,
        status: !attempt ? "NOT_SUBMITTED" : isLate ? "LATE" : attempt.reviewStatus === "REVIEWED" ? "REVIEWED" : "AUTO_GRADED",
        score: attempt?.score ?? null,
        reviewStatus: attempt?.reviewStatus || "AUTO_GRADED",
        overallFeedback: attempt?.overallFeedback || "",
        reviewedAt: attempt?.reviewedAt || null,
        answers: attempt?.answers || [],
      };
    });

    return res.json({
      quiz: normalizeQuiz(quiz),
      summary: {
        totalStudents: rows.length,
        submittedCount: rows.filter((row) => row.submitted).length,
        notSubmittedCount: rows.filter((row) => !row.submitted).length,
        lateCount: rows.filter((row) => row.isLate).length,
      },
      attempts: rows,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load quiz attempts." });
  }
};

exports.reviewQuizAttempt = async (req, res) => {
  try {
    const { quiz, error } = await loadManagedQuiz(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const attempt = await QuizAttempt.findOne({
      _id: req.params.attemptId,
      quiz: quiz._id,
      status: "SUBMITTED",
    });
    if (!attempt) {
      return res.status(404).json({ message: "Quiz attempt not found." });
    }

    const answersPayload = Array.isArray(req.body.answers) ? req.body.answers : [];
    const answerPatchMap = new Map(
      answersPayload.map((item) => [
        String(item.questionId),
        {
          marksAwarded: Number(item.marksAwarded),
          reviewComment: String(item.reviewComment || "").trim(),
        },
      ])
    );

    let score = 0;
    attempt.answers = attempt.answers.map((answer) => {
      const question = quiz.questions.find((item) => String(item._id) === String(answer.questionId));
      const patch = answerPatchMap.get(String(answer.questionId));
      if (!question || !patch) {
        score += Number(answer.marksAwarded || 0);
        return answer;
      }

      const maxMarks = Number(question.marks);
      const nextMarks = Number.isNaN(patch.marksAwarded) ? Number(answer.marksAwarded || 0) : patch.marksAwarded;
      const boundedMarks = Math.max(0, Math.min(maxMarks, nextMarks));
      score += boundedMarks;

      return {
        ...answer.toObject(),
        marksAwarded: boundedMarks,
        reviewComment: patch.reviewComment,
      };
    });

    attempt.score = score;
    attempt.reviewStatus = "REVIEWED";
    attempt.overallFeedback = String(req.body.overallFeedback || "").trim();
    attempt.reviewedBy = req.user._id;
    attempt.reviewedAt = new Date();
    await attempt.save();

    return res.json({
      attempt: normalizeQuizAttempt(attempt),
      message: "Quiz attempt reviewed successfully.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to review quiz attempt." });
  }
};
