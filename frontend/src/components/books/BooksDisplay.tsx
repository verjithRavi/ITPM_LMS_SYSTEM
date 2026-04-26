"use client";

import { useState, useEffect } from "react";
import { Book, BookCategory, BOOK_CATEGORY_LABELS, BOOK_CATEGORY_COLORS } from "@/types/book";
import { bookApi } from "@/lib/book-api";

export default function BooksDisplay() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BookCategory | "">("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBooks, setTotalBooks] = useState(0);

  const booksPerPage = 10; // For desktop, we'll show 5 per row, 2 rows initially

  useEffect(() => {
    loadBooks();
  }, [searchQuery, selectedCategory, currentPage]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const filter = {
        searchQuery,
        category: selectedCategory
      };
      const booksData = await bookApi.getBooks(filter);
      setBooks(booksData);
      setTotalBooks(booksData.length);
      setError(null);
    } catch (err) {
      setError("Failed to load books. Please try again.");
      console.error("Error loading books:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadBooks();
  };

  const handleCategoryChange = (category: BookCategory | "") => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const getCategoryFromBookId = (bookId: string): BookCategory => {
    const prefix = bookId.substring(0, 2).toUpperCase();
    return Object.values(BookCategory).find(cat => cat === prefix) || BookCategory.OTHER;
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleDownload = (downloadUrl: string, bookTitle: string) => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    } else {
      alert(`Download link not available for "${bookTitle}"`);
    }
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
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Books Library</h1>
        <p className="text-gray-600">Discover and download books from our collection</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books by title, author, or description..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryChange("")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === ""
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Books
          </button>
          {Object.values(BookCategory).map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {BOOK_CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">
          {totalBooks > 0 ? (
            <>
              Found <span className="font-semibold">{totalBooks}</span> book{totalBooks !== 1 ? "s" : ""}
              {selectedCategory && ` in ${BOOK_CATEGORY_LABELS[selectedCategory]}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </>
          ) : (
            "No books found"
          )}
        </p>
      </div>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div className="text-center py-12">
          <svg className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No books found</h3>
          <p className="text-gray-500">
            {searchQuery || selectedCategory
              ? "Try adjusting your search or filter criteria"
              : "No books are available at the moment"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {books.map((book) => (
            <div
              key={book._id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden flex flex-col h-full"
            >
              {/* Book Cover Image */}
              <div className="relative aspect-[3/4] bg-gray-100">
                <img
                  src={book.imageUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://via.placeholder.com/300x400/e5e7eb/6b7280?text=No+Cover";
                  }}
                />
                
                {/* Category Badge */}
                <div className="absolute top-2 right-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${BOOK_CATEGORY_COLORS[getCategoryFromBookId(book.bookId)]}`}>
                    {BOOK_CATEGORY_LABELS[getCategoryFromBookId(book.bookId)]}
                  </span>
                </div>
              </div>

              {/* Book Information */}
              <div className="p-4 flex-1 flex flex-col">
                {/* Title */}
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2" title={book.title}>
                  {book.title}
                </h3>

                {/* Author */}
                <p className="text-sm text-gray-600 mb-2">by {book.author}</p>

                {/* Year */}
                <p className="text-sm text-gray-500 mb-3">{book.publishedYear}</p>

                {/* Description */}
                <div className="flex-1 mb-4">
                  <p className="text-sm text-gray-600 line-clamp-3" title={book.description}>
                    {truncateText(book.description, 100)}
                  </p>
                </div>

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(book.downloadUrl || "", book.title)}
                  disabled={!book.downloadUrl}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    book.downloadUrl
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {book.downloadUrl ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </span>
                  ) : (
                    "Unavailable"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button (for future pagination) */}
      {books.length > 0 && books.length < totalBooks && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Load More Books
          </button>
        </div>
      )}
    </div>
  );
}
