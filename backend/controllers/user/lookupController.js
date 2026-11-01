const User = require('../../models/User');
const cleanEmail = require('../../lib/cleanEmail');

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
  checkEmail,
  lookupUser,
  getIdsByEmails,
  getUserById,
};
