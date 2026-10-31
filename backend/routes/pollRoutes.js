const express = require('express');
const {
  createPoll,
  getPollsByTrip,
  votePoll,
  addOption,
  closePoll,
  deletePoll,
} = require('../controllers/pollController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route to create a new poll for a trip
router.post('/', protect, createPoll);

// Route to get all polls for a specific trip
router.get('/trip/:tripId', protect, getPollsByTrip);

// Route to cast or change the current user's vote
router.post('/:id/vote', protect, votePoll);

// Route to suggest another option on an open poll
router.post('/:id/options', protect, addOption);

// Route to close a poll and optionally turn the winner into an event
router.post('/:id/close', protect, closePoll);

// Route to delete a poll
router.delete('/:id', protect, deletePoll);

module.exports = router;
