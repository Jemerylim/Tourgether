const Trip = require('../models/Trip');

const isMember = (trip, userId) =>
  trip.createdBy.equals(userId) || trip.members.some((member) => member.equals(userId));

// Everyone on the trip, organiser included, as ID strings
const memberIds = (trip) => [trip.createdBy, ...trip.members].map(String);

// 'owner' for the organiser, otherwise 'editor' or 'viewer'; null for anyone not on the trip
const roleOf = (trip, userId) => {
  if (trip.createdBy.equals(userId)) return 'owner';
  if (!trip.members.some((member) => member.equals(userId))) return null;
  return trip.memberRoles.find((entry) => entry.user.equals(userId))?.role || 'editor';
};

const canEdit = (trip, userId) => ['owner', 'editor'].includes(roleOf(trip, userId));

// Load a trip and check the signed-in user is on it. Sends the error response itself
// and returns null when the request can't go on.
const loadTripForMember = async (req, res, tripId) => {
  const trip = await Trip.findById(tripId);
  if (!trip) {
    res.status(404).json({ success: false, message: 'Trip not found' });
    return null;
  }
  if (!isMember(trip, req.user._id)) {
    res.status(403).json({ success: false, message: 'You are not a member of this trip' });
    return null;
  }
  return trip;
};

// Like loadTripForMember, but viewers are turned away with a 403
const loadTripForEditor = async (req, res, tripId) => {
  const trip = await loadTripForMember(req, res, tripId);
  if (!trip) return null;
  if (!canEdit(trip, req.user._id)) {
    res.status(403).json({ success: false, message: 'Viewers can look but not change this trip' });
    return null;
  }
  return trip;
};

module.exports = { isMember, memberIds, roleOf, canEdit, loadTripForMember, loadTripForEditor };
