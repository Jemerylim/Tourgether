const mongoose = require("mongoose");

// Define the Event schema
const eventSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    required: true, // Foreign key to the Trip model
  },
  title: {
    type: String,
    required: [true, "Please add a title for the event"],
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  date: {
    type: String,
    required: [true, "Please add a date for the event"], // Format: YYYY-MM-DD
  },
  startTime: {
    type: String,
    required: [true, "Please add a start time for the event"], // Format: HH:mm
  },
  endTime: {
    type: String,
    required: [true, "Please add an end time for the event"], // Format: HH:mm
  },
  notes: {
    type: String,
    default: "",
  },
  // Where the event happens, when it was planned from one of the trip's saved places.
  // A copy of the place's name and location, so the event keeps them if the place is
  // later removed from its list.
  place: {
    type: new mongoose.Schema(
      {
        placeId: { type: mongoose.Schema.Types.ObjectId, ref: "Place" },
        name: { type: String, trim: true, maxlength: 150, required: true },
        address: { type: String, trim: true, maxlength: 300, default: "" },
        lat: { type: Number, required: true, min: -90, max: 90 },
        lng: { type: Number, required: true, min: -180, max: 180 },
      },
      { _id: false }
    ),
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Event", eventSchema);
