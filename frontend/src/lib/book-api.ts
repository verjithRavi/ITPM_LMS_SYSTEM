import { Book, BookFormData, BookFilter, BookCategory } from '@/types/book';

const BOOKS_ENDPOINT = '/api/books';

export const bookApi = {
  // Get all books with optional filtering
  async getBooks(filter?: BookFilter): Promise<Book[]> {
    console.log('getBooks called with filter:', filter);
    
    // For development, always use mock data to ensure functionality
    console.log('Using mock data for development - backend not required');
    const mockData = this.getMockBooks(filter);
    console.log('Returning mock data:', mockData);
    return mockData;
  },

  // Get a single book by ID
  async getBookById(id: string): Promise<Book> {
    console.log('getBookById called with id:', id);
    console.log('Using mock data for development - backend not required');
    const mockBooks = this.getMockBooks();
    const book = mockBooks.find((b: Book) => b._id === id);
    if (!book) throw new Error('Book not found');
    console.log('Returning mock book:', book);
    return book;
  },

  // Create a new book
  async createBook(bookData: BookFormData): Promise<Book> {
    console.log('createBook called with data:', bookData);
    console.log('Simulating book creation - backend not required');
    const newBook: Book = {
      _id: Date.now().toString(),
      bookId: bookData.bookId,
      title: bookData.title,
      author: bookData.author,
      publishedYear: parseInt(bookData.publishedYear),
      description: bookData.description,
      imageUrl: bookData.imageUrl,
      downloadUrl: bookData.downloadUrl || undefined,
      category: this.getCategoryFromBookId(bookData.bookId),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    console.log('Returning created book:', newBook);
    return newBook;
  },

  // Update an existing book
  async updateBook(id: string, bookData: Partial<BookFormData>): Promise<Book> {
    console.log('updateBook called with id:', id, 'data:', bookData);
    console.log('Simulating book update - backend not required');
    const mockBooks = this.getMockBooks();
    const bookIndex = mockBooks.findIndex((b: Book) => b._id === id);
    if (bookIndex === -1) throw new Error('Book not found');
    
    const updatedBook = { 
      ...mockBooks[bookIndex], 
      ...bookData, 
      publishedYear: bookData.publishedYear ? parseInt(bookData.publishedYear) : mockBooks[bookIndex].publishedYear,
      updatedAt: new Date() 
    };
    console.log('Returning updated book:', updatedBook);
    return updatedBook;
  },

  // Delete a book
  async deleteBook(id: string): Promise<void> {
    console.log('deleteBook called with id:', id);
    console.log('Simulating book deletion - backend not required');
    return;
  },

  // Validate book ID format
  validateBookId(bookId: string): { isValid: boolean; category?: string; error?: string } {
    const validPrefixes = ['TB', 'IB', 'SB', 'EB', 'AB', 'OB'];
    const prefix = bookId.substring(0, 2).toUpperCase();
    const numbers = bookId.substring(2);

    if (!validPrefixes.includes(prefix)) {
      return {
        isValid: false,
        error: 'Book ID must start with TB, IB, SB, EB, AB, or OB'
      };
    }

    if (!/^\d{3}$/.test(numbers)) {
      return {
        isValid: false,
        error: 'Book ID must have exactly 3 digits after the prefix'
      };
    }

    return {
      isValid: true,
      category: prefix
    };
  },

  // Generate next book ID for a category
  generateNextBookId(category: string, existingBooks: Book[]): string {
    const categoryPrefix = category.toUpperCase();
    const categoryBooks = existingBooks.filter(book => book.bookId.startsWith(categoryPrefix));
    
    if (categoryBooks.length === 0) {
      return `${categoryPrefix}001`;
    }

    const existingNumbers = categoryBooks
      .map(book => parseInt(book.bookId.substring(2)))
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    const nextNumber = (existingNumbers[0] || 0) + 1;
    return `${categoryPrefix}${nextNumber.toString().padStart(3, '0')}`;
  },

  // Helper method to get category from book ID
  getCategoryFromBookId(bookId: string): BookCategory {
    const prefix = bookId.substring(0, 2).toUpperCase();
    return Object.values(BookCategory).find(cat => cat === prefix) || BookCategory.OTHER;
  },

  // Mock data for testing when backend is not available
  getMockBooks(filter?: BookFilter): Book[] {
    const mockBooks: Book[] = [
      {
        _id: '1',
        bookId: 'TB001',
        title: 'Tamil Literature Classics',
        author: 'S. Ramanathan',
        publishedYear: 2020,
        description: 'A comprehensive collection of classic Tamil literature including poetry, prose, and dramatic works from ancient to modern times.',
        imageUrl: 'https://via.placeholder.com/300x400/FF6B35/FFFFFF?text=Tamil+Book',
        downloadUrl: 'https://example.com/tamil-classics.pdf',
        category: BookCategory.TAMIL,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
      },
      {
        _id: '2',
        bookId: 'IB001',
        title: 'JavaScript Advanced Programming',
        author: 'John Smith',
        publishedYear: 2023,
        description: 'Master advanced JavaScript concepts including ES6+, async programming, design patterns, and modern frameworks.',
        imageUrl: 'https://via.placeholder.com/300x400/3B82F6/FFFFFF?text=IT+Book',
        downloadUrl: 'https://example.com/javascript-advanced.pdf',
        category: BookCategory.IT,
        createdAt: new Date('2024-02-20'),
        updatedAt: new Date('2024-02-20')
      },
      {
        _id: '3',
        bookId: 'SB001',
        title: 'Sinhala Cultural Heritage',
        author: 'K. Perera',
        publishedYear: 2021,
        description: 'Explore the rich cultural heritage of Sri Lanka through traditional Sinhala literature and historical texts.',
        imageUrl: 'https://via.placeholder.com/300x400/10B981/FFFFFF?text=Sinhala+Book',
        downloadUrl: 'https://example.com/sinhala-heritage.pdf',
        category: BookCategory.SINHALA,
        createdAt: new Date('2024-03-10'),
        updatedAt: new Date('2024-03-10')
      },
      {
        _id: '4',
        bookId: 'EB001',
        title: 'English Grammar and Composition',
        author: 'Mary Johnson',
        publishedYear: 2022,
        description: 'A complete guide to English grammar, writing skills, and composition for advanced learners and professionals.',
        imageUrl: 'https://via.placeholder.com/300x400/8B5CF6/FFFFFF?text=English+Book',
        downloadUrl: 'https://example.com/english-grammar.pdf',
        category: BookCategory.ENGLISH,
        createdAt: new Date('2024-01-25'),
        updatedAt: new Date('2024-01-25')
      },
      {
        _id: '5',
        bookId: 'AB001',
        title: 'Arabic Calligraphy Art',
        author: 'Ahmed Hassan',
        publishedYear: 2023,
        description: 'Learn the beautiful art of Arabic calligraphy with traditional and modern techniques.',
        imageUrl: 'https://via.placeholder.com/300x400/EF4444/FFFFFF?text=Arabic+Book',
        category: BookCategory.ARABIC,
        createdAt: new Date('2024-04-05'),
        updatedAt: new Date('2024-04-05')
      },
      {
        _id: '6',
        bookId: 'OB001',
        title: 'Philosophy of Science',
        author: 'Dr. Robert Brown',
        publishedYear: 2021,
        description: 'An exploration of philosophical questions in science, including methodology, epistemology, and ethics.',
        imageUrl: 'https://via.placeholder.com/300x400/6B7280/FFFFFF?text=Other+Book',
        downloadUrl: 'https://example.com/philosophy-science.pdf',
        category: BookCategory.OTHER,
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15')
      },
      {
        _id: '7',
        bookId: 'TB002',
        title: 'Modern Tamil Poetry',
        author: 'Lakshmi Narayanan',
        publishedYear: 2024,
        description: 'Contemporary Tamil poetry reflecting modern society, emotions, and cultural identity.',
        imageUrl: 'https://via.placeholder.com/300x400/FF6B35/FFFFFF?text=Tamil+Poetry',
        downloadUrl: 'https://example.com/modern-tamil-poetry.pdf',
        category: BookCategory.TAMIL,
        createdAt: new Date('2024-05-01'),
        updatedAt: new Date('2024-05-01')
      },
      {
        _id: '8',
        bookId: 'IB002',
        title: 'Machine Learning Fundamentals',
        author: 'Dr. Sarah Chen',
        publishedYear: 2023,
        description: 'Introduction to machine learning algorithms, neural networks, and practical applications.',
        imageUrl: 'https://via.placeholder.com/300x400/3B82F6/FFFFFF?text=ML+Book',
        downloadUrl: 'https://example.com/machine-learning.pdf',
        category: BookCategory.IT,
        createdAt: new Date('2024-06-10'),
        updatedAt: new Date('2024-06-10')
      }
    ];

    let filteredBooks = mockBooks;

    if (filter?.category) {
      filteredBooks = filteredBooks.filter(book => book.category === filter.category);
    }

    if (filter?.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filteredBooks = filteredBooks.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.description.toLowerCase().includes(query)
      );
    }

    return filteredBooks;
  }
};
