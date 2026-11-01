const crypto = require('crypto');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Poll = require('../models/Poll');
const Event = require('../models/Event');
const UserTripDate = require('../models/UserTripDate');
const Expense = require('../models/Expense');
const ChecklistItem = require('../models/ChecklistItem');
const Place = require('../models/Place');
const mongoose = require('mongoose');
const { sendMail, clientLink, escapeHtml } = require('../utils/mailer');
const { loadTripForMember, roleOf } = require('../utils/tripAccess');

// Email subjects must stay on one line
const oneLine = (text) => String(text).replace(/[\r\n]+/g, ' ');

// Who a trip's members and organiser show up as
const PEOPLE = 'name email profilePicture';

const invitationLink = (tripId, userId) => clientLink(`/trip/${tripId}/accept`, { userId });

// Create a new trip
exports.createTrip = async (req, res) => {
  const { name, members = [], startDate, endDate, description } = req.body;
  const createdBy = req.user._id;

  // Members are optional: a trip can be created solo and people invited later.
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'A trip name is required' });
  }
  if (!Array.isArray(members)) {
    return res.status(400).json({ message: 'Members must be a list of user IDs' });
  }

  try {
    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      return res.status(400).json({ message: 'One or more members are not valid users' });
    }

    const sentInvitations = validMembers.map((member) => ({
      userId: member._id,
      status: 'pending',
    }));

    // Invitees become members when they accept
    const trip = await Trip.create({
      name,
      members: [],
      sentInvitations,
      createdBy,
      description,
      startDate,
      endDate,
    });

    const emailPromises = validMembers.map((member) => {
      const mailOptions = {
        to: member.email,
        subject: `Invitation to join the trip "${oneLine(name)}"`,
        html: `
          <p>Hi ${escapeHtml(member.name)},</p>
          <p>You have been invited to join the trip "<strong>${escapeHtml(name)}</strong>".</p>
          <p>Visit your dashboard to see more details or <a href="${invitationLink(trip._id, member._id)}">accept the invitation here</a>.</p>
          <p>Regards,<br>The Tourgether Team</p>
        `,
      };
      return sendMail(mailOptions);
    });

    // The trip already exists, so a failed email (for example missing mail credentials)
    // must not make the request fail. Report how many could not be sent instead.
    const emailResults = await Promise.allSettled(emailPromises);
    const failedEmails = emailResults.filter((result) => result.status === 'rejected');
    failedEmails.forEach((result) =>
      console.error('Invitation email failed:', result.reason && result.reason.message)
    );

    res.status(201).json({ success: true, data: trip, emailsFailed: failedEmails.length });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ success: false, message: 'Error creating trip', error: error.message });
  }
};

// Get the trips the signed-in user organises or belongs to
exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ $or: [{ createdBy: req.user._id }, { members: req.user._id }] })
      .populate('members', PEOPLE)
      .populate('createdBy', PEOPLE);
    res.status(200).json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, message: 'Error fetching trips', error: error.message });
  }
};

// Get a single trip by ID (members only)
exports.getTrip = async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await loadTripForMember(req, res, id);
    if (!trip) return;
    // Worked out before populating, while createdBy and members are still plain IDs.
    // It lets the client hide what the user can't do; the API still enforces it.
    const myRole = roleOf(trip, req.user._id);
    await trip.populate([
      { path: 'members', select: PEOPLE },
      { path: 'createdBy', select: PEOPLE },
    ]);
    res.status(200).json({ success: true, data: { ...trip.toObject(), myRole } });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ success: false, message: 'Error fetching trip', error: error.message });
  }
};

// Update a trip (organiser only). Membership never changes here: it goes through
// invitations, invite links and removeMember.
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  try {
    const found = await Trip.findById(id);
    if (!found) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (!found.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the trip organiser can edit this trip' });
    }

    const updates = {};
    ['name', 'description', 'startDate', 'endDate'].forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Locking dates from the heatmap sends both; the trip can't end before it starts
    // (sending null for both unlocks them: the trip goes back to "dates to be decided")
    if (updates.startDate !== undefined || updates.endDate !== undefined) {
      const start = updates.startDate === undefined ? found.startDate : updates.startDate;
      const end = updates.endDate === undefined ? found.endDate : updates.endDate;
      if (Boolean(start) !== Boolean(end)) {
        return res.status(400).json({ success: false, message: 'A trip needs both a start and an end date, or neither' });
      }
      if (start && new Date(start) > new Date(end)) {
        return res.status(400).json({ success: false, message: 'The trip cannot end before it starts' });
      }
    }

    const trip = await Trip.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
      .populate('members', PEOPLE)
      .populate('createdBy', PEOPLE);
    res.status(200).json({ success: true, data: trip });
  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ success: false, message: 'Error updating trip', error: error.message });
  }
};

// Delete a trip
exports.deleteTrip = async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (!trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the trip organiser can delete this trip' });
    }
    await trip.deleteOne();
    // Everything planned inside the trip goes with it
    await Promise.all([
      Poll.deleteMany({ trip: trip._id }),
      Event.deleteMany({ trip: trip._id }),
      UserTripDate.deleteMany({ tripId: trip._id }),
      Expense.deleteMany({ trip: trip._id }),
      ChecklistItem.deleteMany({ trip: trip._id }),
      Place.deleteMany({ trip: trip._id }),
    ]);
    res.status(200).json({ success: true, message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ success: false, message: 'Error deleting trip', error: error.message });
  }
};

