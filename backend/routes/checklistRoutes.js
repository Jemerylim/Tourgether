const express = require('express');
const {
  getItemsByTrip,
  createItem,
  updateItem,
  toggleItem,
  deleteItem,
} = require('../controllers/checklistController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route to add an item to the packing or to-do list
router.post('/', protect, createItem);

// Route to get a trip's packing and to-do lists
router.get('/trip/:tripId', protect, getItemsByTrip);

// Route to rename, re-kind or assign an item
router.put('/:id', protect, updateItem);

// Route to tick or untick an item
router.post('/:id/toggle', protect, toggleItem);

// Route to delete an item
router.delete('/:id', protect, deleteItem);

module.exports = router;
