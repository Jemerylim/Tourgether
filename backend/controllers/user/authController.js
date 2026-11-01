const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { config } = require('../../config/env');
const { sendMail, clientLink, escapeHtml } = require('../../lib/mailer');
const cleanEmail = require('../../lib/cleanEmail');

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

const logoutUser = (req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) }); // Clear the cookie
  res.status(200).json({ message: 'Logout successful' });
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

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  requestPasswordReset,
  resetPassword,
};
