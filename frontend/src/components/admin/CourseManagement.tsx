"use client";

import { useState, useEffect } from "react";
import { Course, CourseFormData, QuestionFormData, AnswerFormData } from "@/types/course";
import { courseApi } from "@/lib/course-api";

export default function CourseManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CourseFormData>({
    title: "",
    description: "",
    imageUrl: "",
    questions: []
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await courseApi.getCourses();
      setCourses(coursesData);
      setError(null);
    } catch (err) {
      setError("Failed to load courses. Please try again.");
      console.error("Error loading courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = () => {
    setEditingCourse(null);
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      questions: []
    });
    setFormErrors([]);
    setShowModal(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      imageUrl: course.imageUrl,
      questions: course.questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        answers: q.answers.map(a => ({
          id: a.id,
          text: a.text,
          isCorrect: a.isCorrect
        })),
        explanation: q.explanation
      }))
    });
    setFormErrors([]);
    setShowModal(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    
    try {
      await courseApi.deleteCourse(courseId);
      setCourses(courses.filter(c => c._id !== courseId));
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("Failed to delete course. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = courseApi.validateCourseData(formData);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    try {
      if (editingCourse) {
        const updatedCourse = await courseApi.updateCourse(editingCourse._id, formData);
        setCourses(courses.map(c => c._id === updatedCourse._id ? updatedCourse : c));
      } else {
        const newCourse = await courseApi.createCourse(formData);
        setCourses([...courses, newCourse]);
      }
      setShowModal(false);
      setFormData({
        title: "",
        description: "",
        imageUrl: "",
        questions: []
      });
      setFormErrors([]);
    } catch (err) {
      console.error("Error saving course:", err);
      alert("Failed to save course. Please try again.");
    }
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          questionText: "",
          answers: [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false }
          ]
        }
      ]
    });
  };

  const updateQuestion = (index: number, question: QuestionFormData) => {
    const updatedQuestions = [...formData.questions];
    updatedQuestions[index] = question;
    setFormData({ ...formData, questions: updatedQuestions });
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    });
  };

  const updateAnswer = (questionIndex: number, answerIndex: number, answer: AnswerFormData) => {
    const updatedQuestions = [...formData.questions];
    const answers = [...updatedQuestions[questionIndex].answers];
    answers[answerIndex] = answer;
    
    // Ensure only one correct answer
    if (answer.isCorrect) {
      updatedQuestions[questionIndex].answers = answers.map((a, i) => 
        i === answerIndex ? a : { ...a, isCorrect: false }
      );
    } else {
      updatedQuestions[questionIndex].answers = answers;
    }
    
    setFormData({ ...formData, questions: updatedQuestions });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
        <button
          onClick={loadCourses}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Course Management</h1>
        <button
          onClick={handleAddCourse}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Course
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        className="h-10 w-10 rounded object-cover mr-3"
                        src={course.imageUrl}
                        alt={course.title}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://picsum.photos/seed/course-thumbnail/40/40.jpg";
                        }}
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{course.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">{course.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{course.questions.length} questions</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEditCourse(course)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingCourse ? "Edit Course" : "Add New Course"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formErrors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-800 text-sm">
                  {formErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Course Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-medium text-gray-700">Questions</label>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Add Question
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.questions.map((question, qIndex) => (
                    <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-sm font-medium text-gray-900">Question {qIndex + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeQuestion(qIndex)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">Question Text</label>
                          <textarea
                            value={question.questionText}
                            onChange={(e) => updateQuestion(qIndex, { ...question, questionText: e.target.value })}
                            rows={2}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">Answers (select one correct answer)</label>
                          <div className="space-y-2">
                            {question.answers.map((answer, aIndex) => (
                              <div key={aIndex} className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  name={`correct-${qIndex}`}
                                  checked={answer.isCorrect}
                                  onChange={() => updateAnswer(qIndex, aIndex, { ...answer, isCorrect: true })}
                                  className="h-4 w-4 text-blue-600"
                                />
                                <input
                                  type="text"
                                  value={answer.text}
                                  onChange={(e) => updateAnswer(qIndex, aIndex, { ...answer, text: e.target.value, isCorrect: answer.isCorrect })}
                                  placeholder={`Answer ${aIndex + 1}`}
                                  className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  required
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingCourse ? "Update Course" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
