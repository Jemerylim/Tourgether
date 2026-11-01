const UserTripDate = require('../models/UserTripDate');
const User = require('../models/User');
const { loadTripForMember, memberIds } = require('../utils/tripAccess');
const { dayKey, dailyAvailability, bestRanges } = require('../utils/bestDates');

const MAX_AVAIL_DAYS = 366;

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

// How many members are free on each day, who they are, and the best runs of days.
// Everyone on the trip can read it; it's what the dates heatmap is drawn from.
const getAvailabilitySummary = async (req, res) => {
    try {
        const trip = await loadTripForMember(req, res, req.params.tripId);
        if (!trip) return;

        const ids = memberIds(trip);
        const [users, records] = await Promise.all([
            User.find({ _id: { $in: ids } }).select('name'),
            UserTripDate.find({ tripId: trip._id }),
        ]);
        const people = new Map(users.map((user) => [String(user._id), { _id: String(user._id), name: user.name }]));

        const days = dailyAvailability(records, people);
        const responded = new Set(records.map((record) => String(record.userId)).filter((id) => people.has(id))).size;
        res.status(200).json({
            success: true,
            data: { totalMembers: people.size, responded, days, bestRanges: bestRanges(days) },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error fetching availability summary', error: err.message });
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

    // One entry per calendar day, whatever time of day the client sent
    const dates = availDates.map((value) => new Date(value));
    if (dates.some((date) => Number.isNaN(date.getTime())) || availDates.length > MAX_AVAIL_DAYS * 2) {
        return res.status(400).json({ message: 'availDates must be a list of valid dates.' });
    }
    const days = [...new Set(dates.map(dayKey))].sort();
    if (days.length > MAX_AVAIL_DAYS) {
        return res.status(400).json({ message: `You can mark at most ${MAX_AVAIL_DAYS} days.` });
    }

    try {
        const trip = await loadTripForMember(req, res, tripId);
        if (!trip) return;

        const updatedAvailability = await UserTripDate.findOneAndUpdate(
            { tripId: trip._id, userId: req.user._id },
            { availDates: days.map((key) => new Date(key)) },
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
    getAvailabilitySummary,
    getUserAvailability,
    addOrUpdateAvailability,
    deleteAvailability
}
