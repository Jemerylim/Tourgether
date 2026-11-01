const Event = require('../models/Event');
const { loadTripForMember, loadTripForEditor } = require('../services/tripAccess');

// Load an event and check the signed-in user is on its trip (and, with `forEdit`, may
// change it: viewers can't). Sends the error response itself and returns null when the
// request can't go on.
const loadEventForMember = async (req, res, id, { forEdit = false } = {}) => {
  const event = await Event.findById(id);
  if (!event) {
    res.status(404).json({ success: false, message: "Event not found" });
    return null;
  }
  const trip = await (forEdit ? loadTripForEditor : loadTripForMember)(req, res, event.trip);
  return trip ? event : null;
};

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
    // The trip must exist and the signed-in user must be able to edit it
    const trip = await loadTripForEditor(req, res, tripId);
    if (!trip) return;

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
    const trip = await loadTripForMember(req, res, tripId);
    if (!trip) return;
    const events = await Event.find({ trip: trip._id });

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
    const event = await loadEventForMember(req, res, id);
    if (!event) return;
    await event.populate('trip', 'name');

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
    const found = await loadEventForMember(req, res, id, { forEdit: true });
    if (!found) return;

    const event = await Event.findByIdAndUpdate(
      found._id,
      { title, description, date, startTime, endTime, notes },
      { new: true, runValidators: true }
    );

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
    const event = await loadEventForMember(req, res, id, { forEdit: true });
    if (!event) return;
    await event.deleteOne();

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
