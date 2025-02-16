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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Event", eventSchema);
