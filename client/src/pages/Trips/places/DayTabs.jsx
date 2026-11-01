import React from "react";
import dayjs from "dayjs";
import { Layers } from "lucide-react";
import { cn } from "../../../lib/utils";

const TAB = "flex shrink-0 snap-start flex-col items-start rounded-2xl border-0 px-4 py-2 text-left transition";

// "All places" plus one tab per day of the trip. `counts` maps a date to how many
// events that day has. `value` is "lists" or a date.
const DayTabs = ({ days, counts, value, onChange }) => (
  <div role="group" aria-label="Show places by list or by day" className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
    <button
      type="button"
      aria-pressed={value === "lists"}
      onClick={() => onChange("lists")}
      className={cn(TAB, value === "lists" ? "bg-ink text-white" : "bg-white text-ink drop-shadow-ticket hover:bg-lagoon-light")}
    >
      <span className="flex items-center gap-1.5 text-sm font-extrabold">
        <Layers size={14} aria-hidden="true" />
        All places
      </span>
      <span className={cn("text-xs", value === "lists" ? "text-white/70" : "text-ink-soft")}>By list</span>
    </button>
    {days.map((day) => {
      const active = value === day.date;
      const count = counts.get(day.date) || 0;
      return (
        <button
          key={day.date}
          type="button"
          aria-pressed={active}
          onClick={() => onChange(day.date)}
          className={cn(TAB, active ? "bg-ink text-white" : "bg-white text-ink drop-shadow-ticket hover:bg-lagoon-light")}
        >
          <span className="text-sm font-extrabold">Day {day.number}</span>
          <span className={cn("text-xs tabular-nums", active ? "text-white/70" : "text-ink-soft")}>
            {dayjs(day.date).format("ddd D MMM")}
            {count > 0 && ` · ${count}`}
          </span>
        </button>
      );
    })}
  </div>
);

export default DayTabs;
