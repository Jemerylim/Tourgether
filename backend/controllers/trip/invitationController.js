const User = require('../../models/User');
const Trip = require('../../models/Trip');
const { sendMail, escapeHtml } = require('../../lib/mailer');
const { oneLine, invitationLink } = require('../../lib/tripHelpers');

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
