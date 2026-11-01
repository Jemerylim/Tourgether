const express = require('express');
const router = express.Router();
const {getAllAvailabilities,
    getAvailabilitySummary,
    getUserAvailability,
    addOrUpdateAvailability,
    deleteAvailability
}= require('../controllers/userTripDateController');
const { protect } = require('../middlewares/authMiddleware');

// Every availability route needs a signed-in trip member (checked in the controller)
router.use(protect);

// Routes for UserTripDate

// Get all availabilities for a specific trip
router.get('/trip/:tripId', getAllAvailabilities);

// Per-day counts, who is free, and the best runs of days (for the dates heatmap)
router.get('/trip/:tripId/summary', getAvailabilitySummary);

// Get a specific user's availability for a trip
router.get('/trip/:tripId/user/:userId', getUserAvailability);

// Add or update a user's availability for a trip (own availability only)
router.put('/trip/:tripId/user/:userId', addOrUpdateAvailability);

// Delete a user's availability for a trip (own availability only)
router.delete('/trip/:tripId/user/:userId', deleteAvailability);

module.exports = router;
