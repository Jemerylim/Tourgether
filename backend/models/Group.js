const mongoose = require('mongoose');

// Define the Group schema
const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a group name']
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Export the Group model
module.exports = mongoose.model('Group', groupSchema);
