const mongoose = require('mongoose');
const hashPassword = require('../middlewares/hashPassword');

// Define the User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 8
  },
  profilePicture: {
    type: String,
    default: 'default-profile-pic.jpg'
  },
  bio: {
    type: String,
    maxlength: 200
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', hashPassword);

// Export the User model
module.exports = mongoose.model('User', userSchema);
