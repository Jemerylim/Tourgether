const express = require('express');
const {
  getPlacesByTrip,
  createList,
  renameList,
  deleteList,
  reorderList,
  setDestination,
  createPlace,
  updatePlace,
  votePlace,
  deletePlace,
} = require('../controllers/placeController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route to get a trip's place lists, destination and saved places
router.get('/trip/:tripId', protect, getPlacesByTrip);

// Routes to add, rename and delete a place list
router.post('/trip/:tripId/lists', protect, createList);
router.put('/trip/:tripId/lists/:listId', protect, renameList);
router.delete('/trip/:tripId/lists/:listId', protect, deleteList);
router.put('/trip/:tripId/lists/:listId/order', protect, reorderList);

// Route to set where the trip is
router.put('/trip/:tripId/destination', protect, setDestination);

// Route to save a place to a list
router.post('/', protect, createPlace);

// Routes to change a saved place and to mark it a must-do
router.put('/:id', protect, updatePlace);
router.put('/:id/vote', protect, votePlace);

// Route to remove a saved place
router.delete('/:id', protect, deletePlace);

module.exports = router;
