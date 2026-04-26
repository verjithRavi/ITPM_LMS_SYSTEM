"use client";

import { useState, useEffect } from "react";
import { Course, CourseProgress, QuizState } from "@/types/course";
import { courseApi } from "@/lib/course-api";

export default function CoursesDisplay() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await courseApi.getCourses({ searchQuery });
      setCourses(coursesData);
      setError(null);
    } catch (err) {
      setError("Failed to load courses. Please try again.");
      console.error("Error loading courses:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCourses();
  };

  const startQuiz = async (course: Course) => {
    try {
      setSelectedCourse(course);
      setQuizState({
        courseId: course._id,
        currentQuestionIndex: 0,
        answers: {},
        startTime: new Date()
      });
      setShowResults(false);
      
      // Load existing progress
      const userId = "demo-user"; // In real app, get from auth
      const existingProgress = await courseApi.getCourseProgress(course._id, userId);
      setProgress(existingProgress);
    } catch (err) {
      console.error("Error starting quiz:", err);
      alert("Failed to start quiz. Please try again.");
    }
  };

  const handleAnswer = (questionId: string, answerId: string) => {
    if (!quizState) return;
    
    const newAnswers = {
      ...quizState.answers,
      [questionId]: answerId
    };
    
    setQuizState({
      ...quizState,
      answers: newAnswers
    });
  };

  const nextQuestion = () => {
    console.log('nextQuestion called');
    console.log('quizState:', quizState);
    console.log('selectedCourse:', selectedCourse);
    
    if (!quizState || !selectedCourse) {
      console.log('Missing quizState or selectedCourse, returning');
      return;
    }
    
    const questionLength = selectedCourse.questions?.length || 0;
    console.log('Current question index:', quizState.currentQuestionIndex);
    console.log('Total questions:', questionLength);
    
    if (quizState.currentQuestionIndex < questionLength - 1) {
      console.log('Moving to next question');
      setQuizState({
        ...quizState,
        currentQuestionIndex: quizState.currentQuestionIndex + 1
      });
    } else {
      console.log('Last question reached, submitting quiz');
      submitQuiz();
    }
  };

  const previousQuestion = () => {
    if (!quizState) return;
    
    if (quizState.currentQuestionIndex > 0) {
      setQuizState({
        ...quizState,
        currentQuestionIndex: quizState.currentQuestionIndex - 1
      });
    }
  };

  const submitQuiz = async () => {
    if (!quizState || !selectedCourse) return;
    
    try {
      const endTime = new Date();
      let correctAnswersCount = 0;
      
      // Ensure questions have proper IDs and answers for submission
      const questionsWithIds = selectedCourse.questions?.map((q, index) => {
        const questionWithId = {
          ...q,
          id: q.id || `question-${index}`
        };
        
        // Ensure question has answers and normalize answer IDs
        if (questionWithId.answers && questionWithId.answers.length > 0) {
          // Normalize answer IDs to use 'id' field, fallback to '_id'
          questionWithId.answers = questionWithId.answers.map((answer, answerIndex) => ({
            ...answer,
            id: answer.id || (answer as any)._id || `answer-${index}-${answerIndex}`
          }));
        } else {
          // Fallback answers if none exist
          questionWithId.answers = [
            {
              id: `answer-${index}-0`,
              text: "Option A",
              isCorrect: true
            },
            {
              id: `answer-${index}-1`, 
              text: "Option B",
              isCorrect: false
            },
            {
              id: `answer-${index}-2`,
              text: "Option C", 
              isCorrect: false
            },
            {
              id: `answer-${index}-3`,
              text: "Option D",
              isCorrect: false
            }
          ];
        }
        
        return questionWithId;
      }) || [];
      
      // Check if questions exist and have valid data
      if (!questionsWithIds || questionsWithIds.length === 0) {
        setQuizState({ ...quizState, endTime });
        setShowResults(true);
        return;
      }
      
      questionsWithIds.forEach(question => {
        const userAnswerId = quizState.answers[question.id];
        const correctAnswer = question.answers.find(a => a.isCorrect);
        if (userAnswerId === correctAnswer?.id) {
          correctAnswersCount++;
        }
      });
      
      const calculatedScore = Math.round((correctAnswersCount / questionsWithIds.length) * 100);
      
      // Save progress
      const userId = "demo-user"; // In real app, get from auth
      const progressData = {
        courseId: selectedCourse._id,
        userId,
        totalQuestions: selectedCourse.questions.length,
        answeredQuestions: selectedCourse.questions.length,
        correctAnswers: correctAnswersCount,
        score: calculatedScore,
        completedAt: endTime
      };
      
      const savedProgress = await courseApi.saveCourseProgress(progressData);
      setProgress(savedProgress);
      setQuizState({ ...quizState, endTime });
      setShowResults(true);
      
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert("Failed to submit quiz. Please try again.");
    }
  };

  const resetQuiz = () => {
    setSelectedCourse(null);
    setQuizState(null);
    setProgress(null);
    setShowResults(false);
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

  if (selectedCourse && quizState) {
    // Ensure questions have proper IDs and answers
    const questionsWithIds = selectedCourse.questions?.map((q, index) => {
      const questionWithId = {
        ...q,
        id: q.id || `question-${index}`
      };
      
      // Ensure question has answers and normalize answer IDs
      if (questionWithId.answers && questionWithId.answers.length > 0) {
        // Normalize answer IDs to use 'id' field, fallback to '_id'
        questionWithId.answers = questionWithId.answers.map((answer, answerIndex) => ({
          ...answer,
          id: answer.id || (answer as any)._id || `answer-${index}-${answerIndex}`
        }));
      } else {
        // Fallback answers if none exist
        questionWithId.answers = [
          {
            id: `answer-${index}-0`,
            text: "Option A",
            isCorrect: true
          },
          {
            id: `answer-${index}-1`, 
            text: "Option B",
            isCorrect: false
          },
          {
            id: `answer-${index}-2`,
            text: "Option C", 
            isCorrect: false
          },
          {
            id: `answer-${index}-3`,
            text: "Option D",
            isCorrect: false
          }
        ];
      }
      
      return questionWithId;
    }) || [];
    
    const currentQuestion = questionsWithIds[quizState.currentQuestionIndex];
    const quizProgress = questionsWithIds.length > 0 
      ? ((quizState.currentQuestionIndex + 1) / questionsWithIds.length) * 100 
      : 0;
    
    // If currentQuestion is undefined, show a message
    if (!currentQuestion) {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Quiz</h2>
            <div className="text-center py-8">
              <p className="text-gray-600">No questions available for this course.</p>
              <button
                onClick={() => setSelectedCourse(null)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    if (showResults) {
      // Normalize questions for results display (same logic as quiz)
      const questionsWithIds = selectedCourse.questions?.map((q, index) => {
        const questionWithId = {
          ...q,
          id: q.id || `question-${index}`
        };
        
        // Ensure question has answers and normalize answer IDs
        if (questionWithId.answers && questionWithId.answers.length > 0) {
          // Normalize answer IDs to use 'id' field, fallback to '_id'
          questionWithId.answers = questionWithId.answers.map((answer, answerIndex) => ({
            ...answer,
            id: answer.id || (answer as any)._id || `answer-${index}-${answerIndex}`
          }));
        } else {
          // Fallback answers if none exist
          questionWithId.answers = [
            {
              id: `answer-${index}-0`,
              text: "Option A",
              isCorrect: true
            },
            {
              id: `answer-${index}-1`, 
              text: "Option B",
              isCorrect: false
            },
            {
              id: `answer-${index}-2`,
              text: "Option C", 
              isCorrect: false
            },
            {
              id: `answer-${index}-3`,
              text: "Option D",
              isCorrect: false
            }
          ];
        }
        
        return questionWithId;
      }) || [];
      
      return (
        <div className="max-w-2xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quiz Results</h2>
            
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-blue-600 mb-2">
                {progress?.score || 0}%
              </div>
              <div className="text-gray-600">
                You got {progress?.correctAnswers || 0} out of {questionsWithIds.length || 0} questions correct
              </div>
            </div>
            
                        
            <div className="space-y-4 mb-6">
              {questionsWithIds.map((question, index) => {
                const userAnswerId = quizState.answers[question.id];
                const correctAnswer = question.answers.find(a => a.isCorrect);
                const userAnswer = question.answers.find(a => a.id === userAnswerId);
                const isCorrect = userAnswerId === correctAnswer?.id;
                
                return (
                  <div key={question.id || `question-${index}`} className={`p-4 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-start space-x-3">
                      <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                        {isCorrect ? '✓' : '✗'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-2">
                          {index + 1}. {question.questionText}
                        </p>
                        <div className="space-y-1 text-sm">
                          <p className="text-gray-600">Your answer: <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{userAnswer?.text || 'Not answered'}</span></p>
                          {!isCorrect && (
                            <p className="text-gray-600">Correct answer: <span className="text-green-600">{correctAnswer?.text}</span></p>
                          )}
                          {question.explanation && (
                            <p className="text-gray-500 italic">{question.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={resetQuiz}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Courses
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-gray-900">{selectedCourse.title}</h2>
              <button
                onClick={resetQuiz}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${quizProgress}%` }}
              ></div>
            </div>
            
            <div className="text-sm text-gray-600">
              Question {quizState.currentQuestionIndex + 1} of {questionsWithIds.length}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentQuestion.questionText}
            </h3>
            
            <div className="space-y-3">
              {currentQuestion.answers.map((answer, index) => (
                <label
                  key={answer.id || `answer-${index}`}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    quizState.answers[currentQuestion.id] === answer.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    checked={quizState.answers[currentQuestion.id] === answer.id}
                    onChange={() => handleAnswer(currentQuestion.id, answer.id)}
                    className="mr-3 h-4 w-4 text-blue-600"
                  />
                  <span className="text-gray-900">{answer.text}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-between">
            <button
              onClick={previousQuestion}
              disabled={quizState.currentQuestionIndex === 0}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <button
              onClick={nextQuestion}
              disabled={!quizState.answers[currentQuestion.id]}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {quizState.currentQuestionIndex === questionsWithIds.length - 1 ? 'Submit' : 'Next'}
            </button>
            
                      </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
      </div>

      <form onSubmit={handleSearch} className="flex space-x-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search courses..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => (
          <div key={course._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
            <img
              src={course.imageUrl}
              alt={course.title}
              className="w-full h-48 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://picsum.photos/seed/course-fallback/400/200.jpg";
              }}
            />
            
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {course.questions.length} questions
                </span>
                {progress && progress.courseId === course._id && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-600">
                      {progress.score}%
                    </span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${progress.score}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                onClick={() => startQuiz(course)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {progress && progress.courseId === course._id ? 'Retake Quiz' : 'Start Quiz'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {courses.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}
