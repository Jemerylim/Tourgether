// Adapted from https://21st.dev/@bidyut10/components/date-range-picker-card
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
// Dates travel as local "YYYY-MM-DD" strings so no timezone shifts the day.
const toKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;
const todayKey = () => {
  const now = new Date();
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
};
const parseKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

// Month grid for choosing a trip's start and end: first tap sets the start, the second
// sets the end and fills the range between. `start`/`end` are "YYYY-MM-DD" ("" when unset).
const DateRangePicker = ({ start, end, onChange, min = todayKey() }) => {
  const initial = start ? parseKey(start) : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const cells = useMemo(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => toKey(view.year, view.month, i + 1)),
    ];
  }, [view]);

  const monthLabel = new Date(view.year, view.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  const select = (key) => {
    if (!start || end || key < start) onChange(key, "");
    else onChange(start, key);
  };

  return (
    <div className="rounded-2xl bg-lagoon-light/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="btn-ghost h-9 w-9 p-0"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="font-display text-xl text-ink" aria-live="polite">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="btn-ghost h-9 w-9 p-0"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-extrabold text-ink-soft">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((key, index) => {
          if (!key) return <span key={`blank-${index}`} />;
          const disabled = key < min;
          const isStart = key === start;
          const isEnd = key === end;
          const inRange = start && end && key > start && key < end;
          const band = inRange
            ? "bg-white/80"
            : isStart && end
              ? "rounded-l-full bg-white/80"
              : isEnd
                ? "rounded-r-full bg-white/80"
                : "";
          const date = parseKey(key);
          return (
            <span key={key} className={`flex justify-center py-0.5 ${band}`}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => select(key)}
                aria-pressed={isStart || isEnd}
                aria-label={date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                className={`h-10 w-10 rounded-full border-0 p-0 text-sm font-bold transition ${
                  isStart || isEnd
                    ? "bg-ink text-white"
                    : disabled
                      ? "bg-transparent text-ink/25"
                      : "bg-transparent text-ink hover:bg-white"
                }`}
              >
                {date.getDate()}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default DateRangePicker;
