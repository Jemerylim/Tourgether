const Trip = require('../models/Trip');
const User = require('../models/User');

// Create a new trip
exports.createTrip = async (req, res) => {
  const { name, members, startDate, endDate, description } = req.body;
  const createdBy = req.user._id;

  if (!name || !members || members.length === 0) {
    return res.status(400).json({ message: 'Name and members are required to create a trip' });
  }

  try {
    // Validate members
    const validMembers = await User.find({ _id: { $in: members } });
    if (validMembers.length !== members.length) {
      return res.status(400).json({ message: 'One or more members are not valid users' });
    }

    // Create the trip
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
    console.error('Error creating trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating trip',
      error: error.message,
    });
  }
};

// Get all trips
exports.getTrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      data: trips,
    });
  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trips',
      error: error.message,
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
    console.error('Error fetching trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip',
      error: error.message,
    });
  }
};

// Update a trip
exports.updateTrip = async (req, res) => {
  const { id } = req.params;
  const { name, members, description, startDate, endDate } = req.body;

  try {
    // Validate members if provided
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
    console.error('Error updating trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating trip',
      error: error.message,
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
    console.error('Error deleting trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting trip',
      error: error.message,
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
      .populate('members', 'name email')
      .populate('createdBy', 'name email');

    // Return 200 with an empty array if no trips are found
    res.status(200).json({
      success: true,
      data: trips,
    });
  } catch (error) {
    console.error('Error fetching user trips:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user trips',
      error: error.message,
    });
  }
};
