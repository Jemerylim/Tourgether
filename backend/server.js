require('dotenv').config(); // Load local .env for development
const express = require('express');
const cors = require('cors');
const path = require('path');
const AWS = require("aws-sdk");
const connectDB = require('./config/db'); // MongoDB connection function
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const userTripDateRoutes = require('./routes/userTripDateRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();

// Serve static files (e.g., images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware to parse incoming JSON requests
app.use(express.json());

// Allow frontend access via CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://52.44.156.98",
  methods: "GET,POST,PUT,DELETE",
  credentials: true
}));

// Middleware to log request details for debugging
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log('Request Body:', req.body);
  }
  next();
});

// **🚀 Load Secrets from AWS Secrets Manager (For Production)**
const secretsManager = new AWS.SecretsManager({ region: "us-east-1" });

async function loadSecrets() {
  try {
    const secretValue = await secretsManager.getSecretValue({ SecretId: "TourgetherSecrets" }).promise();
    if (secretValue.SecretString) {
      const secrets = JSON.parse(secretValue.SecretString);
      process.env.DATABASE_URL = secrets.DATABASE_URL;
      process.env.JWT_SECRET = secrets.JWT_SECRET;
      process.env.EMAIL_USER = secrets.EMAIL_USER;
      process.env.EMAIL_PASS = secrets.EMAIL_PASS;
      process.env.GMAIL_PASS = secrets.GMAIL_PASS;
      process.env.PORT = secrets.PORT || 5000;
    }
  } catch (error) {
    console.error("❌ Error loading secrets from AWS Secrets Manager:", error);
  }
}

// **🚀 Connect to MongoDB After Loading Secrets**
loadSecrets().then(() => {
  connectDB();

  // **🚀 API Routes**
  app.use('/api/usertripdate', userTripDateRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/trips', tripRoutes); 

  // **🌐 Default Route**
  app.get('/', (req, res) => {
    res.send('API is running...');
  });

  // **🛠 Error Handling Middleware**
  app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
  });

  // **🚀 Start Server**
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
});
