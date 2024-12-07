const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Remove deprecated options
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB Connected: localhost');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
