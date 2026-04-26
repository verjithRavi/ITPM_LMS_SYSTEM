const Book = require("../models/Book");

// Get all books with optional filtering
const getBooks = async (req, res) => {
  try {
    const { category, searchQuery, page = 1, limit = 10 } = req.query;
    
    // Build filter
    let filter = {};
    
    if (category) {
      filter.category = category;
    }
    
    if (searchQuery) {
      filter.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { author: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } }
      ];
    }
    
    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const books = await Book.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Book.countDocuments(filter);
    
    res.status(200).json({
      books,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({ message: "Failed to fetch books" });
  }
};

// Get a single book by ID
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const book = await Book.findById(id);
    
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    
    res.status(200).json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ message: "Failed to fetch book" });
  }
};

// Create a new book
const createBook = async (req, res) => {
  try {
    const { bookId, title, author, publishedYear, description, imageUrl, downloadUrl } = req.body;
    
    // Validate required fields
    if (!bookId || !title || !author || !publishedYear || !description || !imageUrl) {
      return res.status(400).json({ message: "All required fields must be provided" });
    }
    
    // Validate book ID format
    const validPrefixes = ['TB', 'IB', 'SB', 'EB', 'AB', 'OB'];
    const prefix = bookId.substring(0, 2).toUpperCase();
    const numbers = bookId.substring(2);
    
    if (!validPrefixes.includes(prefix)) {
      return res.status(400).json({ message: "Book ID must start with TB, IB, SB, EB, AB, or OB" });
    }
    
    if (!/^\d{3}$/.test(numbers)) {
      return res.status(400).json({ message: "Book ID must have exactly 3 digits after the prefix" });
    }
    
    // Check if book ID already exists
    const existingBook = await Book.findOne({ bookId });
    if (existingBook) {
      return res.status(400).json({ message: "Book ID already exists" });
    }
    
    const book = new Book({
      bookId,
      title,
      author,
      publishedYear,
      description,
      imageUrl,
      downloadUrl,
      category: prefix
    });
    
    const savedBook = await book.save();
    res.status(201).json(savedBook);
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({ message: "Failed to create book" });
  }
};

// Update an existing book
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Find book
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    
    // If updating bookId, validate format and uniqueness
    if (updates.bookId && updates.bookId !== book.bookId) {
      const validPrefixes = ['TB', 'IB', 'SB', 'EB', 'AB', 'OB'];
      const prefix = updates.bookId.substring(0, 2).toUpperCase();
      const numbers = updates.bookId.substring(2);
      
      if (!validPrefixes.includes(prefix)) {
        return res.status(400).json({ message: "Book ID must start with TB, IB, SB, EB, AB, or OB" });
      }
      
      if (!/^\d{3}$/.test(numbers)) {
        return res.status(400).json({ message: "Book ID must have exactly 3 digits after the prefix" });
      }
      
      const existingBook = await Book.findOne({ bookId: updates.bookId });
      if (existingBook) {
        return res.status(400).json({ message: "Book ID already exists" });
      }
      
      updates.category = prefix;
    }
    
    // Update publishedYear if provided
    if (updates.publishedYear) {
      updates.publishedYear = parseInt(updates.publishedYear);
    }
    
    const updatedBook = await Book.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    res.status(200).json(updatedBook);
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ message: "Failed to update book" });
  }
};

// Delete a book
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;
    
    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    
    await Book.findByIdAndDelete(id);
    
    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ message: "Failed to delete book" });
  }
};

// Generate next book ID for a given category
const generateNextBookId = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Validate category
    const validPrefixes = ['TB', 'IB', 'SB', 'EB', 'AB', 'OB'];
    if (!validPrefixes.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    
    // Find the highest existing ID for this category
    const lastBook = await Book.findOne({ bookId: { $regex: `^${category}` } })
      .sort({ bookId: -1 })
      .select('bookId');
    
    let nextId = 1;
    if (lastBook) {
      const idNumber = parseInt(lastBook.bookId.substring(2));
      nextId = idNumber + 1;
    }
    
    const nextBookId = `${category}${nextId.toString().padStart(3, '0')}`;
    
    res.status(200).json({ nextBookId });
  } catch (error) {
    console.error("Error generating book ID:", error);
    res.status(500).json({ message: "Failed to generate book ID" });
  }
};

module.exports = {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  generateNextBookId
};
