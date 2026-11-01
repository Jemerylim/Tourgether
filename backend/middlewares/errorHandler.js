const { config } = require('../config/env');

const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found' });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error('Error:', err.stack);
  res.status(500).json({
    message: 'Internal Server Error',
    ...(config.isProduction ? {} : { error: err.message }),
  });
};

module.exports = { notFound, errorHandler };
