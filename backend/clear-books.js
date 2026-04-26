require("dotenv").config();
const mongoose = require("mongoose");
const Book = require("./src/models/Book");

async function clearBooks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    
    const result = await Book.deleteMany({});
    console.log(`Deleted ${result.deletedCount} books from database`);
    
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    console.log("Books cleared successfully!");
  } catch (error) {
    console.error("Error clearing books:", error);
  }
}

clearBooks();
