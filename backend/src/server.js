require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const startReminderJob = require("./jobs/reminder.job");

const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  startReminderJob();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
})();