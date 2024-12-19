const Trip = require('../models/Trip'); // Assuming Trip model is in the models folder
const User = require('../models/User'); // Assuming User model is in the same folder

// Create a new trip
exports.createTrip = async (req, res) => {
  const { name, members, startDate, endDate, description } = req.body;
  const createdBy = req.user._id; // Assuming the authenticated user's ID is available in req.user

  try {
    // Validate members
    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      return res.status(400).json({ message: 'One or more members are not valid users' });
    }

    // Create a new trip
    const trip = await Trip.create({
      name,
      members,
      createdBy,
      description,
      startDate,
      endDate,
    });

    res.status(201).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all trips
exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('members', 'name email') // Populate members with name and email
      .populate('createdBy', 'name email'); // Populate creator's name and email

    res.status(200).json({
      success: true,
      data: trips,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get a single trip by ID
exports.getTrip = async (req, res) => {
  const { id } = req.params;

  try {
    const trip = await Trip.findById(id)
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update a trip
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const { name, members, description, startDate, endDate } = req.body;

  try {
    // Validate members if they are being updated
    if (members) {
      const validMembers = await User.find({ _id: { $in: members } });
      if (validMembers.length !== members.length) {
        return res.status(400).json({ message: 'One or more members are not valid users' });
      }
    }

    const trip = await Trip.findByIdAndUpdate(
      id,
      { name, members, description, startDate, endDate },
      { new: true, runValidators: true }
    )
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    res.status(200).json({
      success: true,
      data: trip,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete a trip
exports.deleteTrip = async (req, res) => {
  const { id } = req.params;

  try {
    const trip = await Trip.findByIdAndDelete(id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trip deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get all trips for a specific user
exports.getTripsByUser = async (req, res) => {
  const { userId } = req.params;

  try {
    // Find trips where the user is a member or the creator
    const trips = await Trip.find({
      $or: [{ members: userId }, { createdBy: userId }],
    })
      .populate('members', 'name email') // Populate members with name and email
      .populate('createdBy', 'name email'); // Populate creator's name and email

    if (trips.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No trips found for this user',
      });
    }

    res.status(200).json({
      success: true,
      data: trips,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
