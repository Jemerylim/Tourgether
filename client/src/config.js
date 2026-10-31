// Backend base URL. Set VITE_API_URL (e.g. in .env.development) to point the client
// at a different server; deployed builds fall back to the AWS instance.
export const API_URL = import.meta.env.VITE_API_URL || "http://52.44.156.98:5000";
