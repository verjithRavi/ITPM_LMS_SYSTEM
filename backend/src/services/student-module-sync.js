const { Module } = require("../models/Module");
const User = require("../models/User");
const StudentModule = require("../models/StudentModule");

function buildStudentAcademicQuery(studentLike) {
  return {
    faculty: studentLike.faculty,
    year: Number(studentLike.year),
    semester: Number(studentLike.semester),
  };
}

async function syncModulesForStudent(studentLike) {
  if (!studentLike || studentLike.role !== "STUDENT" || !studentLike.faculty || studentLike.year == null || studentLike.semester == null) {
    return;
  }

  const matchingModules = await Module.find(buildStudentAcademicQuery(studentLike)).select("_id");
  const moduleIds = matchingModules.map((moduleItem) => moduleItem._id);

  await StudentModule.deleteMany({ student: studentLike._id });
  if (moduleIds.length === 0) return;

  await StudentModule.insertMany(
    moduleIds.map((moduleId) => ({ student: studentLike._id, module: moduleId })),
    { ordered: false }
  ).catch((err) => {
    if (err?.code !== 11000) throw err;
  });
}

async function syncStudentsForModule(moduleLike) {
  if (!moduleLike || !moduleLike.faculty || moduleLike.year == null || moduleLike.semester == null) {
    return;
  }

  const students = await User.find({
    role: "STUDENT",
    faculty: moduleLike.faculty,
    year: Number(moduleLike.year),
    semester: Number(moduleLike.semester),
  }).select("_id");

  if (students.length === 0) return;

  await StudentModule.insertMany(
    students.map((student) => ({ student: student._id, module: moduleLike._id })),
    { ordered: false }
  ).catch((err) => {
    if (err?.code !== 11000) throw err;
  });
}

async function resyncModulesForAcademicGroup(moduleLike, previousAcademicGroup = null) {
  if (previousAcademicGroup) {
    const previousStudents = await User.find({
      role: "STUDENT",
      faculty: previousAcademicGroup.faculty,
      year: Number(previousAcademicGroup.year),
      semester: Number(previousAcademicGroup.semester),
    }).select("_id");

    if (previousStudents.length > 0) {
      await StudentModule.deleteMany({
        module: moduleLike._id,
        student: { $in: previousStudents.map((student) => student._id) },
      });
    }
  } else {
    await StudentModule.deleteMany({ module: moduleLike._id });
  }

  await syncStudentsForModule(moduleLike);
}

module.exports = {
  syncModulesForStudent,
  syncStudentsForModule,
  resyncModulesForAcademicGroup,
};
