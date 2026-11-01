const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const cleanEmail = require('../../lib/cleanEmail');

// Function to get user details
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // Exclude password from the response
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Function to update user information
const updateUser = async (req, res) => {
  const { name, password, currentPassword } = req.body;
  const email = req.body.email === undefined ? undefined : cleanEmail(req.body.email);

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // A stolen token alone must not be enough to change how someone signs in
    if (email || password) {
      if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ message: 'Enter your current password to change your email or password' });
      }
    }

    // Update user fields if they are provided
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
      }
      user.password = password; // hashed once, by the model's pre-save hook
    }

    await user.save();
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Function to update user profile
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Ensure name and email are correctly assigned
    if (req.body.name) {
      user.name = req.body.name;
    }

    // Email is deliberately not changed here: that needs the current password (changeEmail)

    // ✅ Ensure bio updates
    if (req.body.bio) {
      user.bio = req.body.bio;
    }

    // Travel styles arrive as a JSON array (the form is multipart, so it's a string there).
    // An empty list clears them; anything unknown is rejected rather than silently dropped.
    if (req.body.travelStyles !== undefined) {
      let styles;
      try {
        styles = typeof req.body.travelStyles === 'string' ? JSON.parse(req.body.travelStyles) : req.body.travelStyles;
      } catch {
        return res.status(400).json({ message: 'Travel styles must be a list' });
      }
      if (!Array.isArray(styles) || styles.some((style) => !User.TRAVEL_STYLES.includes(style))) {
        return res.status(400).json({ message: 'Unknown travel style' });
      }
      styles = [...new Set(styles)];
      if (styles.length > User.MAX_TRAVEL_STYLES) {
        return res.status(400).json({ message: `Pick at most ${User.MAX_TRAVEL_STYLES} travel styles` });
      }
      user.travelStyles = styles;
    }

    // ✅ Ensure profile picture updates
    if (req.file) {
      user.profilePicture = req.file.path;
    }

    // ✅ Save the updated user details
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUserDetails,
  updateUser,
  updateProfile,
};
