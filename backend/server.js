require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors'); // Import cors middleware
const connectDB = require('./config/db'); // Import the connectDB function
const userRoutes = require('./routes/userRoutes'); // Import user routes
const tripRoutes = require('./routes/tripRoutes'); // Import trip routes
const userTripDateRoutes = require('./routes/userTripDateRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();

const path = require("path");

// Serve static files (ensure images can be accessed)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Middleware to parse incoming JSON requests
app.use(express.json());

// Allow requests from your frontend
app.use(cors({
  origin: "http://52.44.156.98", // Change this to match your frontend URL
  methods: "GET,POST,PUT,DELETE",
  credentials: true
}));

// Middleware to log request details
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request Body:', req.body);
  }
  next();
});

// Connect to MongoDB
connectDB();

// UserTripDate routes
app.use('/api/usertripdate', userTripDateRoutes);

// events routes
app.use('/api/events', eventRoutes);

// User routes
app.use('/api/users', userRoutes);

// Trip routes
app.use('/api/trips', tripRoutes); 

// Default route for testing
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

// Use the PORT variable from the .env file or default to 5000
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
