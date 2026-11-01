const Poll = require('../models/Poll');
const Trip = require('../models/Trip');
const Event = require('../models/Event');
const { parsePlaceSnapshot } = require('../services/placeSnapshot');

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const TIME_FORMAT = /^\d{2}:\d{2}$/;
const MAX_OPTIONS = 10;

const isMember = (trip, userId) =>
  trip.createdBy.equals(userId) || trip.members.some((member) => member.equals(userId));

// Poll creator and trip organiser can close or delete a poll
const canManage = (poll, trip, userId) => poll.createdBy.equals(userId) || trip.createdBy.equals(userId);

const withVoters = (query) =>
  query.populate('options.votes', 'name profilePicture').populate('createdBy', 'name');

// Load a poll and its trip, checking the user belongs to the trip. Sends the error
// response itself and returns null when the request can't go on.
const loadPoll = async (req, res) => {
  const poll = await Poll.findById(req.params.id);
  if (!poll) {
    res.status(404).json({ success: false, message: 'Poll not found' });
    return null;
  }
  const trip = await Trip.findById(poll.trip);
  if (!trip || !isMember(trip, req.user._id)) {
    res.status(403).json({ success: false, message: 'You are not a member of this trip' });
    return null;
  }
  return { poll, trip };
};

const tripDay = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);

// Checks an event slot is well formed and inside the trip dates. Returns an error message or null.
const slotError = (trip, { date, startTime, endTime }) => {
  if (!DATE_FORMAT.test(date || '') || !TIME_FORMAT.test(startTime || '') || !TIME_FORMAT.test(endTime || '')) {
    return 'A date and start and end times are needed to add the winner to the calendar';
  }
  if (endTime <= startTime) return 'The end time has to be after the start time';
  const start = tripDay(trip.startDate);
  const end = tripDay(trip.endDate);
  if ((start && date < start) || (end && date > end)) {
    return `The date has to be between ${start} and ${end}`;
  }
  return null;
};

const sendError = (res, message, error) => {
  console.error(`${message}:`, error);
  res.status(500).json({ success: false, message, error: error.message });
};

// Create a poll for a trip
exports.createPoll = async (req, res) => {
  const { tripId, question, allowMultiple = false, date = '', startTime = '', endTime = '' } = req.body;
  // Each option is its text, or { text, place } for one of the trip's saved places
  const choices = (req.body.options || [])
    .map((option) => ({
      text: String(option?.text ?? option).trim().slice(0, 100),
      place: typeof option === 'object' ? parsePlaceSnapshot(option.place) : null,
    }))
    .filter((option) => option.text);
  if (choices.some((option) => option.place === false)) {
    return res.status(400).json({ success: false, message: 'One of those places has no location' });
  }
  const options = choices.map((option) => option.text);
  const uniqueOptions = [...new Set(options.map((text) => text.toLowerCase()))];

  if (!tripId || !question || !question.trim()) {
    return res.status(400).json({ success: false, message: 'tripId and question are required' });
  }
  if (options.length < 2 || uniqueOptions.length !== options.length) {
    return res.status(400).json({ success: false, message: 'Add at least two different options' });
  }
  if (options.length > MAX_OPTIONS) {
    return res.status(400).json({ success: false, message: `A poll can have up to ${MAX_OPTIONS} options` });
  }

  try {
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (!isMember(trip, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this trip' });
    }
    // The slot is optional, but if any part is given it has to be valid
    if (date || startTime || endTime) {
      const message = slotError(trip, { date, startTime, endTime });
      if (message) return res.status(400).json({ success: false, message });
    }

    const poll = await Poll.create({
      trip: tripId,
      question: question.trim(),
      options: choices.map(({ text, place }) => ({ text, place: place || null, addedBy: req.user._id, votes: [] })),
      allowMultiple: Boolean(allowMultiple),
      createdBy: req.user._id,
      date,
      startTime,
      endTime,
    });

    const populated = await withVoters(Poll.findById(poll._id));
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    sendError(res, 'Error creating poll', error);
  }
};

// Get all polls for a trip, open ones first, newest first
exports.getPollsByTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripId);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    if (!isMember(trip, req.user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this trip' });
    }

    const polls = await withVoters(Poll.find({ trip: trip._id }).sort({ status: -1, createdAt: -1 }));
    res.status(200).json({ success: true, data: polls });
  } catch (error) {
    sendError(res, 'Error fetching polls', error);
  }
};

