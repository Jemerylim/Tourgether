const mongoose = require('mongoose');

// Define the Trip schema
const tripSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a trip name'],
    trim: true,
    maxlength: [100, 'Trip names can be at most 100 characters'],
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  // What each member may do. The organiser (createdBy) is always the owner and has no
  // entry here; a member without an entry is an editor, so trips from before roles
  // existed keep working.
  memberRoles: [
    {
      _id: false,
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['editor', 'viewer'], default: 'editor' },
    },
  ],
  sentInvitations: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }, 
  description: {
    type: String,
    maxlength: 500,
  },
  // Currency everyone settles up in. null = settle each currency separately.
  baseCurrency: {
    type: String,
    uppercase: true,
    default: null,
  },
  // Exchange rates for the trip: 1 `from` = `rate` `to`. Expenses in `from` are converted
  // with the rate whose `to` is the base currency, so switching the base currency back
  // and forth never loses a rate.
  rates: [
    {
      _id: false,
      from: { type: String, uppercase: true, required: true },
      to: { type: String, uppercase: true, required: true },
      rate: { type: Number, required: true, min: 0 },
    },
  ],
  // Named lists the trip's places are saved into, in display order (see models/Place.js)
  placeLists: [
    {
      name: { type: String, required: true, trim: true, maxlength: 40 },
    },
  ],
  // Where the trip is, picked from the place search. Centres the map and the
  // recommended places before anything has been saved.
  destination: {
    type: {
      _id: false,
      name: { type: String, trim: true, maxlength: 150 },
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
    },
    default: null,
  },
  startDate: {
    type: Date,
    required: false,
  },
  endDate: {
    type: Date,
    required: false,
  },
  // Shareable invite link. Anyone signed in with the token can join, so it's never
  // returned by normal trip queries; only the organiser reads it (with .select()).
  inviteToken: {
    type: String,
    select: false,
    index: { unique: true, sparse: true },
  },
  inviteExpiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Trip', tripSchema);
