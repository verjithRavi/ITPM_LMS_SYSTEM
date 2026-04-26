const router = require("express").Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const {
  getBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  generateNextBookId
} = require("../controllers/book.controller");

// Public routes (no authentication required for reading)
router.get("/", getBooks);
router.get("/:id", getBookById);

// Protected routes (require authentication)
router.post("/", requireAuth, requireRole("ADMIN"), createBook);
router.put("/:id", requireAuth, requireRole("ADMIN"), updateBook);
router.delete("/:id", requireAuth, requireRole("ADMIN"), deleteBook);

// Generate next book ID
router.get("/generate-next-id/:category", requireAuth, requireRole("ADMIN"), generateNextBookId);

module.exports = router;
