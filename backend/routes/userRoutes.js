const express = require('express');
const {
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
  updateProfile,
  changeEmail,
  changePassword,
  deleteAccount,
  getUserById
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadProfilePicture } = require('../middlewares/upload');

const router = express.Router();

// Route for user registration
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

// Route to check if an email is registered
router.get('/check-email', protect, checkEmail);

// Find a registered user by email or name (trip invitations; signed-in users only)
router.get('/lookup', protect, lookupUser);

// Route to get user profile (protected)
router.get('/profile', protect, getUserDetails);

// Route to update user profile (protected)
router.put('/profile', protect, updateUser);

// Route to Logout and remove tokens
router.put('/logout', protect, logoutUser);

//Route to get all ID from emails in trip creation
router.post("/get-ids-by-emails", protect, getIdsByEmails);

// Route to request a password reset link
router.post("/forgot-password", requestPasswordReset);

// Route to reset password (after clicking email link)
router.post("/reset-password", resetPassword);

// Account changes that ask for the current password (protected)
router.put('/email', protect, changeEmail);
router.put('/password', protect, changePassword);
router.delete('/me', protect, deleteAccount);

// Route to update profile picture and bio (protected)
router.put("/update-profile", protect, uploadProfilePicture, updateProfile);

// Get user details by ID (protected route)
router.get('/:id', protect, getUserById);

module.exports = router;
