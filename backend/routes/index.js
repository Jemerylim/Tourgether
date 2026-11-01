const express = require('express');

const router = express.Router();

router.use('/usertripdate', require('./userTripDateRoutes'));
router.use('/events', require('./eventRoutes'));
router.use('/polls', require('./pollRoutes'));
router.use('/expenses', require('./expenseRoutes'));
router.use('/checklist', require('./checklistRoutes'));
router.use('/places', require('./placeRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/trips', require('./tripRoutes'));

module.exports = router;
