const multer = require('multer');
const crypto = require('crypto');

// Allowed upload types and the extension each is saved with
const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save files to `uploads/` folder
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
      return cb(new Error('Profile pictures must be JPEG, PNG or WebP images'));
    }
    cb(null, true);
  },
});

// Turn upload rejections into a 400 instead of a 500
const uploadProfilePicture = (req, res, next) => {
  upload.single('profilePicture')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = { uploadProfilePicture };
