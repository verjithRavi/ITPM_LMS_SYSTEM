const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const { Module } = require("../models/Module");
const StudentModule = require("../models/StudentModule");
const Notification = require("../models/Notification");
const User = require("../models/User");

function normalizeAssignment(assignment) {
  const isClosed = assignment.status === "PUBLISHED" && new Date(assignment.deadline).getTime() < Date.now();
  return {
    _id: assignment._id,
    title: assignment.title,
    description: assignment.description,
    moduleName: assignment.moduleName,
    totalMarks: assignment.totalMarks,
    deadline: assignment.deadline,
    submissionType: assignment.submissionType,
    instructions: assignment.instructions,
    status: assignment.status,
    isClosed,
    createdBy: assignment.createdBy,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
    mySubmission: assignment.mySubmission || null,
  };
}

function isPastDeadline(value) {
  return new Date(value).getTime() < Date.now();
}

function isValidDataUrl(value) {
  return /^data:[^;]+;base64,/i.test(String(value || "").trim());
}

function getAllowedSubmissionMimeTypes(submissionType) {
  if (submissionType === "PDF") {
    return ["application/pdf"];
  }

  if (submissionType === "DOCX") {
    return [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/octet-stream",
      "application/zip",
    ];
  }

  if (submissionType === "ZIP") {
    return ["application/zip", "application/x-zip-compressed", "multipart/x-zip"];
  }

  return [];
}

function getAllowedSubmissionExtensions(submissionType) {
  if (submissionType === "PDF") return [".pdf"];
  if (submissionType === "DOCX") return [".docx"];
  if (submissionType === "ZIP") return [".zip"];
  return [];
}

function validateAssignmentSubmissionPayload(assignment, body = {}) {
  const submissionText = String(body.submissionText || "").trim();
  const attachmentUrl = String(body.attachmentUrl || "").trim();
  const attachmentName = String(body.attachmentName || "").trim().toLowerCase();

  if (assignment.submissionType === "TEXT") {
    if (!submissionText) {
      return "This assignment requires a text submission.";
    }
    if (attachmentUrl) {
      return "File uploads are not allowed for this assignment. Please submit text only.";
    }
    return null;
  }

  if (!attachmentUrl) {
    return `This assignment requires a ${assignment.submissionType} upload.`;
  }

  if (!isValidDataUrl(attachmentUrl)) {
    return "Please upload a valid file before submitting.";
  }

  if (submissionText) {
    return `This assignment accepts only ${assignment.submissionType} uploads. Text submission is not allowed.`;
  }

  const mimeMatch = attachmentUrl.match(/^data:([^;]+);base64,/i);
  const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : "";
  const allowedMimeTypes = getAllowedSubmissionMimeTypes(assignment.submissionType);
  const allowedExtensions = getAllowedSubmissionExtensions(assignment.submissionType);
  const hasAllowedExtension = allowedExtensions.some((extension) => attachmentName.endsWith(extension));

  if (!allowedMimeTypes.includes(mimeType) && !hasAllowedExtension) {
    return `Only ${assignment.submissionType} files are allowed for this assignment.`;
  }

  return null;
}

function normalizeAssignmentSubmission(submission) {
  return {
    _id: submission._id,
    status: submission.status,
    submissionText: submission.submissionText,
    attachmentUrl: submission.attachmentUrl,
    submittedAt: submission.submittedAt,
    criteriaScores: submission.criteriaScores || [],
    totalMarksAwarded: submission.totalMarksAwarded,
    comments: submission.comments || "",
    overallFeedback: submission.overallFeedback || "",
    gradingStatus: submission.gradingStatus || "PENDING",
    gradedAt: submission.gradedAt,
  };
}

function normalizeAssignmentPayload(body = {}) {
  const payload = {};

  if ("title" in body) payload.title = String(body.title || "").trim();
  if ("description" in body) payload.description = String(body.description || "").trim();
  if ("moduleName" in body) payload.moduleName = String(body.moduleName || "").trim();
  if ("totalMarks" in body) payload.totalMarks = Number(body.totalMarks);
  if ("deadline" in body) payload.deadline = new Date(body.deadline);
  if ("submissionType" in body) payload.submissionType = String(body.submissionType || "").trim().toUpperCase();
  if ("instructions" in body) payload.instructions = String(body.instructions || "").trim();
  if ("status" in body) payload.status = body.status === "DRAFT" ? "DRAFT" : "PUBLISHED";

  return payload;
}

