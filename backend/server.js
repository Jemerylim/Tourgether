require('dotenv').config(); // Load local .env for development
const { config, assertRequiredEnv } = require('./config/env');
const loadSecrets = require('./config/secrets');
const connectDB = require('./config/db');
const migrateExpenses = require('./migrations/migrateExpenses');

// Secrets load first because app.js and the config read env vars on access
async function start() {
  await loadSecrets();
  assertRequiredEnv();
  await connectDB();
  await migrateExpenses();

  const app = require('./app');
  app.listen(config.port, () => {
    console.log(`🚀 Server is running on port ${config.port}`);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
