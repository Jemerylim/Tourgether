const mongoose = require('mongoose');

// A copy of a saved place's name and location, kept on events and poll options planned
// from it, so they keep it if the place is later removed from its list
module.exports = new mongoose.Schema(
  {
    placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Place' },
    name: { type: String, trim: true, maxlength: 150, required: true },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    lat: { type: Number, required: true, min: -90, max: 90 },
    lng: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false }
);
