const bcrypt = require('bcryptjs');

// Middleware to hash the password
const hashPassword = async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    // Hash the password using the salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = hashPassword;
