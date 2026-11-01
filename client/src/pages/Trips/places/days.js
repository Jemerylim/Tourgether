import dayjs from "dayjs";

const MAX_DAYS = 60;

export const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export const fromMinutes = (total) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

const roundUp = (minutes, step) => Math.ceil(minutes / step) * step;

// The trip's days as [{ date: "YYYY-MM-DD", number }]: every day between its locked
// dates, or, while the dates are still open, each day that already has an event
export const tripDays = (trip, events) => {
  if (trip.startDate && trip.endDate) {
    const first = dayjs(trip.startDate).startOf("day");
    const count = Math.min(dayjs(trip.endDate).startOf("day").diff(first, "day") + 1, MAX_DAYS);
    return Array.from({ length: Math.max(count, 0) }, (_, index) => ({
      date: first.add(index, "day").format("YYYY-MM-DD"),
      number: index + 1,
    }));
  }
  return [...new Set(events.map((event) => event.date))]
    .sort()
    .map((date, index) => ({ date, number: index + 1 }));
};

// A day's events, earliest first
export const eventsOn = (events, date) =>
  events.filter((event) => event.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));

// Saved place _id -> the events it's been planned into, as [{ date, startTime, number }]
export const scheduleByPlace = (events, days) => {
  const numbers = new Map(days.map((day) => [day.date, day.number]));
  const byPlace = new Map();
  events.forEach((event) => {
    const id = event.place?.placeId;
    if (!id) return;
    const entry = { date: event.date, startTime: event.startTime, number: numbers.get(event.date) };
    byPlace.set(id, [...(byPlace.get(id) || []), entry].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)));
  });
  return byPlace;
};

// A sensible slot for one more thing on `date`: half an hour after the day's last event,
// or 10:00 on an empty day, lasting 90 minutes and never running past midnight
export const suggestSlot = (events, date) => {
  const day = eventsOn(events, date);
  const start = day.length ? Math.min(roundUp(toMinutes(day[day.length - 1].endTime) + 30, 15), 22 * 60) : 10 * 60;
  return { startTime: fromMinutes(start), endTime: fromMinutes(Math.min(start + 90, 23 * 60 + 59)) };
};

// Minutes free between one stop ending and the next starting
export const gapBetween = (from, to) => toMinutes(to.startTime) - toMinutes(from.endTime);

// New times for `stops` visited in the order given: the first keeps its start, each keeps
// its length, and each next one starts once the walk there is done (rounded up to 5 min).
// Returns null if the day would run past midnight.
export const retime = (stops, legs) => {
  let start = toMinutes(stops[0].startTime);
  const timed = stops.map((stop, index) => {
    const length = toMinutes(stop.endTime) - toMinutes(stop.startTime);
    if (index > 0) start = start + roundUp((legs[index - 1]?.duration || 0) / 60, 5);
    const next = { ...stop, startTime: fromMinutes(start), endTime: fromMinutes(start + length) };
    start += length;
    return next;
  });
  return start > 23 * 60 + 59 ? null : timed;
};
