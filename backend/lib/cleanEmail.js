// Emails go straight into Mongo filters, so only plain strings are accepted. An object
// such as { "$regex": "^a" } would otherwise act as a query operator.
const cleanEmail = (value) => (typeof value === 'string' ? value.trim() : null);

module.exports = cleanEmail;
