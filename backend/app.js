const express = require('express');
const cors = require('cors');
const path = require('path');
const { config } = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// Serve static files (e.g., images)
// Locked down so a stray HTML/SVG file here can't run script on the app's origin
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    res.set('Content-Disposition', 'inline');
  },
}));

app.use(express.json());

// Only the origins in CORS_ORIGINS (default: CLIENT_URL) may call the API from a browser.
// CORS_ORIGINS=* allows any origin. Requests without an Origin (curl, server-to-server) pass.
app.use(cors({
  origin(origin, callback) {
    const allowed = config.corsOrigins;
    callback(null, !origin || allowed.includes('*') || allowed.includes(origin));
  },
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
}));

// Log requests while developing. Bodies are never logged: they carry passwords and tokens.
if (!config.isProduction) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
