const mongoose = require('mongoose');
const hashPassword = require('./hooks/hashPassword');

// How a person likes to travel. Picked on their profile or seeded from the travel quiz
// (client/src/pages/Quiz), so keep these keys in step with client/src/lib/travelStyles.js.
const TRAVEL_STYLES = ['beach', 'city', 'nature', 'food', 'culture', 'adventure', 'relax', 'budget', 'luxury'];
const MAX_TRAVEL_STYLES = 6;

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
  travelStyles: {
    type: [{ type: String, enum: TRAVEL_STYLES }],
    default: [],
    validate: [(styles) => styles.length <= MAX_TRAVEL_STYLES, `Pick at most ${MAX_TRAVEL_STYLES} travel styles`],
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Set when the account is deleted. The document stays, anonymised, so the expenses and
  // trips other people share with them keep adding up.
  deletedAt: {
    type: Date,
    default: null
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

// Never send password or reset-token hashes out in API responses
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpires;
    return ret;
  },
});

// Export the User model
const User = mongoose.model('User', userSchema);
User.TRAVEL_STYLES = TRAVEL_STYLES;
User.MAX_TRAVEL_STYLES = MAX_TRAVEL_STYLES;
module.exports = User;
