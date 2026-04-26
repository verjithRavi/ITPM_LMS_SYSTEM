const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const meRoutes = require("./routes/me.routes");
const adminRoutes = require("./routes/admin.routes");
const eventsRoutes = require("./routes/events.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const assignmentsRoutes = require("./routes/assignments.routes");
const quizzesRoutes = require("./routes/quizzes.routes");
const modulesRoutes = require("./routes/modules.routes");
const feedbacksRoutes = require("./routes/feedbacks.routes");
const chatRoutes = require("./routes/chat.routes");
const testRoutes = require("./routes/test.routes");
const booksRoutes = require("./routes/books");
const coursesRoutes = require("./routes/courses");

// Career module routes
const careerCvRoutes = require("./career/routes/cvRoutes");
const careerSkillRoutes = require("./career/routes/skillRoutes");
const careerRoutes = require("./career/routes/careerRoutes");
const careerJobRoutes = require("./career/routes/jobRoutes");
const careerResumeRoutes = require("./career/routes/resumeRoutes");
const careerAdminRoutes = require("./career/routes/adminRoutes");

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/me", meRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/assignments", assignmentsRoutes);
app.use("/api/quizzes", quizzesRoutes);
app.use("/api/modules", modulesRoutes);
app.use("/api/feedbacks", feedbacksRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/test", testRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/courses", coursesRoutes);

// Career module endpoints (all under /api/career/)
app.use("/api/career/cv", careerCvRoutes);
app.use("/api/career/skills", careerSkillRoutes);
app.use("/api/career/careers", careerRoutes);
app.use("/api/career/jobs", careerJobRoutes);
app.use("/api/career/resume", careerResumeRoutes);
app.use("/api/career/admin", careerAdminRoutes);

module.exports = app;
