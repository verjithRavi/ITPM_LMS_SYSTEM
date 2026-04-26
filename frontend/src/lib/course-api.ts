import { Course, CourseFormData, CourseFilter, CourseProgress, QuizState, Question, Answer } from '@/types/course';

const COURSES_ENDPOINT = '/api/courses';
const PROGRESS_ENDPOINT = '/api/course-progress';

// Shared mock data storage to persist between admin and student views
let sharedMockCourses: Course[] = [
  {
    _id: '1',
    title: 'JavaScript Fundamentals',
    description: 'Master the basics of JavaScript programming including variables, functions, arrays, and objects. Perfect for beginners who want to start their web development journey.',
    imageUrl: 'https://picsum.photos/seed/javascript-fundamentals/400/200.jpg',
    questions: [
      {
        id: 'q1',
        questionText: 'What is the correct way to declare a variable in JavaScript?',
        answers: [
          { id: 'a1', text: 'var myVariable = 5;', isCorrect: false },
          { id: 'a2', text: 'let myVariable = 5;', isCorrect: true },
          { id: 'a3', text: 'variable myVariable = 5;', isCorrect: false },
          { id: 'a4', text: 'declare myVariable = 5;', isCorrect: false }
        ],
        explanation: 'let is the modern way to declare variables in JavaScript. var is the older way and const is for constants.'
      },
      {
        id: 'q2',
        questionText: 'Which method is used to add an element to the end of an array?',
        answers: [
          { id: 'a5', text: 'push()', isCorrect: true },
          { id: 'a6', text: 'pop()', isCorrect: false },
          { id: 'a7', text: 'shift()', isCorrect: false },
          { id: 'a8', text: 'unshift()', isCorrect: false }
        ],
        explanation: 'push() adds elements to the end of an array, while pop() removes from the end.'
      }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    _id: '2',
    title: 'React.js Complete Guide',
    description: 'Learn React.js from scratch including components, state management, hooks, and modern React patterns. Build real-world applications with confidence.',
    imageUrl: 'https://picsum.photos/seed/react-complete-guide/400/200.jpg',
    questions: [
      {
        id: 'q3',
        questionText: 'What hook is used to manage state in functional components?',
        answers: [
          { id: 'a9', text: 'useEffect', isCorrect: false },
          { id: 'a10', text: 'useState', isCorrect: true },
          { id: 'a11', text: 'useContext', isCorrect: false },
          { id: 'a12', text: 'useReducer', isCorrect: false }
        ],
        explanation: 'useState is the primary hook for managing state in functional React components.'
      },
      {
        id: 'q4',
        questionText: 'What is the purpose of the useEffect hook?',
        answers: [
          { id: 'a13', text: 'To manage state', isCorrect: false },
          { id: 'a14', text: 'To handle side effects', isCorrect: true },
          { id: 'a15', text: 'To create context', isCorrect: false },
          { id: 'a16', text: 'To optimize performance', isCorrect: false }
        ],
        explanation: 'useEffect is used to handle side effects like API calls, subscriptions, and DOM manipulations.'
      }
    ],
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-20')
  },
  {
    _id: '3',
    title: 'Mathematics Basics',
    description: 'Essential mathematical concepts including algebra, geometry, and basic calculus. Perfect for students and professionals who need to refresh their math skills.',
    imageUrl: 'https://picsum.photos/seed/mathematics-basics/400/200.jpg',
    questions: [
      {
        id: 'q5',
        questionText: 'What is the derivative of x²?',
        answers: [
          { id: 'a17', text: 'x', isCorrect: false },
          { id: 'a18', text: '2x', isCorrect: true },
          { id: 'a19', text: 'x²', isCorrect: false },
          { id: 'a20', text: '2', isCorrect: false }
        ],
        explanation: 'The derivative of x² is 2x using the power rule of differentiation.'
      },
      {
        id: 'q6',
        questionText: 'What is the value of π (pi) approximately?',
        answers: [
          { id: 'a21', text: '3.14', isCorrect: true },
          { id: 'a22', text: '2.71', isCorrect: false },
          { id: 'a23', text: '1.61', isCorrect: false },
          { id: 'a24', text: '4.66', isCorrect: false }
        ],
        explanation: 'π (pi) is approximately 3.14159, commonly rounded to 3.14.'
      }
    ],
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10')
  }
];

export const courseApi = {
  // Get all courses with optional filtering
  async getCourses(filter?: CourseFilter): Promise<Course[]> {
    console.log('getCourses called with filter:', filter);
    
    try {
      // Try to use real backend first
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      const queryParams = new URLSearchParams();
      
      if (filter?.searchQuery) {
        queryParams.append('searchQuery', filter.searchQuery);
      }
      if (filter?.category) {
        queryParams.append('category', filter.category);
      }
      
      const response = await fetch(`http://localhost:5001/api/courses?${queryParams}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Using real backend data:', data);
        
        // Transform backend data to frontend format
        const courses = data.courses || data;
        const transformedCourses = Array.isArray(courses) ? courses.map((course: any) => ({
          ...course,
          questions: course.questionsArray || [] // Use questionsArray from backend
        })) : courses;
        
        return transformedCourses;
      }
    } catch (error) {
      console.log('Backend not available, falling back to mock data');
    }
    
    // Fallback to mock data if backend fails
    console.log('Using mock data for development - backend not required');
    const mockData = courseApi.getMockCourses(filter);
    console.log('Returning mock data:', mockData);
    return mockData;
  },

  // Get a single course by ID
  async getCourseById(id: string): Promise<Course> {
    console.log('getCourseById called with id:', id);
    
    try {
      // Try to use real backend first
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      
      const response = await fetch(`http://localhost:5001/api/courses/${id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Using real backend data:', data);
        
        // Transform backend data to frontend format
        return {
          ...data,
          questions: data.questionsArray || [] // Use questionsArray from backend
        };
      }
    } catch (error) {
      console.log('Backend not available, falling back to mock data');
    }
    
    // Fallback to mock data if backend fails
    console.log('Using mock data for development - backend not required');
    const mockCourses = courseApi.getMockCourses();
    const course = mockCourses.find((c: Course) => c._id === id);
    if (!course) throw new Error('Course not found');
    console.log('Returning mock course:', course);
    return course;
  },

  // Create a new course
  async createCourse(courseData: CourseFormData): Promise<Course> {
    console.log('createCourse called with data:', courseData);
    
    try {
      // Try to use real backend first
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      
      const response = await fetch(`http://localhost:5001/api/courses`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: courseData.title,
          description: courseData.description,
          imageUrl: courseData.imageUrl,
          questions: courseData.questions?.length || 0,
          questionsArray: courseData.questions || [],
          instructor: 'Admin',
          duration: 'Self-paced',
          level: 'beginner',
          category: 'Programming'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Course created via backend:', data);
        // Transform backend response to frontend format
        return {
          _id: data._id,
          title: data.title,
          description: data.description,
          imageUrl: courseData.imageUrl || 'https://picsum.photos/seed/course/400/200.jpg',
          questions: courseData.questions?.map((q: any) => ({
            ...q,
            id: q.id || Date.now().toString(),
            answers: q.answers?.map((a: any) => ({
              ...a,
              id: a.id || Date.now().toString()
            }))
          })) || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      }
    } catch (error) {
      console.log('Backend not available, using mock creation');
    }
    
    // Fallback to mock data if backend fails
    console.log('Adding course to shared storage');
    const newCourse: Course = {
      _id: Date.now().toString(),
      title: courseData.title,
      description: courseData.description,
      imageUrl: courseData.imageUrl || 'https://picsum.photos/seed/course/400/200.jpg',
      questions: courseData.questions?.map((q: any) => ({
        ...q,
        id: q.id || Date.now().toString() + Math.random().toString(),
        answers: q.answers?.map((a: any) => ({
          ...a,
          id: a.id || Date.now().toString() + Math.random().toString()
        }))
      })) || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to shared mock data storage
    sharedMockCourses.push(newCourse);
    console.log('Course added to shared storage. Total courses:', sharedMockCourses.length);
    console.log('Returning created course:', newCourse);
    return newCourse;
  },

  // Update an existing course
  async updateCourse(id: string, courseData: Partial<CourseFormData>): Promise<Course> {
    console.log('updateCourse called with id:', id, 'data:', courseData);
    
    try {
      // Try to use real backend first
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      
      const response = await fetch(`http://localhost:5001/api/courses/${id}`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: courseData.title,
          description: courseData.description,
          imageUrl: courseData.imageUrl,
          questions: courseData.questions?.length || 0,
          questionsArray: courseData.questions || [],
          instructor: 'Admin',
          duration: 'Self-paced',
          level: 'beginner',
          category: 'Programming'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Course updated via backend:', data);
        // Transform backend response to frontend format
        return {
          _id: data._id,
          title: data.title,
          description: data.description,
          imageUrl: courseData.imageUrl || 'https://picsum.photos/seed/course/400/200.jpg',
          questions: courseData.questions?.map((q: any) => ({
            ...q,
            id: q.id || Date.now().toString(),
            answers: q.answers?.map((a: any) => ({
              ...a,
              id: a.id || Date.now().toString()
            }))
          })) || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };
      }
    } catch (error) {
      console.log('Backend not available, using mock update');
    }
    
    // Fallback to mock data if backend fails
    console.log('Updating course in shared storage');
    const courseIndex = sharedMockCourses.findIndex((c: Course) => c._id === id);
    if (courseIndex === -1) throw new Error('Course not found');
    
    const updatedCourse: Course = { 
      ...sharedMockCourses[courseIndex], 
      ...courseData,
      questions: courseData.questions?.map((q: any) => ({
        ...q,
        id: q.id || Date.now().toString() + Math.random().toString(),
        answers: q.answers?.map((a: any) => ({
          ...a,
          id: a.id || Date.now().toString() + Math.random().toString()
        }))
      })) || sharedMockCourses[courseIndex].questions,
      updatedAt: new Date() 
    };
    
    // Update in shared mock data storage
    sharedMockCourses[courseIndex] = updatedCourse;
    console.log('Course updated in shared storage. Total courses:', sharedMockCourses.length);
    console.log('Returning updated course:', updatedCourse);
    return updatedCourse;
  },

  // Delete a course
  async deleteCourse(id: string): Promise<void> {
    console.log('deleteCourse called with id:', id);
    
    try {
      // Try to use real backend first
      const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
      
      const response = await fetch(`http://localhost:5001/api/courses/${id}`, {
        method: 'DELETE',
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      
      if (response.ok) {
        console.log('Course deleted via backend');
        return;
      }
    } catch (error) {
      console.log('Backend not available, using mock deletion');
    }
    
    // Fallback to mock data if backend fails
    console.log('Removing course from shared storage');
    const courseIndex = sharedMockCourses.findIndex((c: Course) => c._id === id);
    if (courseIndex !== -1) {
      sharedMockCourses.splice(courseIndex, 1);
      console.log('Course removed from shared storage. Total courses:', sharedMockCourses.length);
    } else {
      console.log('Course not found in shared storage');
    }
  },

  // Get course progress for a user
  async getCourseProgress(courseId: string, userId: string): Promise<CourseProgress | null> {
    console.log('getCourseProgress called with courseId:', courseId, 'userId:', userId);
    console.log('Using mock data for development - backend not required');
    const mockProgress = courseApi.getMockProgress(courseId, userId);
    console.log('Returning mock progress:', mockProgress);
    return mockProgress;
  },

  // Save course progress
  async saveCourseProgress(progress: Omit<CourseProgress, 'id' | 'createdAt' | 'updatedAt'>): Promise<CourseProgress> {
    console.log('saveCourseProgress called with progress:', progress);
    console.log('Simulating progress save - backend not required');
    const savedProgress: CourseProgress = {
      ...progress,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log('Returning saved progress:', savedProgress);
    return savedProgress;
  },

  // Validate course data
  validateCourseData(courseData: CourseFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!courseData.title.trim()) {
      errors.push('Course title is required');
    }

    if (!courseData.description.trim()) {
      errors.push('Course description is required');
    }

    if (!courseData.imageUrl.trim()) {
      errors.push('Course image URL is required');
    } else {
      try {
        new URL(courseData.imageUrl);
      } catch {
        errors.push('Please enter a valid image URL');
      }
    }

    if (!courseData.questions || courseData.questions.length === 0) {
      errors.push('At least one question is required');
    } else {
      courseData.questions.forEach((question, qIndex) => {
        if (!question.questionText.trim()) {
          errors.push(`Question ${qIndex + 1} text is required`);
        }

        if (!question.answers || question.answers.length !== 4) {
          errors.push(`Question ${qIndex + 1} must have exactly 4 answers`);
        } else {
          const correctAnswers = question.answers.filter((a: any) => a.isCorrect);
          if (correctAnswers.length !== 1) {
            errors.push(`Question ${qIndex + 1} must have exactly 1 correct answer`);
          }

          question.answers.forEach((answer, aIndex) => {
            if (!answer.text.trim()) {
              errors.push(`Question ${qIndex + 1}, Answer ${aIndex + 1} text is required`);
            }
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Mock data for testing - now uses shared storage
  getMockCourses(filter?: CourseFilter): Course[] {
    console.log('getMockCourses called. Total courses in shared storage:', sharedMockCourses.length);
    
    let filteredCourses = [...sharedMockCourses];

    if (filter?.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filteredCourses = filteredCourses.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query)
      );
    }

    return filteredCourses;
  },

  // Mock progress data
  getMockProgress(courseId: string, userId: string): CourseProgress | null {
    // Simulate some progress for demonstration
    if (courseId === '1' && userId === 'demo-user') {
      return {
        id: 'progress-1',
        courseId: '1',
        userId: 'demo-user',
        totalQuestions: 2,
        answeredQuestions: 2,
        correctAnswers: 1,
        score: 50,
        completedAt: new Date('2024-01-20'),
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-01-20')
      };
    }
    return null;
  }
};
