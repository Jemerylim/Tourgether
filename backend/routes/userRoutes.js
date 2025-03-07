const express = require('express');
const {
  registerUser,
  loginUser,
  getUserDetails,
  updateUser,
  logoutUser,
  checkEmail,
  getIdsByEmails,
  requestPasswordReset,
  resetPassword,
  updateProfile
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const multer = require("multer");

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files to `uploads/` folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Rename file
  },
});

const upload = multer({ storage });

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

// Route to request a password reset link
router.post("/forgot-password", requestPasswordReset);

// Route to reset password (after clicking email link)
router.post("/reset-password", resetPassword);

// Route to update profile picture and bio (protected)
router.put("/update-profile", protect, upload.single("profilePicture"), updateProfile);

// Get user details by ID (protected route)
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error retrieving user details:', error);
    res.status(500).json({ message: 'Failed to retrieve user details' });
  }
});


module.exports = router;
