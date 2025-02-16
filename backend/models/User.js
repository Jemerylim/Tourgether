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
    minlength: [8, "Password must be at least 8 characters long"]
  },
  profilePicture: {
    type: String,
    default: 'uploads/profile-pic.jpg'
  },
  bio: {
    type: String,
    maxlength: 200
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: { 
    type: String, 
    default: null  
  },
  resetPasswordExpires: { 
    type: Date, 
    default: null  
  }
});

userSchema.pre('save', hashPassword);

// Export the User model
const User = mongoose.model('User', userSchema);
module.exports = User;
