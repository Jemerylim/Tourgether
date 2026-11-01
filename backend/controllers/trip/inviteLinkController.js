const crypto = require('crypto');
const Trip = require('../../models/Trip');

// ----- Shareable invite links -----

const INVITE_LINK_DAYS = [1, 7, 30];

const inviteLinkInfo = (trip) =>
  trip.inviteToken ? { token: trip.inviteToken, expiresAt: trip.inviteExpiresAt } : null;

const isLinkExpired = (trip) => Boolean(trip.inviteExpiresAt) && trip.inviteExpiresAt < new Date();

// Load a trip with its invite token, for the organiser only. Sends the error response
// itself and returns null when the request can't go on.
const loadTripForOrganiser = async (req, res) => {
  const trip = await Trip.findById(req.params.tripId).select('+inviteToken');
  if (!trip) {
    res.status(404).json({ success: false, message: 'Trip not found' });
    return null;
  }
  if (!trip.createdBy.equals(req.user._id)) {
    res.status(403).json({ success: false, message: 'Only the trip organiser can manage the invite link' });
    return null;
  }
  return trip;
};

// Get the current invite link (null when there isn't one)
exports.getInviteLink = async (req, res) => {
  try {
    const trip = await loadTripForOrganiser(req, res);
    if (!trip) return;
    res.status(200).json({ success: true, data: inviteLinkInfo(trip) });
  } catch (error) {
    console.error('Error fetching invite link:', error);
    res.status(500).json({ success: false, message: 'Error fetching invite link', error: error.message });
  }
};

// Create a new invite link, replacing (and so switching off) any old one.
// `expiresInDays` is 1, 7 or 30; leave it out for a link that never expires.
exports.createInviteLink = async (req, res) => {
  const { expiresInDays = null } = req.body;
  if (expiresInDays !== null && !INVITE_LINK_DAYS.includes(Number(expiresInDays))) {
    return res.status(400).json({ success: false, message: 'Links can last 1, 7 or 30 days, or never expire' });
  }

  try {
    const trip = await loadTripForOrganiser(req, res);
    if (!trip) return;

    trip.inviteToken = crypto.randomBytes(18).toString('base64url');
    trip.inviteExpiresAt = expiresInDays === null ? null : new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000);
    await trip.save();

    res.status(201).json({ success: true, data: inviteLinkInfo(trip) });
  } catch (error) {
    console.error('Error creating invite link:', error);
    res.status(500).json({ success: false, message: 'Error creating invite link', error: error.message });
  }
};

// Switch the invite link off
exports.disableInviteLink = async (req, res) => {
  try {
    const trip = await loadTripForOrganiser(req, res);
    if (!trip) return;

    trip.inviteToken = undefined;
    trip.inviteExpiresAt = null;
    await trip.save();

    res.status(200).json({ success: true, data: null });
  } catch (error) {
    console.error('Error disabling invite link:', error);
    res.status(500).json({ success: false, message: 'Error disabling invite link', error: error.message });
  }
};

// Find the trip behind an invite token. Sends the error response itself and returns null
// when the link is unknown or expired.
const loadTripByInvite = async (req, res) => {
  const trip = await Trip.findOne({ inviteToken: req.params.token }).populate('createdBy', 'name');
  if (!trip) {
    res.status(404).json({ success: false, message: 'This invite link is not valid. It may have been reset or switched off.' });
    return null;
  }
  if (isLinkExpired(trip)) {
    res.status(410).json({ success: false, message: 'This invite link has expired. Ask the organiser for a new one.' });
    return null;
  }
  return trip;
};

// What the link leads to, shown before joining. Public, so it only reveals the basics.
exports.previewInviteLink = async (req, res) => {
  try {
    const trip = await loadTripByInvite(req, res);
    if (!trip) return;
    res.status(200).json({
      success: true,
      data: {
        tripId: trip._id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        organiser: trip.createdBy?.name,
        memberCount: trip.members.filter((member) => !member.equals(trip.createdBy._id)).length + 1,
      },
    });
  } catch (error) {
    console.error('Error reading invite link:', error);
    res.status(500).json({ success: false, message: 'Error reading invite link', error: error.message });
  }
};

// Join the trip behind an invite link as the signed-in user
exports.joinWithInviteLink = async (req, res) => {
  try {
    const trip = await loadTripByInvite(req, res);
    if (!trip) return;

    const userId = req.user._id;
    const alreadyMember = trip.createdBy._id.equals(userId) || trip.members.some((member) => member.equals(userId));
    if (!alreadyMember) {
      trip.members.push(userId);
      // An emailed invite to the same person counts as accepted too
      const invitation = trip.sentInvitations.find((inv) => inv.userId.equals(userId));
      if (invitation) invitation.status = 'accepted';
      await trip.save();
    }

    res.status(200).json({ success: true, data: { tripId: trip._id, alreadyMember } });
  } catch (error) {
    console.error('Error joining with invite link:', error);
    res.status(500).json({ success: false, message: 'Error joining the trip', error: error.message });
  }
};
