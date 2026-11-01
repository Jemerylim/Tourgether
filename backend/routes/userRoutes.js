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
  updateProfile
} = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const multer = require("multer");
const crypto = require("crypto");

const router = express.Router();

// Allowed upload types and the extension each is saved with
const IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save files to `uploads/` folder
  },
  // The client's file name is never used: the extension comes from the checked MIME type
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${IMAGE_TYPES[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    // Images only, so an uploaded .html or .svg can never run script on our origin
    if (!IMAGE_TYPES[file.mimetype]) {
      return cb(new Error("Profile pictures must be JPEG, PNG or WebP images"));
    }
    cb(null, true);
  },
});

// Turn upload rejections into a 400 instead of a 500
const uploadProfilePicture = (req, res, next) => {
  upload.single("profilePicture")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

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

// Route to update profile picture and bio (protected)
router.put("/update-profile", protect, uploadProfilePicture, updateProfile);

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
