const express = require('express');
const router = express.Router();
const {getAllAvailabilities,
    getUserAvailability,
    addOrUpdateAvailability,
    deleteAvailability
}= require('../controllers/userTripDateController');

// Routes for UserTripDate

// Get all availabilities for a specific trip
router.get('/trip/:tripId', getAllAvailabilities);

// Get a specific user's availability for a trip
router.get('/trip/:tripId/user/:userId', getUserAvailability);

// Add or update a user's availability for a trip
router.put('/trip/:tripId/user/:userId', addOrUpdateAvailability);

// Delete a user's availability for a trip
router.delete('/trip/:tripId/user/:userId', deleteAvailability);

router.get('/test', (req, res) => {
    res.status(200).json({ message: 'UserTripDate route is working!' });
});

module.exports = router;
