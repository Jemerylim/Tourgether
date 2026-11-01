const { clientLink } = require('./mailer');

// Email subjects must stay on one line
const oneLine = (text) => String(text).replace(/[\r\n]+/g, ' ');

// Who a trip's members and organiser show up as
const PEOPLE = 'name email profilePicture travelStyles';

const invitationLink = (tripId, userId) => clientLink(`/trip/${tripId}/accept`, { userId });

module.exports = { oneLine, PEOPLE, invitationLink };
