const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require("crypto");
const { config } = require('../config/env');
const { sendMail, clientLink, escapeHtml } = require('../lib/mailer');
const confirmPassword = require('../services/confirmPassword');
const deleteTripData = require('../services/deleteTripData');
const Trip = require('../models/Trip');
const fs = require('fs');
const path = require('path');

// Emails go straight into Mongo filters, so only plain strings are accepted. An object
// such as { "$regex": "^a" } would otherwise act as a query operator.
const cleanEmail = (value) => (typeof value === 'string' ? value.trim() : null);

// Function to handle user registration
const registerUser = async (req, res) => {
  const { name, password } = req.body;
  const email = cleanEmail(req.body.email);

  try {
    if (!email || typeof password !== 'string' || typeof name !== 'string') {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Validate password length
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    // Create a new user
    const newUser = new User({
      name,
      email,
      password,
    });

    // Save the user to the database
    await newUser.save();
    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (error) {
    if (error.name === "ValidationError") {
      // Extract validation error messages
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: "Validation failed", errors: messages });
    }

    res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Function to handle user login
const loginUser = async (req, res) => {
  const { password } = req.body;
  const email = cleanEmail(req.body.email);

  try {
    if (!email || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
          return res.status(401).json({ message: "Invalid credentials" });
      }

    // Generate a JWT token for authentication
    const token = jwt.sign({ id: user._id }, config.jwtSecret, { expiresIn: '1h' });

    // Set the token as an HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.isProduction, // Use HTTPS in production
      sameSite: 'strict', // Prevent CSRF
      maxAge: 3600000, // 1 hour
    });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


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

const logoutUser = (req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) }); // Clear the cookie
  res.status(200).json({ message: 'Logout successful' });
};

const checkEmail = async (req, res) => {
  const email = cleanEmail(req.query.email); // Passed as a query parameter
  if (!email) {
    return res.status(400).json({ message: 'An email is required' });
  }
  try {
    // Check if the email exists in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not registered' });
    }

    res.status(200).json({ message: 'Email is registered', registered: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Find one registered user by email or by name, for inviting people to a trip.
// Names are not unique, so a name that matches several people is rejected (409).
const lookupUser = async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ message: 'Enter an email or a name.' });
  }

  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = new RegExp(`^${escaped}$`, 'i');
    const byEmail = q.includes('@');
    const users = await User.find({ ...(byEmail ? { email: exact } : { name: exact }), deletedAt: null })
      .select('_id name email')
      .limit(3);

    if (users.length === 0) {
      return res.status(404).json({
        message: byEmail ? 'Email not registered' : `Nobody is registered with the name "${q}".`,
      });
    }
    if (users.length > 1) {
      return res.status(409).json({
        message: `More than one person is named "${q}". Invite them by email instead.`,
      });
    }

    res.status(200).json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getIdsByEmails = async (req, res) => {
  const { emails } = req.body;

  if (!Array.isArray(emails) || !emails.every((email) => typeof email === 'string')) {
    return res.status(400).json({ message: "Emails must be an array of strings." });
  }

  try {
    const users = await User.find({ email: { $in: emails } }).select("_id email");
    const userIds = users.map((user) => user._id);

    // Check if any emails were not found
    const missingEmails = emails.filter(
      (email) => !users.some((user) => user.email === email)
    );

    if (missingEmails.length > 0) {
      return res.status(400).json({
        message: `The following emails are not registered: ${missingEmails.join(", ")}`,
      });
    }

    res.status(200).json({ userIds });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Function to handle password reset request
const requestPasswordReset = async (req, res) => {
  const email = cleanEmail(req.body.email);

  try {
    if (!email) {
      return res.status(400).json({ message: "Please enter a registered email." });
    }

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email not found. Please enter a registered email." });
    }

    // Generate a unique reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Store only the hashed token in the database
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour
    await user.save();

    // Create password reset link
    const resetURL = clientLink('/reset-password', { token: resetToken, email });

    const mailOptions = {
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <p>Hi ${escapeHtml(user.name)},</p>
        <p>You have requested to reset your password.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetURL}" 
          style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Regards,<br>The Tourgether Team</p>
      `,
    };

    await sendMail(mailOptions);

    res.json({ message: "A password reset link has been sent to your email." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
};

// Function to handle password reset (AFTER clicking the reset link)
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  const email = cleanEmail(req.body.email);

  try {
    if (!email || typeof token !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({ message: "Invalid email or token." });
    }


    // Compare provided token with stored hashed token
    const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isMatch) {
      return res.status(400).json({ message: "Token is invalid or has expired." });
    }

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({ message: "Token has expired. Please request a new one." });
    }

    // Assign new password (middleware will hash it before saving)
    user.password = newPassword;

    // Clear reset token
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    // Fetch updated user data to confirm the update
    const updatedUser = await User.findOne({ email });

    res.status(200).json({ message: "Password successfully reset. You can now log in." });

  } catch (error) {

    // Handle validation errors
    if (error.name === "ValidationError") {
        const messages = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({ message: "Validation failed", errors: messages });
    }

    // Handle other errors
    res.status(500).json({ message: "Server error. Try again later." });
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

// Function to get a user's public details by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email');
    if (!user || user.deletedAt) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error retrieving user details:', error);
    res.status(500).json({ message: 'Failed to retrieve user details' });
  }
};

module.exports = {
  getUserById,
  changeEmail,
  changePassword,
  deleteAccount,
  registerUser,
  loginUser,
  getUserDetails,
  updateUser,
  logoutUser,
  checkEmail,
  lookupUser,
  getIdsByEmails,
  requestPasswordReset,
  resetPassword,
  updateProfile
};
