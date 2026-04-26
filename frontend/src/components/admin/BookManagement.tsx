"use client";

import { useState, useEffect } from "react";
import { Book, BookFormData, BookCategory, BOOK_CATEGORY_LABELS, BOOK_CATEGORY_COLORS } from "@/types/book";
import { bookApi } from "@/lib/book-api";

export default function BookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState<BookFormData>({
    bookId: "",
    title: "",
    author: "",
    publishedYear: "",
    description: "",
    imageUrl: "",
    downloadUrl: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const booksData = await bookApi.getBooks();
      setBooks(booksData);
      setError(null);
    } catch (err) {
      setError("Failed to load books. Please try again.");
      console.error("Error loading books:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate Book ID
    const bookIdValidation = bookApi.validateBookId(formData.bookId);
    if (!bookIdValidation.isValid) {
      errors.bookId = bookIdValidation.error || "Invalid Book ID format";
    }

    // Validate Title
    if (!formData.title.trim()) {
      errors.title = "Title is required";
    } else if (formData.title.length < 3) {
      errors.title = "Title must be at least 3 characters";
    }

    // Validate Author
    if (!formData.author.trim()) {
      errors.author = "Author is required";
    }

    // Validate Published Year
    const year = parseInt(formData.publishedYear);
    if (!formData.publishedYear) {
      errors.publishedYear = "Published year is required";
    } else if (isNaN(year) || year < 1000 || year > new Date().getFullYear()) {
      errors.publishedYear = "Please enter a valid year";
    }

    // Validate Description
    if (!formData.description.trim()) {
      errors.description = "Description is required";
    } else if (formData.description.length < 10) {
      errors.description = "Description must be at least 10 characters";
    }

    // Validate Image URL
    if (!formData.imageUrl.trim()) {
      errors.imageUrl = "Image URL is required";
    } else {
      try {
        new URL(formData.imageUrl);
      } catch {
        errors.imageUrl = "Please enter a valid URL";
      }
    }

    // Validate Download URL (optional but if provided, must be valid)
    if (formData.downloadUrl.trim()) {
      try {
        new URL(formData.downloadUrl);
      } catch {
        errors.downloadUrl = "Please enter a valid URL";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (editingBook) {
        // Update existing book
        await bookApi.updateBook(editingBook._id!, formData);
      } else {
        // Create new book
        await bookApi.createBook(formData);
      }
      
      // Reset form and reload books
      resetForm();
      loadBooks();
      setShowForm(false);
    } catch (err) {
      setError(editingBook ? "Failed to update book." : "Failed to create book.");
      console.error("Error saving book:", err);
    }
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setFormData({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      publishedYear: book.publishedYear.toString(),
      description: book.description,
      imageUrl: book.imageUrl,
      downloadUrl: book.downloadUrl || ""
    });
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (bookId: string) => {
    if (!confirm("Are you sure you want to delete this book?")) {
      return;
    }

    try {
      await bookApi.deleteBook(bookId);
      loadBooks();
    } catch (err) {
      setError("Failed to delete book.");
      console.error("Error deleting book:", err);
    }
  };

  const resetForm = () => {
    setFormData({
      bookId: "",
      title: "",
      author: "",
      publishedYear: "",
      description: "",
      imageUrl: "",
      downloadUrl: ""
    });
    setEditingBook(null);
    setFormErrors({});
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const generateBookId = () => {
    const category = formData.bookId.substring(0, 2).toUpperCase() || 'TB';
    const nextId = bookApi.generateNextBookId(category, books);
    setFormData({ ...formData, bookId: nextId });
  };

  const getCategoryFromBookId = (bookId: string): BookCategory => {
    const prefix = bookId.substring(0, 2).toUpperCase();
    return Object.values(BookCategory).find(cat => cat === prefix) || BookCategory.OTHER;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Book Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" />
          </svg>
          Add New Book
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Book Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingBook ? "Edit Book" : "Add New Book"}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Book ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Book ID *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.bookId}
                        onChange={(e) => setFormData({ ...formData, bookId: e.target.value.toUpperCase() })}
                        placeholder="TB001"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={generateBookId}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        Generate
                      </button>
                    </div>
                    {formErrors.bookId && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.bookId}</p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Format: TB/IB/SB/EB/AB/OB + 3 digits (e.g., TB001)
                    </p>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter book title"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formErrors.title && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
                    )}
                  </div>

                  {/* Author */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Author *
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Enter author name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formErrors.author && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.author}</p>
                    )}
                  </div>

                  {/* Published Year */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Published Year *
                    </label>
                    <input
                      type="number"
                      value={formData.publishedYear}
                      onChange={(e) => setFormData({ ...formData, publishedYear: e.target.value })}
                      placeholder="2024"
                      min="1000"
                      max={new Date().getFullYear()}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {formErrors.publishedYear && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.publishedYear}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter book description"
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.description && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>
                  )}
                </div>

                {/* Image URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL *
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://example.com/book-cover.jpg"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.imageUrl && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.imageUrl}</p>
                  )}
                </div>

                {/* Download URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Download URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formData.downloadUrl}
                    onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                    placeholder="https://example.com/book.pdf"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {formErrors.downloadUrl && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.downloadUrl}</p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingBook ? "Update Book" : "Create Book"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Books List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Book ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Year
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {books.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="h-12 w-12 text-gray-300 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="text-lg font-medium">No books found</p>
                      <p className="text-sm mt-1">Add your first book to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <tr key={book._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {book.bookId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {book.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {book.author}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {book.publishedYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${BOOK_CATEGORY_COLORS[getCategoryFromBookId(book.bookId)]}`}>
                        {BOOK_CATEGORY_LABELS[getCategoryFromBookId(book.bookId)]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(book)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(book._id!)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
