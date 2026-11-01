const Poll = require('../models/Poll');
const Event = require('../models/Event');
const UserTripDate = require('../models/UserTripDate');
const Expense = require('../models/Expense');
const ChecklistItem = require('../models/ChecklistItem');
const Place = require('../models/Place');

// Deletes a trip and everything planned inside it
const deleteTripData = async (trip) => {
  await trip.deleteOne();
  await Promise.all([
    Poll.deleteMany({ trip: trip._id }),
    Event.deleteMany({ trip: trip._id }),
    UserTripDate.deleteMany({ tripId: trip._id }),
    Expense.deleteMany({ trip: trip._id }),
    ChecklistItem.deleteMany({ trip: trip._id }),
    Place.deleteMany({ trip: trip._id }),
  ]);
};

module.exports = deleteTripData;