function validateAssignmentPayload(payload) {
  if (!payload.title) return "title is required.";
  if (!payload.description) return "description is required.";
  if (!payload.moduleName) return "moduleName is required.";
  if (payload.totalMarks == null || Number.isNaN(payload.totalMarks)) return "totalMarks is required.";
  if (!(payload.deadline instanceof Date) || Number.isNaN(payload.deadline.getTime())) return "deadline is required.";
  if (!payload.submissionType) return "submissionType is required.";
  if (!payload.instructions) return "instructions are required.";
  return null;
}

async function loadManagedAssignment(id, user) {
  const assignment = await Assignment.findById(id).populate("createdBy", "_id fullName role");
  if (!assignment) {
    return { error: { status: 404, message: "Assignment not found." } };
  }
  if (user.role === "TUTOR" && String(assignment.createdBy._id) !== String(user._id)) {
    return { error: { status: 403, message: "Tutors can manage only their own assignments." } };
  }
  return { assignment };
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

async function listStudentsForAssignmentModule(moduleName, createdBy) {
  const modules = await Module.find(await buildModuleRecipientQuery(moduleName, createdBy)).select("_id");
  if (modules.length === 0) return [];

  const studentModules = await StudentModule.find({
    module: { $in: modules.map((moduleItem) => moduleItem._id) },
  }).populate("student", "_id fullName email userId");

  const uniqueStudents = new Map();
  studentModules.forEach((studentModule) => {
    if (!studentModule.student) return;
    const studentId = String(studentModule.student._id);
    if (!uniqueStudents.has(studentId)) {
      uniqueStudents.set(studentId, studentModule.student);
    }
  });

  return Array.from(uniqueStudents.values());
}

async function createAssignmentPublishedNotifications(assignment) {
  const targets = await findRecipientStudentTargetsForModule(assignment.moduleName, assignment.createdBy);
  if (targets.length === 0) return;

  await Notification.insertMany(
    targets.map((target) => ({
      user: target.studentId,
      type: "ASSIGNMENT_PUBLISHED",
      message: `New assignment published for ${assignment.moduleName}: ${assignment.title}`,
      meta: {
        redirectPath: `/student/modules/${target.moduleId}?assignmentId=${assignment._id}`,
      },
    }))
  );
}

async function createAssignmentUpdatedNotifications(assignment) {
  const targets = await findRecipientStudentTargetsForModule(assignment.moduleName, assignment.createdBy);
  if (targets.length === 0) return;

  await Notification.insertMany(
    targets.map((target) => ({
      user: target.studentId,
      type: "ASSIGNMENT_UPDATED",
      message: `Assignment updated for ${assignment.moduleName}: ${assignment.title}`,
      meta: {
        redirectPath: `/student/modules/${target.moduleId}?assignmentId=${assignment._id}`,
      },
    }))
  );
}

exports.listAssignments = async (req, res) => {
  try {
    let query = {};
    const { moduleName } = req.query;

    if (req.user.role === "TUTOR") {
      query = { createdBy: req.user._id };
    } else if (req.user.role === "STUDENT") {
      query = { status: "PUBLISHED" };
    }
    if (moduleName) query.moduleName = String(moduleName).trim();

    const assignments = await Assignment.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "_id fullName role");

    if (req.user.role === "STUDENT") {
      const submissions = await AssignmentSubmission.find({
        student: req.user._id,
        assignment: { $in: assignments.map((assignment) => assignment._id) },
      }).select("assignment status submissionText attachmentUrl submittedAt criteriaScores totalMarksAwarded comments overallFeedback gradingStatus gradedAt");

      const submissionsByAssignmentId = new Map(
        submissions.map((submission) => [
          String(submission.assignment),
          {
            ...normalizeAssignmentSubmission(submission),
          },
        ])
      );

      assignments.forEach((assignment) => {
        assignment.mySubmission = submissionsByAssignmentId.get(String(assignment._id)) || null;
      });
    }

    return res.json({ assignments: assignments.map(normalizeAssignment) });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load assignments." });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    const payload = normalizeAssignmentPayload(req.body);
    const validationError = validateAssignmentPayload(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const assignment = await Assignment.create({
      ...payload,
      createdBy: req.user._id,
    });

    const populated = await assignment.populate("createdBy", "_id fullName role");
    if (assignment.status === "PUBLISHED") {
      await createAssignmentPublishedNotifications(assignment);
    }

    return res.status(201).json({ assignment: normalizeAssignment(populated) });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to create assignment." });
  }
};

exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate("createdBy", "_id fullName role");
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    if (req.user.role === "TUTOR" && String(assignment.createdBy._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Tutors can view only their own assignments." });
    }

    if (req.user.role === "STUDENT" && assignment.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Assignment not found." });
    }

    return res.json({ assignment: normalizeAssignment(assignment) });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load assignment." });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const { assignment, error } = await loadManagedAssignment(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const payload = normalizeAssignmentPayload(req.body);
    const nextData = {
      title: "title" in payload ? payload.title : assignment.title,
      description: "description" in payload ? payload.description : assignment.description,
      moduleName: "moduleName" in payload ? payload.moduleName : assignment.moduleName,
      totalMarks: "totalMarks" in payload ? payload.totalMarks : assignment.totalMarks,
      deadline: "deadline" in payload ? payload.deadline : assignment.deadline,
      submissionType: "submissionType" in payload ? payload.submissionType : assignment.submissionType,
      instructions: "instructions" in payload ? payload.instructions : assignment.instructions,
      status: "status" in payload ? payload.status : assignment.status,
    };

    const validationError = validateAssignmentPayload(nextData);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const wasPublished = assignment.status === "PUBLISHED";
    Object.assign(assignment, nextData);
    await assignment.save();

    if (assignment.status === "PUBLISHED" && (wasPublished || nextData.status === "PUBLISHED")) {
      await createAssignmentUpdatedNotifications(assignment);
    }

    return res.json({ assignment: normalizeAssignment(assignment), message: "Assignment updated successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to update assignment." });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const { assignment, error } = await loadManagedAssignment(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    await AssignmentSubmission.deleteMany({ assignment: assignment._id });
    await assignment.deleteOne();

    return res.json({ message: "Assignment deleted successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to delete assignment." });
  }
};

exports.publishAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate("createdBy", "_id fullName role");
    if (!assignment) return res.status(404).json({ message: "Assignment not found." });
    if (req.user.role === "TUTOR" && String(assignment.createdBy._id) !== String(req.user._id)) {
      return res.status(403).json({ message: "Tutors can publish only their own assignments." });
    }
    if (assignment.status === "PUBLISHED") {
      return res.json({ assignment: normalizeAssignment(assignment), message: "Assignment already published." });
    }

    assignment.status = "PUBLISHED";
    await assignment.save();
    await createAssignmentPublishedNotifications(assignment);

    return res.json({ assignment: normalizeAssignment(assignment), message: "Assignment published successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to publish assignment." });
  }
};

