// An error with an HTTP status. Throw it from a handler wrapped in asyncHandler and
// errorHandler turns it into a JSON response.
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = ApiError;
