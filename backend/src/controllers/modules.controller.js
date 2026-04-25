const { Module, FACULTY_CODE_PREFIXES } = require("../models/Module");
const User = require("../models/User");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");
const StudentModule = require("../models/StudentModule");
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Quiz = require("../models/Quiz");
const QuizAttempt = require("../models/QuizAttempt");
const ModuleResult = require("../models/ModuleResult");
const { syncStudentsForModule, resyncModulesForAcademicGroup } = require("../services/student-module-sync");

function normalizeModule(moduleItem) {
  return {
    _id: moduleItem._id,
    moduleCode: moduleItem.moduleCode,
    name: moduleItem.name,
    faculty: moduleItem.faculty,
    year: moduleItem.year,
    semester: moduleItem.semester,
    description: moduleItem.description,
    assignedTutor: moduleItem.assignedTutor
      ? {
          _id: moduleItem.assignedTutor._id,
          fullName: moduleItem.assignedTutor.fullName,
          email: moduleItem.assignedTutor.email,
          userId: moduleItem.assignedTutor.userId,
          faculty: moduleItem.assignedTutor.faculty,
        }
      : null,
    createdBy: moduleItem.createdBy,
    createdAt: moduleItem.createdAt,
    updatedAt: moduleItem.updatedAt,
  };
}

function normalizeModuleResult(result) {
  return {
    _id: result._id,
    module: result.module,
    student: result.student,
    obtainedMarks: result.obtainedMarks,
    totalMarks: result.totalMarks,
    percentage: result.percentage,
    grade: result.grade,
    passStatus: result.passStatus,
    publicationStatus: result.publicationStatus,
    hasPendingGrading: result.hasPendingGrading,
    calculatedAt: result.calculatedAt,
    publishedAt: result.publishedAt,
    breakdown: result.breakdown,
  };
}

function calculateGrade(percentage) {
  if (percentage >= 90) return { grade: "A+", passStatus: "PASS" };
  if (percentage >= 80) return { grade: "A", passStatus: "PASS" };
  if (percentage >= 75) return { grade: "A-", passStatus: "PASS" };
  if (percentage >= 70) return { grade: "B+", passStatus: "PASS" };
  if (percentage >= 65) return { grade: "B", passStatus: "PASS" };
  if (percentage >= 60) return { grade: "B-", passStatus: "PASS" };
  if (percentage >= 55) return { grade: "C+", passStatus: "PASS" };
  if (percentage >= 45) return { grade: "C", passStatus: "PASS" };
  if (percentage >= 40) return { grade: "D", passStatus: "CONDITIONAL_PASS" };
  return { grade: "F", passStatus: "FAIL" };
}

