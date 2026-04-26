export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  questionText: string;
  answers: Answer[];
  explanation?: string;
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseFormData {
  title: string;
  description: string;
  imageUrl: string;
  questions: QuestionFormData[];
}

export interface QuestionFormData {
  id?: string;
  questionText: string;
  answers: AnswerFormData[];
  explanation?: string;
}

export interface AnswerFormData {
  id?: string;
  text: string;
  isCorrect: boolean;
}

export interface CourseProgress {
  id: string;
  courseId: string;
  userId: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  score: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizState {
  courseId: string;
  currentQuestionIndex: number;
  answers: Record<string, string>; // questionId -> answerId
  startTime: Date;
  endTime?: Date;
}

export interface CourseFilter {
  searchQuery?: string;
  category?: string;
}

// Course categories for filtering
export const COURSE_CATEGORIES = {
  PROGRAMMING: 'Programming',
  MATHEMATICS: 'Mathematics',
  SCIENCE: 'Science',
  LANGUAGE: 'Language',
  GENERAL: 'General'
} as const;

export type CourseCategory = typeof COURSE_CATEGORIES[keyof typeof COURSE_CATEGORIES];

// Category colors for UI
export const COURSE_CATEGORY_COLORS = {
  [COURSE_CATEGORIES.PROGRAMMING]: 'bg-blue-100 text-blue-800',
  [COURSE_CATEGORIES.MATHEMATICS]: 'bg-purple-100 text-purple-800',
  [COURSE_CATEGORIES.SCIENCE]: 'bg-green-100 text-green-800',
  [COURSE_CATEGORIES.LANGUAGE]: 'bg-yellow-100 text-yellow-800',
  [COURSE_CATEGORIES.GENERAL]: 'bg-gray-100 text-gray-800'
};