exports.closeAssignment = async (req, res) => {
  try {
    const { assignment, error } = await loadManagedAssignment(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    if (assignment.status !== "PUBLISHED") {
      return res.status(400).json({ message: "Only published assignments can be closed." });
    }

    if (isPastDeadline(assignment.deadline)) {
      return res.json({ assignment: normalizeAssignment(assignment), message: "Assignment is already closed." });
    }

    assignment.deadline = new Date(Date.now() - 1000);
    await assignment.save();

    return res.json({ assignment: normalizeAssignment(assignment), message: "Assignment closed successfully." });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to close assignment." });
  }
};

exports.submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment || assignment.status !== "PUBLISHED") {
      return res.status(404).json({ message: "Assignment not found." });
    }
    if (isPastDeadline(assignment.deadline)) {
      return res.status(400).json({ message: "This assignment is closed because the deadline has passed." });
    }

    if (req.user.role !== "STUDENT") {
      return res.status(403).json({ message: "Forbidden: not allowed." });
    }

    const validationError = validateAssignmentSubmissionPayload(assignment, req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const submissionText = String(req.body.submissionText || "").trim();
    const attachmentUrl = String(req.body.attachmentUrl || "").trim();

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { assignment: assignment._id, student: req.user._id },
      {
        submissionText,
        attachmentUrl,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      submission: {
        ...normalizeAssignmentSubmission(submission),
      },
      message: "Assignment submitted successfully.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to submit assignment." });
  }
};

