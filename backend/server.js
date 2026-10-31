require('dotenv').config(); // Load local .env for development
const express = require('express');
const cors = require('cors');
const path = require('path');
const AWS = require("aws-sdk");
const { config, assertRequiredEnv } = require('./config/env');
const connectDB = require('./config/db'); // MongoDB connection function
const migrateExpenses = require('./utils/migrateExpenses');
const userRoutes = require('./routes/userRoutes');
const tripRoutes = require('./routes/tripRoutes');
const userTripDateRoutes = require('./routes/userTripDateRoutes');
const eventRoutes = require('./routes/eventRoutes');
const pollRoutes = require('./routes/pollRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const checklistRoutes = require('./routes/checklistRoutes');

const app = express();

// Serve static files (e.g., images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Middleware to parse incoming JSON requests
app.use(express.json());

// Only the origins in CORS_ORIGINS (default: CLIENT_URL) may call the API from a browser.
// CORS_ORIGINS=* allows any origin. Requests without an Origin (curl, server-to-server) pass.
app.use(cors({
  origin(origin, callback) {
    const allowed = config.corsOrigins;
    callback(null, !origin || allowed.includes('*') || allowed.includes(origin));
  },
  methods: "GET,POST,PUT,DELETE",
  credentials: true
}));

// Log requests while developing. Bodies are never logged: they carry passwords and tokens.
if (!config.isProduction) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// **🚀 API Routes**
app.use('/api/usertripdate', userTripDateRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);

// **🌐 Default Route**
app.get('/', (req, res) => {
  res.send('API is running...');
});

// **🛠 Error Handling Middleware**
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    ...(config.isProduction ? {} : { error: err.message }),
  });
});

// **🚀 Load Secrets from AWS Secrets Manager (For Production)**
// Every key in the secret's JSON becomes an environment variable, e.g. CLIENT_URL.
async function loadSecrets() {
  if (!config.awsSecretId) return;

  try {
    const secretsManager = new AWS.SecretsManager({ region: config.awsRegion });
    const secretValue = await secretsManager.getSecretValue({ SecretId: config.awsSecretId }).promise();
    if (secretValue.SecretString) {
      Object.assign(process.env, JSON.parse(secretValue.SecretString));
    }
  } catch (error) {
    console.error("❌ Error loading secrets from AWS Secrets Manager:", error);
  }
}

// **🚀 Connect to MongoDB After Loading Secrets, then Start Server**
async function start() {
  await loadSecrets();
  assertRequiredEnv();
  await connectDB();
  await migrateExpenses();

  app.listen(config.port, () => {
    console.log(`🚀 Server is running on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
