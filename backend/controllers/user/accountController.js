const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const User = require('../../models/User');
const Trip = require('../../models/Trip');
const confirmPassword = require('../../services/confirmPassword');
const deleteTripData = require('../../services/deleteTripData');
const cleanEmail = require('../../lib/cleanEmail');

// Change the sign-in email. Needs the current password.
const changeEmail = async (req, res) => {
  try {
    const email = cleanEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ message: 'Enter the new email address' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!(await confirmPassword(res, user, req.body.currentPassword))) return;

    if (email === user.email) {
      return res.status(400).json({ message: "That's already your email" });
    }
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    user.email = email;
    await user.save();
    res.status(200).json({ message: 'Email updated', user });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please add a valid email' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Change the password. Needs the current one.
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ message: 'The new password must be at least 8 characters long' });
    }
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!(await confirmPassword(res, user, currentPassword))) return;

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'Pick a password you are not using already' });
    }

    user.password = newPassword; // hashed once, by the model's pre-save hook
    await user.save();
    res.status(200).json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete the account. Needs the password. Trips only the user is on are deleted; a trip with
// other people on it blocks deletion (there is no way to hand a trip over yet). The user
// record itself is anonymised rather than removed, so expenses and polls on trips they
// shared keep adding up for everyone else.
const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!(await confirmPassword(res, user, req.body.password))) return;

    const owned = await Trip.find({ createdBy: user._id });
    const shared = owned.filter(
      (trip) =>
        trip.members.some((member) => !member.equals(user._id)) ||
        trip.sentInvitations.some((invite) => invite.status === 'pending')
    );
    if (shared.length > 0) {
      return res.status(409).json({
        message: 'Other people are on some of your trips. Delete those trips first, or ask them to leave.',
        trips: shared.map((trip) => trip.name),
      });
    }

    for (const trip of owned) {
      await deleteTripData(trip);
    }
    // Invitations they never answered; trips they joined keep them as a (former) member
    await Trip.updateMany(
      { 'sentInvitations.userId': user._id, members: { $ne: user._id } },
      { $pull: { sentInvitations: { userId: user._id } } }
    );

    const photo = user.profilePicture;
    user.name = 'Former traveller';
    user.email = `deleted.${user._id}@deleted.invalid`;
    user.password = crypto.randomBytes(32).toString('hex'); // hashed by the pre-save hook; nobody knows it
    user.bio = undefined;
    user.travelStyles = [];
    user.profilePicture = 'uploads/profile-pic.jpg';
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.deletedAt = new Date();
    await user.save({ validateBeforeSave: false }); // the placeholder email isn't a normal address

    // Remove their uploaded photo (never the shared default)
    if (photo && photo !== 'uploads/profile-pic.jpg' && /^uploads[\\/][\w.-]+$/.test(photo)) {
      fs.unlink(path.join(__dirname, '..', photo), () => {});
    }

    res.status(200).json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  changeEmail,
  changePassword,
  deleteAccount,
};
