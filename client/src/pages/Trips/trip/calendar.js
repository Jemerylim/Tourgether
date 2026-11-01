import dayjs from "dayjs";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import "@schedule-x/theme-default/dist/index.css";

// Every event on the trip calendar uses the app's lagoon colours instead of Schedule-X's blue
export const EVENT_CALENDARS = {
  trip: {
    colorName: "trip",
    lightColors: { main: "#0A7C84", container: "#DDF1EF", onContainer: "#082F37" },
    darkColors: { main: "#0A7C84", container: "#DDF1EF", onContainer: "#082F37" },
  },
};

const CALENDAR_FORMAT = "YYYY-MM-DD HH:mm";

// An event from the API, in the shape Schedule-X wants
export const toCalendarEvent = (event) => ({
  id: event._id,
  title: event.title,
  calendarId: "trip",
  start: dayjs(`${event.date} ${event.startTime}`).format(CALENDAR_FORMAT),
  end: dayjs(`${event.date} ${event.endTime}`).format(CALENDAR_FORMAT),
});

// The calendar plugins live at module level, so the drag handler reaches the current
// trip and the toast function through these refs (set inside the component).
export const tripRef = { current: null };
export const notifyRef = { current: () => {} };

export const calendarControlsPlugin = createCalendarControlsPlugin({
  showTodayButton: false, // Hide the "Today" button
  showDatePicker: false, // Hide the date picker
});
export const eventsServicePlugin = createEventsServicePlugin();
export const eventModal = createEventModalPlugin();
export const dragAndDropPlugin = createDragAndDropPlugin({
  callbacks: {
    onDrop: ({ start, end, revert }) => {
      const trip = tripRef.current;
      if (!trip || !trip.startDate || !trip.endDate) {
        console.warn("Trip details not loaded yet.");
        return;
      }
      if (trip.myRole === "viewer") {
        notifyRef.current("Viewers can't move events.", "error");
        revert();
        return;
      }

      const tripStart = dayjs(trip.startDate).format("YYYY-MM-DD");
      const tripEnd = dayjs(trip.endDate).format("YYYY-MM-DD");
      const newStartDate = dayjs(start).format("YYYY-MM-DD");
      const newEndDate = dayjs(end).format("YYYY-MM-DD");

      if (newStartDate < tripStart || newEndDate > tripEnd) {
        notifyRef.current(`Events have to stay between ${tripStart} and ${tripEnd}.`, "error");
        revert();
      }
    },
  },
});

export const CALENDAR_PLUGINS = [dragAndDropPlugin, calendarControlsPlugin, eventsServicePlugin, eventModal];
