const express = require('express');
const {
  createTrip,
  getTrips,
  getTrip,
  updateTrip,
  deleteTrip,
  getMyTrips,
  acceptInvitation,
  declineInvitation,
  checkInvitationStatus,
  sendInviteToMember,
  removeMember,
  setMemberRole,
  getInviteLink,
  createInviteLink,
  disableInviteLink,
  previewInviteLink,
  joinWithInviteLink,
} = require('../controllers/tripController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Shareable invite links. These come before '/:id' so "join" isn't read as a trip ID.
// The preview is public so someone who isn't signed in yet can see what they're joining.
router.get('/join/:token', previewInviteLink);
router.post('/join/:token', protect, joinWithInviteLink);
router.get('/:tripId/invite-link', protect, getInviteLink);
router.post('/:tripId/invite-link', protect, createInviteLink);
router.delete('/:tripId/invite-link', protect, disableInviteLink);

// Route for creating a new trip (protected route)
router.post('/create-trip', protect, createTrip);

// The signed-in user's trips and pending invitations. Before '/:id' so "mine" isn't read as a trip ID.
router.get('/mine', protect, getMyTrips);

// Route to get all trips (protected route)
router.get('/', protect, getTrips);

// Route to get a single trip by ID (protected route)
router.get('/:id', protect, getTrip);

// Route to update a trip by ID (protected route)
router.put('/:id', protect, updateTrip);

// Route to delete a trip by ID (protected route)
router.delete('/:id', protect, deleteTrip);

// Accept invitation
router.post('/:tripId/accept-invitation', protect, acceptInvitation);

// Decline invitation
router.delete('/:tripId/decline-invitation', protect, declineInvitation);

// Check invitation status
router.get('/:tripId/status', protect, checkInvitationStatus);

// Send invite to trip
router.post('/:tripId/invite', protect, sendInviteToMember);

// Remove member from trip
router.delete('/:tripId/remove-member/:memberId', protect, removeMember);

// Change a member's role (organiser only)
router.put('/:tripId/members/:memberId/role', protect, setMemberRole);

module.exports = router;
