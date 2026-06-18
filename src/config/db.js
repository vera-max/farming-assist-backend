const mongoose = require('mongoose');

// Connects the application to MongoDB using the MONGO_URI value in .env.
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(' MongoDB connected');
  } catch (err) {
    // Stop the server if the database connection fails.
    console.error(' MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = {connectDB};   // export the function directly
