require('dotenv').config();
console.log('Loaded Environment Variables:', process.env);

const express = require('express');
const connectDB = require('./config/db'); // Import the connectDB function
const userRoutes = require('./routes/userRoutes');

const app = express();

// Middleware to parse incoming JSON requests
app.use(express.json());

// Connect to MongoDB using the imported connectDB function
connectDB();

// Use the userRoutes for any request starting with /api/users
app.use('/api/users', userRoutes);

// Default route for testing
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Use the PORT variable from the .env file or default to 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
