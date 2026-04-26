export interface Book {
  _id?: string;
  bookId: string;
  title: string;
  author: string;
  publishedYear: number;
  description: string;
  imageUrl: string;
  downloadUrl?: string;
  category: BookCategory;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum BookCategory {
  TAMIL = 'TB',
  IT = 'IB',
  SINHALA = 'SB',
  ENGLISH = 'EB',
  ARABIC = 'AB',
  OTHER = 'OB'
}

export interface BookFormData {
  bookId: string;
  title: string;
  author: string;
  publishedYear: string;
  description: string;
  imageUrl: string;
  downloadUrl: string;
}

export interface BookFilter {
  category?: BookCategory | '';
  searchQuery: string;
}

export const BOOK_CATEGORY_LABELS = {
  [BookCategory.TAMIL]: 'Tamil Books',
  [BookCategory.IT]: 'IT Books',
  [BookCategory.SINHALA]: 'Sinhala Books',
  [BookCategory.ENGLISH]: 'English Books',
  [BookCategory.ARABIC]: 'Arabic Books',
  [BookCategory.OTHER]: 'Other Books'
};

export const BOOK_CATEGORY_COLORS = {
  [BookCategory.TAMIL]: 'bg-orange-500',
  [BookCategory.IT]: 'bg-blue-500',
  [BookCategory.SINHALA]: 'bg-green-500',
  [BookCategory.ENGLISH]: 'bg-purple-500',
  [BookCategory.ARABIC]: 'bg-red-500',
  [BookCategory.OTHER]: 'bg-gray-500'
};
