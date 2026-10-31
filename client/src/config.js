// Backend base URL. Set VITE_API_URL (e.g. in .env.development) to point the client
// at a different server; deployed builds fall back to the AWS instance.
export const API_URL = import.meta.env.VITE_API_URL || "http://52.44.156.98:5000";

// Unsplash access key for trip cover photos. Keep it in the untracked client/.env.local;
// without it trips simply show a plane icon instead of a photo.
export const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || "";
