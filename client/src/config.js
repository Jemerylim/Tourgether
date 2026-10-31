// Backend base URL, set with VITE_API_URL in the .env files:
//   .env.development -> `npm run dev`, .env.production -> `npm run build`.
// Left empty, requests go to the same host that serves the app (the nginx /api proxy).
export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Unsplash access key for trip cover photos. Keep it in the untracked client/.env.local;
// without it trips simply show a plane icon instead of a photo.
export const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || "";

// Full URL of a file the backend serves, such as a profile picture ("uploads/x.jpg").
export const assetUrl = (path) => (path ? `${API_URL}/${path}` : undefined);