exports.getAssignmentSubmissionsOverview = async (req, res) => {
  try {
    const { assignment, error } = await loadManagedAssignment(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const [students, submissions] = await Promise.all([
      listStudentsForAssignmentModule(assignment.moduleName, assignment.createdBy),
      AssignmentSubmission.find({ assignment: assignment._id }).populate("student", "_id fullName email userId"),
    ]);

    const submissionsByStudentId = new Map(
      submissions.map((submission) => [String(submission.student?._id || submission.student), submission])
    );

    const rows = students.map((student) => {
      const submission = submissionsByStudentId.get(String(student._id));
      const submittedAt = submission?.submittedAt || null;
      const isLate = Boolean(submittedAt && new Date(submittedAt).getTime() > new Date(assignment.deadline).getTime());
      const hasAttachment = Boolean(submission?.attachmentUrl);
      const hasTextAnswer = Boolean(submission?.submissionText);

      return {
        student: {
          _id: student._id,
          fullName: student.fullName,
          email: student.email,
          userId: student.userId,
        },
        submitted: Boolean(submission),
        submittedAt,
        submissionId: submission?._id || null,
        isLate,
        submissionText: submission?.submissionText || "",
        attachmentUrl: submission?.attachmentUrl || "",
        status: submission ? (isLate ? "LATE" : submission.status) : "NOT_SUBMITTED",
        responseType: hasAttachment ? "FILE" : hasTextAnswer ? "TEXT" : "NONE",
        criteriaScores: submission?.criteriaScores || [],
        totalMarksAwarded: submission?.totalMarksAwarded ?? null,
        comments: submission?.comments || "",
        overallFeedback: submission?.overallFeedback || "",
        gradingStatus: submission?.gradingStatus || "PENDING",
        gradedAt: submission?.gradedAt || null,
      };
    });

    const summary = {
      totalStudents: rows.length,
      submittedCount: rows.filter((row) => row.submitted).length,
      notSubmittedCount: rows.filter((row) => !row.submitted).length,
      lateCount: rows.filter((row) => row.isLate).length,
    };

    return res.json({
      assignment: normalizeAssignment(assignment),
      summary,
      submissions: rows,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to load assignment submissions." });
  }
};

exports.reviewAssignmentSubmission = async (req, res) => {
  try {
    const { assignment, error } = await loadManagedAssignment(req.params.id, req.user);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const submission = await AssignmentSubmission.findOne({
      _id: req.params.submissionId,
      assignment: assignment._id,
    });

    if (!submission) {
      return res.status(404).json({ message: "Assignment submission not found." });
    }

    const criteriaScores = Array.isArray(req.body.criteriaScores)
      ? req.body.criteriaScores
          .map((item) => ({
            criterion: String(item.criterion || "").trim(),
            marksAwarded: Number(item.marksAwarded),
            comment: String(item.comment || "").trim(),
          }))
          .filter((item) => item.criterion)
      : [];

    const invalidCriterion = criteriaScores.find(
      (item) => Number.isNaN(item.marksAwarded) || item.marksAwarded < 0
    );
    if (invalidCriterion) {
      return res.status(400).json({ message: "Each criterion must have a valid mark." });
    }

    const totalMarksAwarded =
      "totalMarksAwarded" in req.body && req.body.totalMarksAwarded !== null && req.body.totalMarksAwarded !== ""
        ? Number(req.body.totalMarksAwarded)
        : criteriaScores.reduce((sum, item) => sum + item.marksAwarded, 0);

    if (Number.isNaN(totalMarksAwarded) || totalMarksAwarded < 0 || totalMarksAwarded > Number(assignment.totalMarks)) {
      return res.status(400).json({ message: "Total marks must be between 0 and the assignment total marks." });
    }

    submission.criteriaScores = criteriaScores;
    submission.totalMarksAwarded = totalMarksAwarded;
    submission.comments = String(req.body.comments || "").trim();
    submission.overallFeedback = String(req.body.overallFeedback || "").trim();
    submission.gradingStatus = "GRADED";
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    await submission.save();

    return res.json({
      submission: normalizeAssignmentSubmission(submission),
      message: "Assignment submission evaluated successfully.",
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to evaluate assignment submission." });
  }
};
