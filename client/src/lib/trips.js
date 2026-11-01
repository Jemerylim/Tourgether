import axios from "../api/client";
import { UNSPLASH_KEY } from "../config";

const DAY_MS = 24 * 60 * 60 * 1000;

// Midnight in the visitor's timezone, so "today" doesn't depend on the time of day.
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (from, to) => Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);

// "28 Mar 2027" everywhere, so dates read the same whatever the visitor's locale
export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "TBD";

export const isPast = (trip) => Boolean(trip.endDate) && daysBetween(new Date(), trip.endDate) < 0;

const time = (date, fallback) => (date ? new Date(date).getTime() : fallback);

// Upcoming: soonest start first, undated trips last. Past: most recently finished first.
export const splitTrips = (trips) => {
  const upcoming = trips
    .filter((trip) => !isPast(trip))
    .sort((a, b) => time(a.startDate, Infinity) - time(b.startDate, Infinity));
  const past = trips
    .filter(isPast)
    .sort((a, b) => time(b.endDate, 0) - time(a.endDate, 0));
  return { upcoming, past };
};

// Started (today counts) and not finished yet
export const isHappeningNow = (trip) =>
  Boolean(trip.startDate) && !isPast(trip) && daysBetween(trip.startDate, new Date()) >= 0;

// Length of the trip in days, counting both ends, or null without both dates
export const tripLength = (trip) =>
  trip.startDate && trip.endDate ? daysBetween(trip.startDate, trip.endDate) + 1 : null;

// Which day of the trip today is (1 on the first day)
export const dayOfTrip = (trip) => daysBetween(trip.startDate, new Date()) + 1;

export const countdownLabel = (trip) => {
  if (isPast(trip)) return null;
  if (!trip.startDate) return "Dates to be decided";
  const days = daysBetween(new Date(), trip.startDate);
  if (days > 1) return `Departs in ${days} days`;
  if (days === 1) return "Departs tomorrow";
  if (days === 0) return "Departs today";
  return "Happening now";
};

const readCache = (key) => {
  try {
    return sessionStorage.getItem(key) || undefined;
  } catch {
    return undefined;
  }
};

const writeCache = (key, url) => {
  try {
    sessionStorage.setItem(key, url);
  } catch {
    // Storage can be unavailable (private windows); the photo just isn't cached.
  }
};

// One landscape photo URL from Unsplash for `query`, or undefined. Cached per browser
// session under `cacheKey` so repeat visits don't spend the Unsplash rate limit.
export const coverPhoto = async (query, cacheKey) => {
  const cached = readCache(cacheKey);
  if (cached) return cached;
  if (!UNSPLASH_KEY) return undefined;
  try {
    const { data } = await axios.get("https://api.unsplash.com/search/photos", {
      params: { query, client_id: UNSPLASH_KEY, per_page: 1, orientation: "landscape" },
    });
    const url = data.results?.[0]?.urls?.regular;
    if (url) writeCache(cacheKey, url);
    return url;
  } catch (err) {
    console.error(`Error fetching a photo for "${query}":`, err);
    return undefined;
  }
};

// Fill in a cover photo for trips that don't have one. A failed lookup never blocks the
// list: that trip just has no image.
export const withCoverImages = (trips) =>
  Promise.all(
    trips.map(async (trip) => {
      if (trip.imageUrl) return trip;
      const imageUrl = await coverPhoto(trip.name, `cover:${trip._id}`);
      return imageUrl ? { ...trip, imageUrl } : trip;
    })
  );
