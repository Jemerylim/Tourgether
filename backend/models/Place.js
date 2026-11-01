const mongoose = require('mongoose');

// A real-world spot saved to one of a trip's place lists ("Restaurants", "Beaches").
// Places come from the OpenStreetMap search on the client, so `sourceId` is the OSM
// object ("N123", "W456") and stops the same spot being saved to a list twice.
const placeSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
    index: true,
  },
  // _id of the list in trip.placeLists
  list: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please add the place name'],
    trim: true,
    maxlength: 150,
  },
  address: {
    type: String,
    trim: true,
    maxlength: 300,
    default: '',
  },
  // What kind of place it is, e.g. "Museum" or "Beach"
  category: {
    type: String,
    trim: true,
    maxlength: 60,
    default: '',
  },
  lat: {
    type: Number,
    required: true,
    min: -90,
    max: 90,
  },
  lng: {
    type: Number,
    required: true,
    min: -180,
    max: 180,
  },
  sourceId: {
    type: String,
    trim: true,
    maxlength: 40,
    default: '',
  },
  imageUrl: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  // Position in its list, lowest first. Places saved before ordering existed have none
  // and fall back to when they were added.
  order: {
    type: Number,
  },
  // When the group ticked it off on the trip
  visitedAt: {
    type: Date,
    default: null,
  },
  // Tips for the group, e.g. "book ahead" or "cash only"
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  // Members who marked it a must-do
  votes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Place', placeSchema);
