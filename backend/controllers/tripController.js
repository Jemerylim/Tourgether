const nodemailer = require('nodemailer');
const Trip = require('../models/Trip');
const User = require('../models/User');
const mongoose = require('mongoose');

// For sending email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Create a new trip
exports.createTrip = async (req, res) => {
  const { name, members, startDate, endDate, description } = req.body;
  const createdBy = req.user._id;

  if (!name || !members || members.length === 0) {
    return res.status(400).json({ message: 'Name and members are required to create a trip' });
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

    const trip = await Trip.create({
      name,
      members,
      sentInvitations,
      createdBy,
      description,
      startDate,
      endDate,
    });

    const emailPromises = validMembers.map((member) => {
      const invitationLink = `http://localhost:5173/trip/${trip._id}/accept?userId=${member._id}`;
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: member.email,
        subject: `Invitation to join the trip "${name}"`,
        html: `
          <p>Hi ${member.name},</p>
          <p>You have been invited to join the trip "<strong>${name}</strong>".</p>
          <p>Visit your dashboard to see more details or <a href="${invitationLink}">accept the invitation here</a>.</p>
          <p>Regards,<br>The Tourgether Team</p>
        `,
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(emailPromises);

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ success: false, message: 'Error creating trip', error: error.message });
  }
};

// Get all trips
exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('members', 'name email')
      .populate('createdBy', 'name email');
    res.status(200).json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ success: false, message: 'Error fetching trips', error: error.message });
  }
};

// Get a single trip by ID
exports.getTrip = async (req, res) => {
  const { id } = req.params;
  try {
    const trip = await Trip.findById(id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    res.status(200).json({ success: true, data: trip });
  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ success: false, message: 'Error fetching trip', error: error.message });
  }
};

// Update a trip
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const { name, members, description, startDate, endDate } = req.body;
  try {
    const trip = await Trip.findByIdAndUpdate(
      id,
      { name, members, description, startDate, endDate },
      { new: true, runValidators: true }
    ).populate('members', 'name email').populate('createdBy', 'name email');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
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
    const trip = await Trip.findByIdAndDelete(id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    res.status(200).json({ success: true, message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Error deleting trip:', error);
    res.status(500).json({ success: false, message: 'Error deleting trip', error: error.message });
  }
};

// Get all trips for a specific user
exports.getTripsByUser = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: 'Invalid user ID format.' });
  }
  try {
    const trips = await Trip.find({
      $or: [
        { createdBy: userId },
        { sentInvitations: { $elemMatch: { userId, status: 'accepted' } } }
      ],
    }).populate('members', 'name email').populate('createdBy', 'name email');
    res.status(200).json({ success: true, data: trips });
  } catch (error) {
    console.error('Error fetching user trips:', error);
    res.status(500).json({ success: false, message: 'Error fetching user trips', error: error.message });
  }
};

// Accept trip invitation
exports.acceptInvitation = async (req, res) => {
  const { tripId } = req.params;
  const { userId } = req.body;
  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    const invitation = trip.sentInvitations.find((inv) => inv.userId.equals(userId));
    if (!invitation) return res.status(404).json({ message: 'Invitation not found.' });
    if (invitation.status === 'accepted') return res.status(400).json({ message: 'Invitation already accepted.' });

    invitation.status = 'accepted';
    trip.members.push(userId);
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
  const { userId } = req.body; // Ensure you are extracting from req.body

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    const invitation = trip.sentInvitations.find((inv) => inv.userId.equals(userId));
    if (!invitation) return res.status(404).json({ message: 'Invitation not found.' });

    if (invitation.status === 'declined') {
      return res.status(400).json({ message: 'Invitation already declined.' });
    }

    invitation.status = 'declined';
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
  const { userId } = req.query;
  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });

    const invitation = trip.sentInvitations.find((inv) => inv.userId.equals(userId));
    if (!invitation) return res.status(404).json({ status: 'not-invited' });

    res.status(200).json({ status: invitation.status });
  } catch (error) {
    console.error('Error checking invitation status:', error);
    res.status(500).json({ message: 'Failed to check invitation status.' });
  }
};

// Send invites to trip
exports.sendInvites = async (req, res) => {
  const { emails } = req.body;
  const { tripId } = req.params;

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    // Email sending logic (using nodemailer)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL, // Ensure you have environment variables set for these
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    for (const email of emails) {
      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: `You're invited to join ${trip.name}!`,
        text: `Hello, you've been invited to join the trip "${trip.name}". Please log in to view the details.`,
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ message: 'Invitations sent successfully' });
  } catch (error) {
    console.error('Error sending invites:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Remove member from trip
exports.removeMember = async (req, res) => {
  const { tripId, memberId } = req.params;

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found." });

    trip.members = trip.members.filter((member) => member.toString() !== memberId);
    await trip.save();

    res.status(200).json({ success: true, message: "Member removed." });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove member." });
  }
};
