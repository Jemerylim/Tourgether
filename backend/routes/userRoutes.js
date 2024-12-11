const express = require('express');
const {
  registerUser,
  loginUser,
  getUserDetails,
  updateUser,
  logoutUser
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Route for user registration
router.post('/register', registerUser);

// Route for user login
router.post('/login', loginUser);

// Route to get user profile (protected)
router.get('/profile', protect, getUserDetails);

// Route to update user profile (protected)
router.put('/profile', protect, updateUser);

// Route to Logout and remove tokens
router.put('/logout', protect, logoutUser);

module.exports = router;
