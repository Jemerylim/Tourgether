const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGES = 3;

// Availability is kept per calendar day, so everything works on UTC "YYYY-MM-DD" keys
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
const dayNumber = (key) => Date.parse(key) / DAY_MS;

// Per-day availability: who is free on each day that at least one person is.
// `records` are UserTripDate documents, `people` maps a user ID to { _id, name }.
const dailyAvailability = (records, people) => {
  const byDay = new Map();
  records.forEach((record) => {
    const person = people.get(String(record.userId));
    if (!person) return; // no longer on the trip
    new Set(record.availDates.map(dayKey)).forEach((key) => {
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(person);
    });
  });
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, members]) => ({ date, count: members.length, members }));
};

// The best runs of consecutive days. A run's `count` is how many people are free on
// every day of it, so it is the number who can actually make the whole stretch. Runs
// that sit inside another run with at least as many people are left out.
const bestRanges = (days, { minDays = 2, maxDays = 30 } = {}) => {
  const candidates = [];

  days.forEach((first, i) => {
    let members = first.members;
    for (let j = i; j < days.length && j - i < maxDays; j += 1) {
      if (j > i) {
        if (dayNumber(days[j].date) !== dayNumber(days[j - 1].date) + 1) break;
        members = members.filter((person) => days[j].members.some((other) => other._id === person._id));
      }
      if (!members.length) break;
      candidates.push({ start: first.date, end: days[j].date, days: j - i + 1, count: members.length, members });
    }
  });

  const usable = candidates.filter((range) => range.days >= minDays);
  const pool = usable.length ? usable : candidates;
  pool.sort((a, b) => b.count - a.count || b.days - a.days || a.start.localeCompare(b.start));

  const kept = [];
  pool.forEach((range) => {
    const covered = kept.some((other) => other.start <= range.start && other.end >= range.end);
    if (!covered && kept.length < MAX_RANGES) kept.push(range);
  });
  return kept;
};

module.exports = { dayKey, dailyAvailability, bestRanges };
