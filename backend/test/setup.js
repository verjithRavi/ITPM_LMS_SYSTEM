// Load environment variables for testing
require('dotenv').config({ path: '.env' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test utilities
global.assert = require('assert');
global.expect = require('chai').expect;

// Database connection setup for tests
const mongoose = require('mongoose');

// Export setup for use in tests
module.exports = {
  setupDatabase: async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/test');
      console.log('Connected to test database');
    } catch (error) {
      console.error('Database connection error:', error);
    }
  },
  
  cleanupDatabase: async () => {
    try {
      await mongoose.connection.close();
      console.log('Disconnected from test database');
    } catch (error) {
      console.error('Database disconnection error:', error);
    }
  }
};
