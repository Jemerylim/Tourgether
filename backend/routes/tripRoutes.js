const express = require('express');
const {
  createTrip,
  getTrip,
  getTrips,
  deleteTrip,
  updateTrip,
  getTripsByUser
} = require('../controllers/tripController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route for creating a new trip (protected route)
router.post('/create-trip', protect, createTrip);

// Route to get all trips (protected route)
router.get('/', protect, getTrips);

// Route to get a single trip by ID (protected route)
router.get('/:id', protect, getTrip);

// Route to update a trip by ID (protected route)
router.put('/:id', protect, updateTrip);

// Route to delete a trip by ID (protected route)
router.delete('/:id', protect, deleteTrip);

// Get all trips for a specific user
router.get('/user/:userId', getTripsByUser);

module.exports = router;
