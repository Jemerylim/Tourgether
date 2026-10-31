const ChecklistItem = require('../models/ChecklistItem');
const { memberIds, loadTripForMember } = require('../utils/tripAccess');

const PEOPLE = 'name profilePicture';
const MAX_ITEMS = 200;

const withPeople = (query) => query.populate('assignedTo', PEOPLE).populate('doneBy', PEOPLE);

const sendError = (res, message, error) => {
  console.error(`${message}:`, error);
  res.status(500).json({ success: false, message, error: error.message });
};

// Load an item and its trip, checking the user is on the trip. Sends the error
// response itself and returns null when the request can't go on.
const loadItem = async (req, res) => {
  const item = await ChecklistItem.findById(req.params.id);
  if (!item) {
    res.status(404).json({ success: false, message: 'Item not found' });
    return null;
  }
  const trip = await loadTripForMember(req, res, item.trip);
  return trip ? { item, trip } : null;
};

const sendItem = async (res, status, item) =>
  res.status(status).json({ success: true, data: await withPeople(ChecklistItem.findById(item._id)) });

// Get both lists for a trip, oldest first so items stay where people added them
exports.getItemsByTrip = async (req, res) => {
  try {
    const trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    const items = await withPeople(ChecklistItem.find({ trip: trip._id }).sort({ createdAt: 1 }));
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    sendError(res, 'Error fetching the checklist', error);
  }
};

// Add an item to the packing list or the to-do list
exports.createItem = async (req, res) => {
  const { tripId, list = 'packing', kind = 'shared' } = req.body;
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ success: false, message: 'Add the item text' });

  try {
    const trip = await loadTripForMember(req, res, tripId);
    if (!trip) return;
    if ((await ChecklistItem.countDocuments({ trip: trip._id })) >= MAX_ITEMS) {
      return res.status(400).json({ success: false, message: `A trip can have up to ${MAX_ITEMS} items` });
    }

    const item = await ChecklistItem.create({ trip: trip._id, text, list, kind, createdBy: req.user._id });
    await sendItem(res, 201, item);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    sendError(res, 'Error adding the item', error);
  }
};

// Edit an item: rename it, switch between shared and personal, or assign it.
// `assignedTo: null` leaves a shared item unclaimed.
exports.updateItem = async (req, res) => {
  try {
    const loaded = await loadItem(req, res);
    if (!loaded) return;
    const { item, trip } = loaded;
    const { text, kind, assignedTo } = req.body;

    if (text !== undefined) {
      if (!String(text).trim()) return res.status(400).json({ success: false, message: 'Add the item text' });
      item.text = String(text).trim();
    }
    if (kind !== undefined && kind !== item.kind) {
      if (!['shared', 'personal'].includes(kind)) {
        return res.status(400).json({ success: false, message: 'That kind of item is not recognised' });
      }
      // Each kind tracks progress differently, so start fresh
      item.kind = kind;
      item.assignedTo = null;
      item.done = false;
      item.doneBy = [];
    }
    if (assignedTo !== undefined) {
      if (item.kind !== 'shared') {
        return res.status(400).json({ success: false, message: 'Only items one person brings can be assigned' });
      }
      if (assignedTo !== null && !memberIds(trip).includes(String(assignedTo))) {
        return res.status(400).json({ success: false, message: 'That person is not on the trip' });
      }
      item.assignedTo = assignedTo;
      if (assignedTo === null) item.done = false;
    }

    await item.save();
    await sendItem(res, 200, item);
  } catch (error) {
    sendError(res, 'Error updating the item', error);
  }
};

// Tick or untick an item. Shared: marks it sorted for the group, and claims it for the
// current user if nobody had. Personal: ticks it for the current user only.
exports.toggleItem = async (req, res) => {
  try {
    const loaded = await loadItem(req, res);
    if (!loaded) return;
    const { item } = loaded;
    const userId = req.user._id;

    if (item.kind === 'shared') {
      item.done = !item.done;
      if (item.done && !item.assignedTo) item.assignedTo = userId;
    } else if (item.doneBy.some((id) => id.equals(userId))) {
      item.doneBy = item.doneBy.filter((id) => !id.equals(userId));
    } else {
      item.doneBy.push(userId);
    }

    await item.save();
    await sendItem(res, 200, item);
  } catch (error) {
    sendError(res, 'Error updating the item', error);
  }
};

// Delete an item. Whoever added it and the trip organiser can do this.
exports.deleteItem = async (req, res) => {
  try {
    const loaded = await loadItem(req, res);
    if (!loaded) return;
    const { item, trip } = loaded;

    if (!item.createdBy.equals(req.user._id) && !trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only whoever added it or the organiser can delete this' });
    }

    await item.deleteOne();
    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    sendError(res, 'Error deleting the item', error);
  }
};
