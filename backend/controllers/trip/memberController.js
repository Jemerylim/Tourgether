const mongoose = require('mongoose');
const Trip = require('../../models/Trip');

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
