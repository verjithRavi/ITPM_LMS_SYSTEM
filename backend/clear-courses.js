require("dotenv").config();
const mongoose = require("mongoose");

// Define Course schema for clearing
const courseSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: Number,
  created: Date,
}, { collection: 'courses' });

const Course = mongoose.model("Course", courseSchema);

async function clearCourses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    
    const result = await Course.deleteMany({});
    console.log(`Deleted ${result.deletedCount} courses from database`);
    
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    console.log("Courses cleared successfully!");
  } catch (error) {
    console.error("Error clearing courses:", error);
  }
}

clearCourses();
