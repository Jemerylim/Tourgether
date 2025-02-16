const Event = require('../models/Event');
const Trip = require('../models/Trip');

// Create a new event
exports.createEvent = async (req, res) => {
  const { tripId, title, date, startTime, endTime, notes: incomingNotes = "",} = req.body;

  console.log("tripId:", tripId);
  console.log("title:", title);
  console.log("date:", date);
  console.log("startTime:", startTime);
  console.log("endTime:", endTime);
  console.log("notes:", incomingNotes);

  if (!tripId || !title || !date || !startTime || !endTime) {
    return res.status(400).json({
      success: false,
      message: "tripId, title, date, startTime, and endTime are required",
    });
  }

  try {
    // Check if the trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    // Combine date with startTime and endTime
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (isNaN(startDateTime) || isNaN(endDateTime)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date or time format",
      });
    }

    // Create the event
    const event = await Event.create({
      trip: tripId,
      title,
      date,
      startTime,
      endTime,
      description: req.body.description || "",
      notes: incomingNotes,
    });

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      success: false,
      message: "Error creating event",
      error: error.message,
    });
  }
};

// Get all events for a specific trip
exports.getEventsByTrip = async (req, res) => {
  const { tripId } = req.params;

  try {
    const events = await Event.find({ trip: tripId });

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching events",
      error: error.message,
    });
  }
};

// Get a single event by ID
exports.getEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findById(id).populate('trip', 'name');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event",
      error: error.message,
    });
  }
};

// Update an event
exports.updateEvent = async (req, res) => {
  const { id } = req.params;
  const { title, description, date, startTime, endTime, notes } = req.body;

  try {
    const event = await Event.findByIdAndUpdate(
      id,
      { title, description, date, startTime, endTime, notes },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      data: event,
    });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({
      success: false,
      message: "Error updating event",
      error: error.message,
    });
  }
};

// Delete an event
exports.deleteEvent = async (req, res) => {
  const { id } = req.params;

  try {
    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting event",
      error: error.message,
    });
  }
};
