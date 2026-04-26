const Course = require("../models/Course");

// Get all courses with optional filtering
const getCourses = async (req, res) => {
  try {
    const { category, level, isActive, page = 1, limit = 10, search } = req.query;
    
    // Build filter
    let filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (level) {
      filter.level = level;
    }
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { instructor: { $regex: search, $options: "i" } }
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const courses = await Course.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Course.countDocuments(filter);
    
    res.status(200).json({
      courses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
};

// Get a single course by ID
const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await Course.findById(id);
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    res.status(200).json(course);
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ message: "Failed to fetch course" });
  }
};

// Create a new course
const createCourse = async (req, res) => {
  try {
    const { title, description, imageUrl, questions, questionsArray, instructor, duration, level, category } = req.body;
    
    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }
    
    // Check if course with same title already exists
    const existingCourse = await Course.findOne({ title });
    if (existingCourse) {
      return res.status(400).json({ message: "Course with this title already exists" });
    }
    
    const course = new Course({
      title,
      description,
      imageUrl: imageUrl || `https://picsum.photos/seed/${title.replace(/\s+/g, '-').toLowerCase()}/400/200.jpg`,
      questions: questions || 0,
      questionsArray: questionsArray || [],
      instructor,
      duration,
      level: level || 'beginner',
      category
    });
    
    const savedCourse = await course.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ message: "Failed to create course" });
  }
};

// Update an existing course
const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Handle imageUrl if not provided
    if (updates.title && !updates.imageUrl) {
      updates.imageUrl = `https://picsum.photos/seed/${updates.title.replace(/\s+/g, '-').toLowerCase()}/400/200.jpg`;
    }
    
    // Find course
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    // If updating title, check for duplicates
    if (updates.title && updates.title !== course.title) {
      const existingCourse = await Course.findOne({ title: updates.title });
      if (existingCourse) {
        return res.status(400).json({ message: "Course with this title already exists" });
      }
    }
    
    // Update questions if provided
    if (updates.questions !== undefined) {
      updates.questions = parseInt(updates.questions);
    }
    
    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    res.status(500).json({ message: "Failed to update course" });
  }
};

// Delete a course
const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }
    
    await Course.findByIdAndDelete(id);
    
    res.status(200).json({ message: "Course deleted successfully" });
  } catch (error) {
    console.error("Error deleting course:", error);
    res.status(500).json({ message: "Failed to delete course" });
  }
};

// Get course statistics
const getCourseStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    const coursesByLevel = await Course.aggregate([
      { $group: { _id: "$level", count: { $sum: 1 } } }
    ]);
    const coursesByCategory = await Course.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    
    res.status(200).json({
      totalCourses,
      activeCourses,
      coursesByLevel,
      coursesByCategory
    });
  } catch (error) {
    console.error("Error fetching course stats:", error);
    res.status(500).json({ message: "Failed to fetch course statistics" });
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseStats
};