// Set the current user's votes. `optionIds` replaces their previous choice;
// an empty list takes their vote back.
exports.votePoll = async (req, res) => {
  const optionIds = (req.body.optionIds || []).map(String);

  try {
    const loaded = await loadPoll(req, res);
    if (!loaded) return;
    const { poll } = loaded;

    if (poll.status !== 'open') {
      return res.status(400).json({ success: false, message: 'This poll is closed' });
    }
    if (!poll.allowMultiple && optionIds.length > 1) {
      return res.status(400).json({ success: false, message: 'This poll allows only one choice' });
    }
    if (optionIds.some((optionId) => !poll.options.id(optionId))) {
      return res.status(400).json({ success: false, message: 'That option is not in this poll' });
    }

    const userId = req.user._id;
    poll.options.forEach((option) => {
      option.votes = option.votes.filter((voter) => !voter.equals(userId));
      if (optionIds.includes(option._id.toString())) option.votes.push(userId);
    });
    await poll.save();

    const populated = await withVoters(Poll.findById(poll._id));
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    sendError(res, 'Error saving vote', error);
  }
};

// Suggest another option on an open poll
exports.addOption = async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) {
    return res.status(400).json({ success: false, message: 'Option text is required' });
  }

  try {
    const loaded = await loadPoll(req, res);
    if (!loaded) return;
    const { poll } = loaded;

    if (poll.status !== 'open') {
      return res.status(400).json({ success: false, message: 'This poll is closed' });
    }
    if (poll.options.length >= MAX_OPTIONS) {
      return res.status(400).json({ success: false, message: `A poll can have up to ${MAX_OPTIONS} options` });
    }
    if (poll.options.some((option) => option.text.toLowerCase() === text.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'That option is already in the poll' });
    }

    poll.options.push({ text, addedBy: req.user._id, votes: [] });
    await poll.save();

    const populated = await withVoters(Poll.findById(poll._id));
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    sendError(res, 'Error adding option', error);
  }
};

// Close a poll. `optionId` names the winner (needed to break a tie; defaults to the
// option with the most votes). With `createEvent`, the winner is added to the trip
// calendar at `date` / `startTime` / `endTime`.
exports.closePoll = async (req, res) => {
  const { optionId, createEvent = false, date, startTime, endTime } = req.body;

  try {
    const loaded = await loadPoll(req, res);
    if (!loaded) return;
    const { poll, trip } = loaded;

    if (!canManage(poll, trip, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the poll creator or trip organiser can close it' });
    }
    if (poll.status !== 'open') {
      return res.status(400).json({ success: false, message: 'This poll is already closed' });
    }

    let winner;
    if (optionId) {
      winner = poll.options.id(optionId);
      if (!winner) {
        return res.status(400).json({ success: false, message: 'That option is not in this poll' });
      }
    } else {
      const mostVotes = Math.max(...poll.options.map((option) => option.votes.length));
      const leaders = poll.options.filter((option) => option.votes.length === mostVotes);
      if (mostVotes === 0 || leaders.length > 1) {
        return res.status(409).json({ success: false, message: 'There is no clear winner, so pick one to close the poll' });
      }
      [winner] = leaders;
    }

    let event = null;
    if (createEvent) {
      const slot = { date, startTime, endTime };
      const message = slotError(trip, slot);
      if (message) return res.status(400).json({ success: false, message });

      event = await Event.create({
        trip: trip._id,
        title: winner.text,
        description: `Chosen by poll: ${poll.question}`,
        place: winner.place || null,
        ...slot,
      });
      poll.event = event._id;
    }

    poll.status = 'closed';
    poll.winningOption = winner._id;
    poll.closedAt = new Date();
    await poll.save();

    const populated = await withVoters(Poll.findById(poll._id));
    res.status(200).json({ success: true, data: { poll: populated, event } });
  } catch (error) {
    sendError(res, 'Error closing poll', error);
  }
};

// Delete a poll. Any event it created stays on the calendar.
exports.deletePoll = async (req, res) => {
  try {
    const loaded = await loadPoll(req, res);
    if (!loaded) return;
    const { poll, trip } = loaded;

    if (!canManage(poll, trip, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the poll creator or trip organiser can delete it' });
    }

    await poll.deleteOne();
    res.status(200).json({ success: true, message: 'Poll deleted successfully' });
  } catch (error) {
    sendError(res, 'Error deleting poll', error);
  }
};
