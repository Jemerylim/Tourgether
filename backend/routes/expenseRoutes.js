const express = require('express');
const {
  getExpensesByTrip,
  createExpense,
  updateExpense,
  deleteExpense,
  restoreExpense,
  setBaseCurrency,
  setRate,
} = require('../controllers/expenseController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route to add an expense or a settle-up payment
router.post('/', protect, createExpense);

// Route to get a trip's expenses and who owes whom
router.get('/trip/:tripId', protect, getExpensesByTrip);

// Route to choose the currency a trip settles up in
router.put('/trip/:tripId/currency', protect, setBaseCurrency);

// Route to set or remove a trip's exchange rate into its settle-up currency
router.put('/trip/:tripId/rates', protect, setRate);

// Route to edit an expense
router.put('/:id', protect, updateExpense);

// Route to delete an expense (it can be restored)
router.delete('/:id', protect, deleteExpense);

// Route to restore a deleted expense
router.post('/:id/restore', protect, restoreExpense);

module.exports = router;
