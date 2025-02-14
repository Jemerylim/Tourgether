const express = require('express');
const {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  getTripsByUser,
  acceptInvitation,
  declineInvitation,
  checkInvitationStatus,
  sendInviteToMember,
  removeMember,
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

// Accept invitation
router.post('/:tripId/accept-invitation', protect, acceptInvitation);

// Decline invitation
router.delete('/:tripId/decline-invitation', protect, declineInvitation);

// Check invitation status
router.get('/:tripId/status', checkInvitationStatus);

// Send invite to trip
router.post('/:tripId/invite', protect, sendInviteToMember);

// Remove member from trip
router.delete('/:tripId/remove-member/:memberId', protect, removeMember);

module.exports = router;