function roundTo(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ensureModuleAccess(moduleItem, user) {
  if (
    user.role === "TUTOR" &&
    moduleItem.assignedTutor &&
    String(moduleItem.assignedTutor) !== String(user._id)
  ) {
    return "Forbidden: not allowed.";
  }

  if (user.role === "TUTOR" && !moduleItem.assignedTutor && moduleItem.faculty !== user.faculty) {
    return "Forbidden: not allowed.";
  }

  return null;
}

function usesManualQuizReview(quiz) {
  return (quiz.questions || []).some(
    (question) => question.questionType === "SHORT_ANSWER" || question.questionType === "FILL_IN_THE_BLANKS"
  );
}

function buildBlankModuleResultRow(moduleItem, student) {
  return {
    _id: `pending-${moduleItem._id}-${student._id}`,
    module: moduleItem._id,
    student,
    obtainedMarks: null,
    totalMarks: 100,
    percentage: null,
    grade: null,
    passStatus: null,
    publicationStatus: "DRAFT",
    hasPendingGrading: false,
    calculatedAt: null,
    publishedAt: null,
    breakdown: {
      assignmentObtained: 0,
      assignmentTotal: 0,
      quizObtained: 0,
      quizTotal: 0,
      combinedObtained: 0,
      combinedTotal: 0,
    },
    isCalculated: false,
  };
}

function buildResultsSummary(results) {
  const calculatedResults = results.filter((item) => item.isCalculated);
  return {
    totalStudents: results.length,
    calculatedCount: calculatedResults.length,
    passCount: calculatedResults.filter((item) => item.passStatus === "PASS").length,
    conditionalPassCount: calculatedResults.filter((item) => item.passStatus === "CONDITIONAL_PASS").length,
    failCount: calculatedResults.filter((item) => item.passStatus === "FAIL").length,
    absentCount: calculatedResults.filter((item) => item.passStatus === "ABSENT").length,
    pendingGradingCount: calculatedResults.filter((item) => item.hasPendingGrading).length,
  };
}

async function buildModuleResultContext(moduleItem) {
  const [studentModules, assignments, quizzes, savedResults] = await Promise.all([
    StudentModule.find({ module: moduleItem._id }).populate("student", "_id fullName email userId"),
    Assignment.find({ moduleName: moduleItem.name, status: "PUBLISHED" }).select("_id title totalMarks deadline"),
    Quiz.find({ moduleName: moduleItem.name, status: "PUBLISHED" }).select("_id title totalMarks deadline questions"),
    ModuleResult.find({ module: moduleItem._id }).populate("student", "_id fullName email userId"),
  ]);

  const students = studentModules.map((item) => item.student).filter(Boolean);
  const assignmentIds = assignments.map((item) => item._id);
  const quizIds = quizzes.map((item) => item._id);
  const studentIds = students.map((student) => student._id);

  const [submissions, attempts] = await Promise.all([
    assignmentIds.length > 0
      ? AssignmentSubmission.find({ assignment: { $in: assignmentIds }, student: { $in: studentIds } })
          .select("assignment student totalMarksAwarded gradingStatus submittedAt")
      : [],
    quizIds.length > 0
      ? QuizAttempt.find({ quiz: { $in: quizIds }, student: { $in: studentIds }, status: "SUBMITTED" })
          .select("quiz student score reviewStatus submittedAt")
      : [],
  ]);

  const assignmentsById = new Map(assignments.map((item) => [String(item._id), item]));
  const quizzesById = new Map(quizzes.map((item) => [String(item._id), item]));
  const resultsByStudent = new Map(savedResults.map((item) => [String(item.student._id), item]));
  const submissionsByStudent = new Map();
  const attemptsByStudent = new Map();

  submissions.forEach((submission) => {
    const key = String(submission.student);
    const list = submissionsByStudent.get(key) || [];
    list.push(submission);
    submissionsByStudent.set(key, list);
  });

  attempts.forEach((attempt) => {
    const key = String(attempt.student);
    const list = attemptsByStudent.get(key) || [];
    list.push(attempt);
    attemptsByStudent.set(key, list);
  });

  const assignmentTotal = assignments.reduce((sum, item) => sum + Number(item.totalMarks || 0), 0);
  const quizTotal = quizzes.reduce((sum, item) => sum + Number(item.totalMarks || 0), 0);
  const combinedTotal = assignmentTotal + quizTotal;
  const deadlinesClosed = [...assignments, ...quizzes].every((item) => new Date(item.deadline).getTime() <= Date.now());

  return {
    moduleId: moduleItem._id,
    students,
    assignments,
    quizzes,
    assignmentsById,
    quizzesById,
    resultsByStudent,
    submissionsByStudent,
    attemptsByStudent,
    assignmentTotal,
    quizTotal,
    combinedTotal,
    deadlinesClosed,
    hasPublishedAssessments: assignments.length > 0 || quizzes.length > 0,
  };
}

function buildCalculatedModuleResult(student, context, currentResult) {
  const studentSubmissions = context.submissionsByStudent.get(String(student._id)) || [];
  const studentAttempts = context.attemptsByStudent.get(String(student._id)) || [];

  const onTimeSubmissions = studentSubmissions.filter((submission) => {
    const assignment = context.assignmentsById.get(String(submission.assignment));
    if (!assignment || !submission.submittedAt) return false;
    return new Date(submission.submittedAt).getTime() <= new Date(assignment.deadline).getTime();
  });

  const onTimeAttempts = studentAttempts.filter((attempt) => {
    const quiz = context.quizzesById.get(String(attempt.quiz));
    if (!quiz || !attempt.submittedAt) return false;
    return new Date(attempt.submittedAt).getTime() <= new Date(quiz.deadline).getTime();
  });

  const assignmentObtained = roundTo(onTimeSubmissions.reduce((sum, item) => sum + Number(item.totalMarksAwarded || 0), 0), 2);
  const quizObtained = roundTo(onTimeAttempts.reduce((sum, item) => sum + Number(item.score || 0), 0), 2);
  const combinedObtained = roundTo(assignmentObtained + quizObtained, 2);
  const hadOnTimeParticipation = onTimeSubmissions.length > 0 || onTimeAttempts.length > 0;
  const percentage = context.combinedTotal > 0 ? roundTo((combinedObtained / context.combinedTotal) * 100, 2) : 0;
  const obtainedMarks = roundTo(percentage, 2);
  const hasPendingAssignmentGrading = onTimeSubmissions.some((item) => item.gradingStatus !== "GRADED");
  const hasPendingQuizReview = onTimeAttempts.some((attempt) => {
    const quiz = context.quizzesById.get(String(attempt.quiz));
    return quiz && usesManualQuizReview(quiz) && attempt.reviewStatus !== "REVIEWED";
  });
  const hasPendingGrading = hasPendingAssignmentGrading || hasPendingQuizReview;

  let grade = "AB";
  let passStatus = "ABSENT";

  if (!context.hasPublishedAssessments) {
    grade = "N/A";
    passStatus = "FAIL";
  } else if (hadOnTimeParticipation) {
    const evaluated = calculateGrade(percentage);
    grade = evaluated.grade;
    passStatus = evaluated.passStatus;
  }

  return {
    _id: currentResult?._id || `pending-${context.moduleId}-${student._id}`,
    module: context.moduleId,
    student,
    obtainedMarks,
    totalMarks: 100,
    percentage,
    grade,
    passStatus,
    publicationStatus: currentResult?.publicationStatus || "DRAFT",
    hasPendingGrading,
    calculatedAt: new Date(),
    publishedAt: currentResult?.publishedAt || null,
    breakdown: {
      assignmentObtained,
      assignmentTotal: context.assignmentTotal,
      quizObtained,
      quizTotal: context.quizTotal,
      combinedObtained,
      combinedTotal: context.combinedTotal,
    },
    isCalculated: true,
  };
}

function buildModuleReadiness(context, results) {
  const summary = buildResultsSummary(results);
  const allCalculated = results.length > 0 && results.every((item) => item.isCalculated);
  const canPublish =
    context.hasPublishedAssessments &&
    context.deadlinesClosed &&
    allCalculated &&
    summary.pendingGradingCount === 0;

  let message = "Calculate grades after the published assignments and quizzes are finished.";
  if (!context.hasPublishedAssessments) {
    message = "This module does not have any published assignments or quizzes yet.";
  } else if (!context.deadlinesClosed && summary.pendingGradingCount > 0) {
    message = "Publishing becomes available after every published assignment and quiz deadline has passed, and after the tutor evaluates all assignment and quiz marks.";
  } else if (!context.deadlinesClosed) {
    message = "Publishing becomes available after every published assignment and quiz deadline has passed, and after the tutor evaluates all assignment and quiz marks.";
  } else if (!allCalculated) {
    message = "All result rows are ready. Calculate grades to fill in the final grade columns.";
  } else if (summary.pendingGradingCount > 0) {
    message = "Publishing becomes available after every published assignment and quiz deadline has passed, and after the tutor evaluates all assignment and quiz marks.";
  } else {
    message = "It's time to publish results. Students in this module will be notified immediately.";
  }

  return {
    hasPublishedAssessments: context.hasPublishedAssessments,
    deadlinesClosed: context.deadlinesClosed,
    canPublish,
    message,
  };
}

async function createModuleResultsPublishedNotifications(moduleItem) {
  const studentModules = await StudentModule.find({ module: moduleItem._id }).select("student module");
  if (studentModules.length === 0) return;

  await Notification.insertMany(
    studentModules.map((studentModule) => ({
      user: studentModule.student,
      type: "MODULE_RESULTS_PUBLISHED",
      message: `Final results are now published for ${moduleItem.moduleCode} - ${moduleItem.name}.`,
      meta: {
        redirectPath: `/student/marks?moduleId=${moduleItem._id}`,
      },
    }))
  );
}

async function generateNextModuleCode(faculty) {
  const prefix = FACULTY_CODE_PREFIXES[faculty];
  if (!prefix) {
    throw new Error("Invalid faculty for module code generation.");
  }

  const latestModule = await Module.findOne({
    moduleCode: { $regex: `^${prefix}[0-9]{4}$` },
  })
    .sort({ moduleCode: -1 })
    .select("moduleCode");

  const latestNumber = latestModule ? Number(String(latestModule.moduleCode).slice(prefix.length)) : 0;
  const nextNumber = latestNumber + 1;

  if (nextNumber > 9999) {
    throw new Error(`Module code limit reached for prefix ${prefix}.`);
  }

  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

async function createModuleWithGeneratedCode(payload) {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const moduleCode = await generateNextModuleCode(payload.faculty);
    try {
      return await Module.create({ ...payload, moduleCode });
    } catch (err) {
      if (err?.code === 11000 && err?.keyPattern?.moduleCode) {
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not generate a unique module code. Please try again.");
}

function resolveAssignedTutorQuery(assignedTutorValue) {
  const rawValue = String(assignedTutorValue || "").trim();
  if (!rawValue) return null;

  if (mongoose.Types.ObjectId.isValid(rawValue)) {
    return { _id: rawValue };
  }

  const labelMatch = rawValue.match(/\(([A-Z]\d+)\)$/i);
  if (labelMatch?.[1]) {
    return { userId: labelMatch[1].toUpperCase() };
  }

  if (/^[A-Z]\d+$/i.test(rawValue)) {
    return { userId: rawValue.toUpperCase() };
  }

  return null;
}

async function validateAssignedTutor(assignedTutorId, faculty) {
  const tutorQuery = resolveAssignedTutorQuery(assignedTutorId);
  if (!tutorQuery) {
    throw new Error("assignedTutor is required.");
  }

  const tutor = await User.findOne({
    ...tutorQuery,
    role: "TUTOR",
    faculty: String(faculty).trim(),
  }).select("_id fullName email userId faculty");

  if (!tutor) {
    throw new Error("Selected tutor is invalid for the chosen faculty.");
  }

  return tutor;
}

async function notifyAssignedTutorOnly(moduleItem, tutor) {
  await Notification.create({
    user: tutor._id,
    type: "MODULE_ASSIGNED",
    message: `You have been assigned to module ${moduleItem.moduleCode} - ${moduleItem.name}.`,
    meta: { redirectPath: "/tutor/assignments" },
  });
}

function buildModuleQuery(req) {
  const { faculty, year, semester } = req.query;
  const query = {};

  if (req.user.role === "STUDENT") {
    query.faculty = req.user.faculty;
    query.year = req.user.year;
    query.semester = req.user.semester;
    return query;
  }

  if (req.user.role === "TUTOR") {
    query.$or = [
      { assignedTutor: req.user._id },
      { assignedTutor: null, faculty: req.user.faculty },
      { assignedTutor: { $exists: false }, faculty: req.user.faculty },
    ];
  }

  if (faculty) query.faculty = String(faculty).trim();
  if (year != null && year !== "") query.year = Number(year);
  if (semester != null && semester !== "") query.semester = Number(semester);

  return query;
}

exports.listModules = async (req, res) => {
  try {
    if (req.user.role === "STUDENT") {
      const studentModules = await StudentModule.find({ student: req.user._id })
        .populate({
          path: "module",
          populate: { path: "createdBy", select: "_id fullName role" },
        })
        .sort({ createdAt: -1 });

      const modules = studentModules
        .map((studentModule) => studentModule.module)
        .filter(Boolean)
        .sort((a, b) => {
          if (a.faculty !== b.faculty) return a.faculty.localeCompare(b.faculty);
          if (a.year !== b.year) return a.year - b.year;
          if (a.semester !== b.semester) return a.semester - b.semester;
          return a.name.localeCompare(b.name);
        });

      return res.json({ modules: modules.map(normalizeModule) });
    }

    const modules = await Module.find(buildModuleQuery(req))
      .sort({ faculty: 1, year: 1, semester: 1, name: 1 })
      .populate("createdBy", "_id fullName role")
      .populate("assignedTutor", "_id fullName email userId faculty");

    return res.json({ modules: modules.map(normalizeModule) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load modules." });
  }
};

exports.getModuleById = async (req, res) => {
  try {
    const moduleItem = await Module.findById(req.params.id)
      .populate("createdBy", "_id fullName role")
      .populate("assignedTutor", "_id fullName email userId faculty");
    if (!moduleItem) return res.status(404).json({ message: "Module not found." });

    if (req.user.role === "STUDENT") {
      const assignment = await StudentModule.findOne({ student: req.user._id, module: moduleItem._id }).select("_id");
      if (!assignment) return res.status(403).json({ message: "Forbidden: not allowed." });
    }

    if (
      req.user.role === "TUTOR" &&
      moduleItem.assignedTutor &&
      String(moduleItem.assignedTutor._id) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: "Forbidden: not allowed." });
    }

    if (
      req.user.role === "TUTOR" &&
      !moduleItem.assignedTutor &&
      moduleItem.faculty !== req.user.faculty
    ) {
      return res.status(403).json({ message: "Forbidden: not allowed." });
    }

    return res.json({ module: normalizeModule(moduleItem) });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.createModule = async (req, res) => {
  try {
    const { name, faculty, year, semester, description, assignedTutor } = req.body;
    if (!name || !faculty || year == null || semester == null || !description || !assignedTutor) {
      return res.status(400).json({ message: "name, faculty, year, semester, description, assignedTutor are required." });
    }

    const tutor = await validateAssignedTutor(assignedTutor, faculty);

    const moduleItem = await createModuleWithGeneratedCode({
      name: String(name).trim(),
      faculty: String(faculty).trim(),
      year: Number(year),
      semester: Number(semester),
      description: String(description).trim(),
      assignedTutor: tutor._id,
      createdBy: req.user._id,
    });
    await syncStudentsForModule(moduleItem);
    await notifyAssignedTutorOnly(moduleItem, tutor);

    const populated = await moduleItem.populate([
      { path: "createdBy", select: "_id fullName role" },
      { path: "assignedTutor", select: "_id fullName email userId faculty" },
    ]);
    return res.status(201).json({ module: normalizeModule(populated) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "This module already exists for the selected faculty, year, and semester." });
    }
    return res.status(400).json({ message: err.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const moduleItem = await Module.findById(req.params.id);
    if (!moduleItem) return res.status(404).json({ message: "Module not found." });
    const previousAcademicGroup = {
      faculty: moduleItem.faculty,
      year: moduleItem.year,
      semester: moduleItem.semester,
    };

    const { name, faculty, year, semester, description, assignedTutor } = req.body;
    if (name !== undefined) moduleItem.name = String(name).trim();
    if (faculty !== undefined) moduleItem.faculty = String(faculty).trim();
    if (year !== undefined) moduleItem.year = Number(year);
    if (semester !== undefined) moduleItem.semester = Number(semester);
    if (description !== undefined) moduleItem.description = String(description).trim();

    let assignedTutorChanged = false;
    let nextTutor = null;

    if (assignedTutor !== undefined) {
      const tutor = await validateAssignedTutor(assignedTutor, moduleItem.faculty);
      assignedTutorChanged = String(moduleItem.assignedTutor || "") !== String(tutor._id);
      moduleItem.assignedTutor = tutor._id;
      nextTutor = tutor;
    }

    if (faculty !== undefined && String(faculty).trim() !== previousAcademicGroup.faculty) {
      moduleItem.moduleCode = await generateNextModuleCode(moduleItem.faculty);
    }

    await moduleItem.save();
    await resyncModulesForAcademicGroup(moduleItem, previousAcademicGroup);
    if (assignedTutorChanged && nextTutor) {
      await notifyAssignedTutorOnly(moduleItem, nextTutor);
    }
    const populated = await moduleItem.populate([
      { path: "createdBy", select: "_id fullName role" },
      { path: "assignedTutor", select: "_id fullName email userId faculty" },
    ]);
    return res.json({ module: normalizeModule(populated), message: "Module updated successfully." });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "This module already exists for the selected faculty, year, and semester." });
    }
    return res.status(400).json({ message: err.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    await StudentModule.deleteMany({ module: req.params.id });
    const deleted = await Module.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Module not found." });
    return res.json({ message: "Module deleted successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

exports.calculateModuleResults = async (req, res) => {
  try {
    const moduleItem = await Module.findById(req.params.id);
    if (!moduleItem) return res.status(404).json({ message: "Module not found." });

    const accessError = ensureModuleAccess(moduleItem, req.user);
    if (accessError) return res.status(403).json({ message: accessError });

    const context = await buildModuleResultContext(moduleItem);
    const results = [];

    for (const student of context.students) {
      const currentResult = context.resultsByStudent.get(String(student._id));
      const nextResult = buildCalculatedModuleResult(student, context, currentResult);
      const saved = await ModuleResult.findOneAndUpdate(
        { module: moduleItem._id, student: student._id },
        {
          obtainedMarks: nextResult.obtainedMarks,
          totalMarks: nextResult.totalMarks,
          percentage: nextResult.percentage,
          grade: nextResult.grade,
          passStatus: nextResult.passStatus,
          hasPendingGrading: nextResult.hasPendingGrading,
          calculatedAt: nextResult.calculatedAt,
          publishedAt: nextResult.publishedAt,
          publicationStatus: nextResult.publicationStatus,
          breakdown: nextResult.breakdown,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).populate("student", "_id fullName email userId");
      results.push({ ...normalizeModuleResult(saved), isCalculated: true });
    }

    return res.json({
      module: normalizeModule(moduleItem),
      summary: buildResultsSummary(results),
      readiness: buildModuleReadiness(context, results),
      results,
      message: "Module final results calculated successfully.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to calculate module results." });
  }
};

exports.listModuleResults = async (req, res) => {
  try {
    const moduleItem = await Module.findById(req.params.id);
    if (!moduleItem) return res.status(404).json({ message: "Module not found." });

    if (req.user.role === "STUDENT") {
      const studentModule = await StudentModule.findOne({ module: moduleItem._id, student: req.user._id }).select("_id");
      if (!studentModule) return res.status(403).json({ message: "Forbidden: not allowed." });

      const result = await ModuleResult.findOne({
        module: moduleItem._id,
        student: req.user._id,
        publicationStatus: "PUBLISHED",
      }).populate("student", "_id fullName email userId");

      return res.json({
        module: normalizeModule(moduleItem),
        summary: buildResultsSummary(result ? [{ ...normalizeModuleResult(result), isCalculated: true }] : []),
        readiness: null,
        results: result ? [{ ...normalizeModuleResult(result), isCalculated: true }] : [],
      });
    }

    const accessError = ensureModuleAccess(moduleItem, req.user);
    if (accessError) return res.status(403).json({ message: accessError });

    const context = await buildModuleResultContext(moduleItem);
    const results = context.students.map((student) => {
      const saved = context.resultsByStudent.get(String(student._id));
      return saved ? { ...normalizeModuleResult(saved), isCalculated: true } : buildBlankModuleResultRow(moduleItem, student);
    });

    return res.json({
      module: normalizeModule(moduleItem),
      summary: buildResultsSummary(results),
      readiness: buildModuleReadiness(context, results),
      results,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load module results." });
  }
};

exports.publishModuleResults = async (req, res) => {
  try {
    const moduleItem = await Module.findById(req.params.id);
    if (!moduleItem) return res.status(404).json({ message: "Module not found." });

    const accessError = ensureModuleAccess(moduleItem, req.user);
    if (accessError) return res.status(403).json({ message: accessError });

    const context = await buildModuleResultContext(moduleItem);
    const previewResults = context.students.map((student) => {
      const saved = context.resultsByStudent.get(String(student._id));
      return saved ? { ...normalizeModuleResult(saved), isCalculated: true } : buildBlankModuleResultRow(moduleItem, student);
    });
    const readiness = buildModuleReadiness(context, previewResults);
    if (!readiness.canPublish) {
      return res.status(400).json({ message: readiness.message });
    }

    await ModuleResult.updateMany(
      { module: moduleItem._id },
      { publicationStatus: "PUBLISHED", publishedAt: new Date() }
    );
    await createModuleResultsPublishedNotifications(moduleItem);

    const results = await ModuleResult.find({ module: moduleItem._id })
      .populate("student", "_id fullName email userId")
      .sort({ percentage: -1, updatedAt: 1 });

    return res.json({
      module: normalizeModule(moduleItem),
      summary: buildResultsSummary(results.map((item) => ({ ...normalizeModuleResult(item), isCalculated: true }))),
      readiness: { ...readiness, canPublish: false, message: "Module final results were published and students have been notified." },
      results: results.map((item) => ({ ...normalizeModuleResult(item), isCalculated: true })),
      message: "Module final results published successfully.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to publish module results." });
  }
};

exports.listMyModuleResults = async (req, res) => {
  try {
    const studentModules = await StudentModule.find({ student: req.user._id }).populate({
      path: "module",
      select: "_id moduleCode name faculty year semester description assignedTutor",
      populate: { path: "assignedTutor", select: "_id fullName email userId faculty" },
    });

    const moduleIds = studentModules.map((item) => item.module?._id).filter(Boolean);
    const results = await ModuleResult.find({
      module: { $in: moduleIds },
      student: req.user._id,
      publicationStatus: "PUBLISHED",
    })
      .populate("module")
      .populate("student", "_id fullName email userId");

    const resultsByModule = new Map(results.map((item) => [String(item.module._id), item]));
    const rows = studentModules
      .map((studentModule) => {
        if (!studentModule.module) return null;
        const result = resultsByModule.get(String(studentModule.module._id));
        return {
          module: normalizeModule(studentModule.module),
          result: result ? { ...normalizeModuleResult(result), isCalculated: true } : null,
        };
      })
      .filter(Boolean);

    return res.json({ items: rows });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load student marks." });
  }
};
