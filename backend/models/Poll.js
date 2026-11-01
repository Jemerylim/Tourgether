const mongoose = require('mongoose');
const placeSnapshotSchema = require('./placeSnapshotSchema');

// One choice in a poll. `votes` holds the IDs of members who picked it.
const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Please add the option text'],
    trim: true,
    maxlength: 100,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  votes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  // Set when the option is one of the trip's saved places, so the winner's event
  // lands at that place
  place: {
    type: placeSnapshotSchema,
    default: null,
  },
});

// Define the Poll schema
const pollSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  question: {
    type: String,
    required: [true, 'Please add a question'],
    trim: true,
    maxlength: 150,
  },
  options: [optionSchema],
  allowMultiple: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Optional slot for the winning option, so closing the poll can schedule it straight away.
  // Same formats as Event: date YYYY-MM-DD, times HH:mm.
  date: { type: String, default: '' },
  startTime: { type: String, default: '' },
  endTime: { type: String, default: '' },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open',
  },
  winningOption: {
    type: mongoose.Schema.Types.ObjectId,
  },
  // The event created from the winning option, if any
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  closedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Poll', pollSchema);
