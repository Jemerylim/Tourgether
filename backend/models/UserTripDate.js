const mongoose = require('mongoose');

const UserTripDateSchema = new mongoose.Schema({
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip', // Reference to the Trip collection
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User collection
        required: true,
    },
    availDates: {
        type: [Date], // An array of dates the user is available
        required: true,
    },
});

module.exports = mongoose.model('UserTripDate', UserTripDateSchema);
