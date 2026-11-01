const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { config } = require('../config/env');

const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    // Decode the token and attach the user (without password) to the request
    const decoded = jwt.verify(header.split(' ')[1], config.jwtSecret);
    req.user = await User.findById(decoded.id).select('-password');
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }

  // A valid token for a deleted account
  if (!req.user || req.user.deletedAt) {
    return res.status(401).json({ message: 'Not authorized, user not found' });
  }

  next();
};

module.exports = { protect };
