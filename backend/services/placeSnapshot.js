const mongoose = require('mongoose');

const isCoordinate = (value, limit) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit;

// A `place` from a request body (see models/placeSnapshotSchema): undefined when the
// request leaves it alone, null to clear it, false when it's malformed, otherwise the
// fields to store
const parsePlaceSnapshot = (input) => {
  if (input === undefined || input === null) return input;
  const name = String(input.name || '').trim().slice(0, 150);
  if (!name || !isCoordinate(input.lat, 90) || !isCoordinate(input.lng, 180)) return false;
  return {
    placeId: mongoose.isValidObjectId(input.placeId) ? input.placeId : undefined,
    name,
    address: String(input.address || '').trim().slice(0, 300),
    lat: input.lat,
    lng: input.lng,
  };
};

module.exports = { parsePlaceSnapshot };
