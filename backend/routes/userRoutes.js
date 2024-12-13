const express = require('express');
const {
  registerUser,
  loginUser,
  getUserDetails,
  updateUser,
  logoutUser,
  checkEmail, 
  getIdsByEmails
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route for user registration
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

// Route to check if an email is registered
router.get('/check-email', checkEmail); // New route added here

// Route to get user profile (protected)
router.get('/profile', protect, getUserDetails);

// Route to update user profile (protected)
router.put('/profile', protect, updateUser);

// Route to Logout and remove tokens
router.put('/logout', protect, logoutUser);

//Route to get all ID from emails in trip creation
router.post("/get-ids-by-emails", getIdsByEmails);

module.exports = router;
