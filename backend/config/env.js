// Every setting the backend reads from the environment lives here, so changing a URL,
// port or credential means editing .env (or AWS Secrets Manager), never the code.
// Values are read on access because AWS secrets are loaded into process.env after startup.

const list = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);

const config = {
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get port() {
    return Number(process.env.PORT) || 5000;
  },
  get databaseUrl() {
    return process.env.DATABASE_URL;
  },
  get jwtSecret() {
    return process.env.JWT_SECRET;
  },
  // Where the React app is served. Used to build links in emails.
  get clientUrl() {
    return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  },
  // Origins allowed to call the API. Defaults to the client URL.
  get corsOrigins() {
    const origins = list(process.env.CORS_ORIGINS);
    return origins.length ? origins : [this.clientUrl];
  },
  get emailUser() {
    return process.env.EMAIL_USER;
  },
  get emailPass() {
    return process.env.EMAIL_PASS;
  },
  // Secret to load from AWS Secrets Manager. Production uses TourgetherSecrets unless
  // told otherwise; local development skips AWS entirely unless AWS_SECRET_ID is set.
  get awsSecretId() {
    return process.env.AWS_SECRET_ID || (this.isProduction ? 'TourgetherSecrets' : '');
  },
  get awsRegion() {
    return process.env.AWS_REGION || 'us-east-1';
  },
};

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET'];

// Stop at startup with a clear message instead of failing on the first request.
const assertRequiredEnv = () => {
  const missing = REQUIRED.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (config.isProduction && !process.env.CLIENT_URL) {
    console.warn('CLIENT_URL is not set; email links will point at', config.clientUrl);
  }
};

module.exports = { config, assertRequiredEnv };
