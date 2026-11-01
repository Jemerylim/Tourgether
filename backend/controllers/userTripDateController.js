const UserTripDate = require('../models/UserTripDate');
const { loadTripForMember } = require('../utils/tripAccess');

// People can only change their own availability. Sends the error response itself
// and returns false when the request can't go on.
const isSelf = (req, res) => {
    if (req.params.userId !== String(req.user._id)) {
        res.status(403).json({ message: 'You can only change your own availability.' });
        return false;
    }
    return true;
};

// Get all availabilities for a specific trip
const getAllAvailabilities = async (req, res) => {
    const { tripId } = req.params;
    try {
        const trip = await loadTripForMember(req, res, tripId);
        if (!trip) return;
        const availabilities = await UserTripDate.find({ tripId: trip._id }).populate('userId', 'name email');
        res.status(200).json(availabilities);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching availabilities', error: err.message });
    }
};

// Get a specific user's availability for a trip
const getUserAvailability = async (req, res) => {
    const { tripId, userId } = req.params;
    try {
        const trip = await loadTripForMember(req, res, tripId);
        if (!trip) return;
        const availability = await UserTripDate.findOne({ tripId: trip._id, userId: String(userId) }).populate('userId', 'name email');
        if (!availability) {
            return res.status(404).json({ message: 'No availability found for this user and trip.' });
        }
        res.status(200).json(availability);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching availability', error: err.message });
    }
};

const addOrUpdateAvailability = async (req, res) => {
    const { tripId, userId } = req.params;
    const { availDates } = req.body;

    // Validate tripId, userId, and availDates
    if (!tripId || !userId) {
        return res.status(400).json({ message: 'Missing tripId or userId.' });
    }

    if (!availDates || !Array.isArray(availDates)) {
        return res.status(400).json({ message: 'Invalid or missing availDates.' });
    }

    if (!isSelf(req, res)) return;

    try {
        const trip = await loadTripForMember(req, res, tripId);
        if (!trip) return;

        const updatedAvailability = await UserTripDate.findOneAndUpdate(
            { tripId: trip._id, userId: req.user._id },
            { availDates },
            { new: true, upsert: true } // Create if doesn't exist
        ).populate('userId', 'name email');

        res.status(200).json(updatedAvailability);
    } catch (err) {
        console.error('Error saving availability:', err);
        res.status(500).json({ message: 'Error saving availability', error: err.message });
    }
};

// Delete a user's availability for a trip
const deleteAvailability= async (req, res) => {
    const { tripId } = req.params;
    if (!isSelf(req, res)) return;
    try {
        const trip = await loadTripForMember(req, res, tripId);
        if (!trip) return;

        const deletedAvailability = await UserTripDate.findOneAndDelete({ tripId: trip._id, userId: req.user._id });
        if (!deletedAvailability) {
            return res.status(404).json({ message: 'No availability found to delete.' });
        }
        res.status(200).json({ message: 'Availability deleted successfully.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error deleting availability', error: err.message });
    }
};

module.exports = {
    getAllAvailabilities,
    getUserAvailability,
    addOrUpdateAvailability,
    deleteAvailability
}
