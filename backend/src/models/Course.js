const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  imageUrl: {
    type: String,
    trim: true,
    default: function() {
      // Generate a default image URL based on the title
      const seed = this.title ? this.title.replace(/\s+/g, '-').toLowerCase() : 'course';
      return `https://picsum.photos/seed/${seed}/400/200.jpg`;
    }
  },
  questions: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  questionsArray: [{
    id: String,
    questionText: String,
    answers: [{
      id: String,
      text: String,
      isCorrect: Boolean
    }],
    explanation: String
  }],
  created: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  instructor: {
    type: String,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  category: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better performance
courseSchema.index({ title: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ level: 1 });
courseSchema.index({ isActive: 1 });

module.exports = mongoose.model("Course", courseSchema);
