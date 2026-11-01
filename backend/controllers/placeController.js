const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Place = require('../models/Place');
const { loadTripForMember } = require('../services/tripAccess');

const MAX_LISTS = 20;
const MAX_PLACES = 300;
const FIRST_LIST = 'Places to visit';

const sendError = (res, message, error) => {
  console.error(`${message}:`, error);
  res.status(500).json({ success: false, message, error: error.message });
};

const badRequest = (res, message) => res.status(400).json({ success: false, message });

const isCoordinate = (value, limit) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

const listName = (value) => String(value || '').trim().slice(0, 40);

const findList = (trip, listId) =>
  mongoose.isValidObjectId(listId) ? trip.placeLists.id(listId) : null;

// Lists, destination and places for the trip's Places section. A trip without lists
// gets "Places to visit" so there's always somewhere to save to. The $size check makes
// that safe when two requests arrive at once.
exports.getPlacesByTrip = async (req, res) => {
  try {
    let trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    if (trip.placeLists.length === 0) {
      trip = (await Trip.findOneAndUpdate(
        { _id: trip._id, placeLists: { $size: 0 } },
        { $push: { placeLists: { name: FIRST_LIST } } },
        { new: true }
      )) || (await Trip.findById(trip._id));
    }
    const places = await Place.find({ trip: trip._id }).sort({ createdAt: 1 });
    res.status(200).json({
      success: true,
      data: { lists: trip.placeLists, destination: trip.destination, places },
    });
  } catch (error) {
    sendError(res, 'Error fetching places', error);
  }
};

// Add a list, e.g. "Restaurants"
exports.createList = async (req, res) => {
  const name = listName(req.body.name);
  if (!name) return badRequest(res, 'Give the list a name');
  try {
    const trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    if (trip.placeLists.length >= MAX_LISTS) return badRequest(res, `A trip can have up to ${MAX_LISTS} lists`);
    trip.placeLists.push({ name });
    await trip.save();
    res.status(201).json({ success: true, data: trip.placeLists[trip.placeLists.length - 1] });
  } catch (error) {
    sendError(res, 'Error adding the list', error);
  }
};

exports.renameList = async (req, res) => {
  const name = listName(req.body.name);
  if (!name) return badRequest(res, 'Give the list a name');
  try {
    const trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    const list = findList(trip, req.params.listId);
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });
    list.name = name;
    await trip.save();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    sendError(res, 'Error renaming the list', error);
  }
};

// Delete a list and every place on it. Only the organiser can, since it removes
// what other people saved.
exports.deleteList = async (req, res) => {
  try {
    const trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    if (!trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the organiser can delete a list' });
    }
    const list = findList(trip, req.params.listId);
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });
    list.deleteOne();
    await trip.save();
    await Place.deleteMany({ trip: trip._id, list: list._id });
    res.status(200).json({ success: true, message: 'List deleted successfully' });
  } catch (error) {
    sendError(res, 'Error deleting the list', error);
  }
};

// Set where the trip is. `null` clears it.
exports.setDestination = async (req, res) => {
  const { destination } = req.body;
  if (destination !== null) {
    const name = String(destination?.name || '').trim();
    if (!name || !isCoordinate(destination.lat, 90) || !isCoordinate(destination.lng, 180)) {
      return badRequest(res, 'Pick a destination from the search');
    }
  }
  try {
    const trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    trip.destination = destination && {
      name: String(destination.name).trim().slice(0, 150),
      lat: destination.lat,
      lng: destination.lng,
    };
    await trip.save();
    res.status(200).json({ success: true, data: trip.destination });
  } catch (error) {
    sendError(res, 'Error saving the destination', error);
  }
};

// Save a place to one of the trip's lists
exports.createPlace = async (req, res) => {
  const { tripId, listId, lat, lng } = req.body;
  const name = String(req.body.name || '').trim();
  const sourceId = String(req.body.sourceId || '').trim();
  if (!name) return badRequest(res, 'Add the place name');
  if (!isCoordinate(lat, 90) || !isCoordinate(lng, 180)) return badRequest(res, 'That place has no location');

  try {
    const trip = await loadTripForMember(req, res, tripId);
    if (!trip) return;
    const list = findList(trip, listId);
    if (!list) return res.status(404).json({ success: false, message: 'List not found' });
    if ((await Place.countDocuments({ trip: trip._id })) >= MAX_PLACES) {
      return badRequest(res, `A trip can have up to ${MAX_PLACES} places`);
    }
    if (sourceId && (await Place.exists({ trip: trip._id, list: list._id, sourceId }))) {
      return badRequest(res, `${name} is already in ${list.name}`);
    }

    const imageUrl = String(req.body.imageUrl || '');
    const place = await Place.create({
      trip: trip._id,
      list: list._id,
      name,
      address: req.body.address,
      category: req.body.category,
      lat,
      lng,
      sourceId,
      // Only https images, so a saved place can't point the page at anything else
      imageUrl: imageUrl.startsWith('https://') ? imageUrl : '',
      addedBy: req.user._id,
    });
    res.status(201).json({ success: true, data: place });
  } catch (error) {
    if (error.name === 'ValidationError') return badRequest(res, error.message);
    sendError(res, 'Error saving the place', error);
  }
};

// Load a saved place and check the signed-in user is on its trip. Sends the error
// response itself and returns null when the request can't go on.
const loadPlace = async (req, res) => {
  const place = mongoose.isValidObjectId(req.params.id) ? await Place.findById(req.params.id) : null;
  if (!place) {
    res.status(404).json({ success: false, message: 'Place not found' });
    return null;
  }
  const trip = await loadTripForMember(req, res, place.trip);
  return trip ? { place, trip } : null;
};

// Change a saved place's notes
exports.updatePlace = async (req, res) => {
  try {
    const loaded = await loadPlace(req, res);
    if (!loaded) return;
    const { place } = loaded;
    if (req.body.notes !== undefined) place.notes = String(req.body.notes).slice(0, 500);
    await place.save();
    res.status(200).json({ success: true, data: place });
  } catch (error) {
    if (error.name === 'ValidationError') return badRequest(res, error.message);
    sendError(res, 'Error saving the place', error);
  }
};

// Mark a place as a must-do for the signed-in user, or (with `vote: false`) take it back
exports.votePlace = async (req, res) => {
  try {
    const loaded = await loadPlace(req, res);
    if (!loaded) return;
    const userId = req.user._id;
    const update = req.body.vote === false ? { $pull: { votes: userId } } : { $addToSet: { votes: userId } };
    const place = await Place.findByIdAndUpdate(loaded.place._id, update, { new: true });
    res.status(200).json({ success: true, data: place });
  } catch (error) {
    sendError(res, 'Error saving the vote', error);
  }
};

// Remove a place. Whoever saved it and the trip organiser can do this.
exports.deletePlace = async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ success: false, message: 'Place not found' });
    const trip = await loadTripForMember(req, res, place.trip);
    if (!trip) return;
    if (!place.addedBy.equals(req.user._id) && !trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only whoever saved it or the organiser can remove this' });
    }
    await place.deleteOne();
    res.status(200).json({ success: true, message: 'Place removed successfully' });
  } catch (error) {
    sendError(res, 'Error removing the place', error);
  }
};
