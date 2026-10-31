// Turn an axios error into a message a person can act on.
export function apiErrorMessage(error, fallback) {
  if (!error.response) {
    return "Can't reach the Tourgether server. Check your connection, or that the backend is running, and try again.";
  }
  return error.response.data?.message || `${fallback} (error ${error.response.status}).`;
}
