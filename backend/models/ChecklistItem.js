const mongoose = require('mongoose');

// One line on a trip's packing list or to-do list.
//  - "shared": one person handles it for the group ("I'll bring the speaker").
//    assignedTo is who, done is whether it's sorted.
//  - "personal": everyone does their own ("bring your passport").
//    doneBy holds the members who have ticked it off.
const checklistItemSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Please add the item'],
    trim: true,
    maxlength: 100,
  },
  list: {
    type: String,
    enum: ['packing', 'todo'],
    default: 'packing',
  },
  kind: {
    type: String,
    enum: ['shared', 'personal'],
    default: 'shared',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  done: {
    type: Boolean,
    default: false,
  },
  doneBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ChecklistItem', checklistItemSchema);
