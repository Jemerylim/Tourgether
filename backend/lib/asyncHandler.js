// Wraps an async route handler so a thrown error reaches the error middleware
// instead of leaving the request hanging.
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

module.exports = asyncHandler;
