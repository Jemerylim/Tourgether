import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { API_URL } from "../../config";
import { idOf } from "../Trips/expenseMath";

const EMPTY = { events: null, checklist: null, expenses: null };

// Extra detail for the trip the dashboard features: its events and checklist, plus its
// expenses while the trip is under way. Each part is a nice-to-have, so a request that
// fails just leaves that part null and the card shows less.
export default function useTripSpotlight(tripId, { withExpenses = false } = {}) {
  const [spotlight, setSpotlight] = useState(EMPTY);

  useEffect(() => {
    setSpotlight(EMPTY);
    if (!tripId) return undefined;

    let cancelled = false;
    const headers = { Authorization: `Bearer ${localStorage.getItem("authToken")}` };
    const get = (path) =>
      axios
        .get(`${API_URL}${path}`, { headers })
        .then((response) => response.data.data)
        .catch(() => null);

    Promise.all([
      get(`/api/events/trip/${tripId}`),
      get(`/api/checklist/trip/${tripId}`),
      withExpenses ? get(`/api/expenses/trip/${tripId}`) : null,
    ]).then(([events, checklist, expenses]) => {
      if (!cancelled) setSpotlight({ events, checklist, expenses: expenses?.expenses ?? null });
    });

    return () => {
      cancelled = true;
    };
  }, [tripId, withExpenses]);

  return spotlight;
}

const startOf = (event) => dayjs(`${event.date} ${event.startTime}`);
const endOf = (event) => dayjs(`${event.date} ${event.endTime}`);
const byStart = (a, b) => startOf(a) - startOf(b);

// The event on now, or else the next one to start
export const nextEvent = (events) =>
  [...events].sort(byStart).find((event) => endOf(event).isAfter(dayjs())) || null;

export const todaysEvents = (events) => {
  const today = dayjs().format("YYYY-MM-DD");
  return events.filter((event) => event.date === today).sort(byStart);
};

export const isOver = (event) => endOf(event).isBefore(dayjs());

// "Now", "Today", "Tomorrow", "Friday" (within the week), else "12 Mar"
export const whenLabel = (event) => {
  if (!startOf(event).isAfter(dayjs())) return "Now";
  const days = dayjs(event.date).diff(dayjs().startOf("day"), "day");
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return dayjs(event.date).format("dddd");
  return dayjs(event.date).format("D MMM");
};

// How far the user is through the packing list (or the to-do list when there's no
// packing list). Personal items count when they've ticked them off themselves.
export const checklistProgress = (items, userId) => {
  const isDone = (item) =>
    item.kind === "personal" ? item.doneBy.some((person) => idOf(person) === userId) : item.done;
  const packing = items.filter((item) => item.list === "packing");
  const [list, word] = packing.length > 0 ? [packing, "packed"] : [items, "done"];
  if (list.length === 0) return null;
  return { done: list.filter(isDone).length, total: list.length, word };
};

// The latest spending, leaving out settle-up payments between members
export const latestExpenses = (expenses, count = 3) =>
  expenses.filter((expense) => expense.category !== "settlement").slice(0, count);

export const payerOf = (expense, userId) => {
  const payers = expense.shares.filter((share) => share.paid > 0);
  if (payers.length !== 1) return "Several people";
  return idOf(payers[0].user) === userId ? "You" : payers[0].user?.name || "Someone";
};
