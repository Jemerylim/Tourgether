const mongoose = require('mongoose');
const { config } = require('./env');

const connectDB = async () => {
  try {
    const { connection } = await mongoose.connect(config.databaseUrl);
    console.log(`MongoDB connected: ${connection.host}/${connection.name}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
