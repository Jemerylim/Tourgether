const express = require('express');
const {
  createEvent,
  getEventsByTrip,
  getEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route to create a new event (protected route)
router.post('/', protect, createEvent);

// Route to get all events for a specific trip
router.get('/trip/:tripId', protect, getEventsByTrip);

// Route to get a single event by ID
router.get('/:id', protect, getEvent);

// Route to update an event by ID
router.put('/:id', protect, updateEvent);

// Route to delete an event by ID
router.delete('/:id', protect, deleteEvent);

module.exports = router;
