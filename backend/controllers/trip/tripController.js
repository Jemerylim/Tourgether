const User = require('../../models/User');
const Trip = require('../../models/Trip');
const { sendMail, escapeHtml } = require('../../lib/mailer');
const { loadTripForMember, roleOf } = require('../../services/tripAccess');
const deleteTripData = require('../../services/deleteTripData');
const { PEOPLE, oneLine, invitationLink } = require('../../lib/tripHelpers');

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
    await deleteTripData(trip); // everything planned inside the trip goes with it
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