// The signed-in user's trips, plus the invitations still waiting on their answer.
// A pending or declined invitation keeps the trip off their list, even when an older
// trip already lists them as a member.
exports.getMyTrips = async (req, res) => {
  const userId = req.user._id;
  try {
    const found = await Trip.find({
      $or: [{ createdBy: userId }, { members: userId }, { 'sentInvitations.userId': userId }],
    })
      .populate('members', PEOPLE)
      .populate('createdBy', PEOPLE);

    const trips = [];
    const invitations = [];
    found.forEach((trip) => {
      const status = trip.sentInvitations.find((inv) => inv.userId.equals(userId))?.status;
      const isMember = trip.members.some((member) => member?._id.equals(userId));
      if (trip.createdBy?._id.equals(userId) || status === 'accepted' || (isMember && !status)) {
        trips.push(trip);
      } else if (status === 'pending') {
        invitations.push({
          _id: trip._id,
          name: trip.name,
          startDate: trip.startDate,
          endDate: trip.endDate,
          organiser: trip.createdBy?.name,
          memberCount: trip.members.filter((member) => member && !member._id.equals(userId)).length + 1,
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        user: { _id: req.user._id, name: req.user.name, profilePicture: req.user.profilePicture },
        trips,
        invitations,
      },
    });
  } catch (error) {
    console.error('Error fetching user trips:', error);
    res.status(500).json({ success: false, message: 'Error fetching user trips', error: error.message });
  }
};

// Accept trip invitation
exports.acceptInvitation = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;
  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    const invitation = trip.sentInvitations.find((inv) => inv.userId.equals(userId));
    if (!invitation) return res.status(404).json({ message: 'Invitation not found.' });
    if (invitation.status === 'accepted') return res.status(400).json({ message: 'Invitation already accepted.' });

    invitation.status = 'accepted';
    if (!trip.members.some((member) => member.equals(userId))) trip.members.push(userId);
    await trip.save();

    res.status(200).json({ success: true, data: trip });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ message: 'Failed to accept invitation.' });
  }
};

// Decline trip invitation
exports.declineInvitation = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user._id;

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    const invitation = trip.sentInvitations.find((inv) => inv.userId.equals(userId));
    if (!invitation) return res.status(404).json({ message: 'Invitation not found.' });

    if (invitation.status === 'declined') {
      return res.status(400).json({ message: 'Invitation already declined.' });
    }

    invitation.status = 'declined';
    // Older trips added invitees as members straight away
    trip.members = trip.members.filter((member) => !member.equals(userId));
    await trip.save();

    res.status(200).json({ success: true, message: 'Invitation declined.', data: trip });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({ message: 'Failed to decline invitation.' });
  }
};

// Check invitation status
exports.checkInvitationStatus = async (req, res) => {
  const { tripId } = req.params;
  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    // Only the signed-in user's own invitation
    const invitation = trip.sentInvitations.find((inv) => inv.userId.equals(req.user._id));
    if (!invitation) return res.status(404).json({ status: 'not-invited' });

    res.status(200).json({ status: invitation.status });
  } catch (error) {
    console.error('Error checking invitation status:', error);
    res.status(500).json({ message: 'Failed to check invitation status.' });
  }
};

// Send invites to trip
exports.sendInviteToMember = async (req, res) => {
  const { tripId } = req.params;
  const { email } = req.body;

  if (!email || typeof email !== 'string') return res.status(400).json({ message: 'Email is required.' });

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    if (!trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized to invite members.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (trip.members.includes(user._id)) {
      return res.status(400).json({ message: 'User is already a member.' });
    }

    trip.sentInvitations.push({ userId: user._id, status: 'pending' });

    const mailOptions = {
      to: user.email,
      subject: `Invitation to join the trip "${oneLine(trip.name)}"`,
      html: `
        <p>Hi ${escapeHtml(user.name)},</p>
        <p>You have been invited to join the trip "<strong>${escapeHtml(trip.name)}</strong>".</p>
        <p>Visit your dashboard to see more details or <a href="${invitationLink(trip._id, user._id)}">accept the invitation here</a>.</p>
        <p>Regards,<br>The Tourgether Team</p>
      `,
    };

    await sendMail(mailOptions);
    await trip.save();

    res.status(200).json({ message: 'Invitation sent successfully.' });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ message: 'Failed to send invitation.' });
  }
};

// Delete member from trip
exports.removeMember = async (req, res) => {
  const { tripId, memberId } = req.params;

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    if (!trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized to remove members.' });
    }

    trip.members = trip.members.filter((member) => !member.equals(memberId));
    trip.memberRoles = trip.memberRoles.filter((entry) => !entry.user.equals(memberId));
    trip.sentInvitations = trip.sentInvitations.filter((inv) => !inv.userId.equals(memberId));

    await trip.save();
    res.status(200).json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Failed to remove member.' });
  }
};

// Make a member an editor or a viewer (organiser only). The organiser's own role is fixed.
exports.setMemberRole = async (req, res) => {
  const { tripId, memberId } = req.params;
  const { role } = req.body;

  if (!['editor', 'viewer'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be "editor" or "viewer"' });
  }
  if (!mongoose.isValidObjectId(memberId)) {
    return res.status(400).json({ success: false, message: 'That is not a valid member' });
  }

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (!trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the trip organiser can change roles' });
    }
    if (trip.createdBy.equals(memberId)) {
      return res.status(400).json({ success: false, message: "The organiser's role can't be changed" });
    }
    if (!trip.members.some((member) => member.equals(memberId))) {
      return res.status(404).json({ success: false, message: 'That person is not a member of this trip' });
    }

    const entry = trip.memberRoles.find((item) => item.user.equals(memberId));
    if (entry) entry.role = role;
    else trip.memberRoles.push({ user: memberId, role });
    await trip.save();

    res.status(200).json({ success: true, data: { memberRoles: trip.memberRoles } });
  } catch (error) {
    console.error('Error changing role:', error);
    res.status(500).json({ success: false, message: 'Failed to change role' });
  }
};

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
