const express = require('express');
const {
  getPlacesByTrip,
  createList,
  renameList,
  deleteList,
  setDestination,
  createPlace,
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

// Route to set where the trip is
router.put('/trip/:tripId/destination', protect, setDestination);

// Route to save a place to a list
router.post('/', protect, createPlace);

// Route to remove a saved place
router.delete('/:id', protect, deletePlace);

module.exports = router;
