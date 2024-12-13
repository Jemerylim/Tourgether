require('dotenv').config(); // Load environment variables
const express = require('express');
const cors = require('cors'); // Import cors middleware
const connectDB = require('./config/db'); // Import the connectDB function
const userRoutes = require('./routes/userRoutes'); // Import user routes
const tripRoutes = require('./routes/tripRoutes'); // Import trip routes

const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

const allowedOrigins = [
  'http://localhost:5173', // Vite frontend during development
  'http://localhost:3000', // Your production frontend URL
];

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true); // Allow the origin
    } else {
      callback(new Error('Not allowed by CORS')); // Block the origin
    }
  },
  credentials: true, // If using cookies or credentials
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
