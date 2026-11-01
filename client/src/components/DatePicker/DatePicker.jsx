// A single-day field that opens a month grid, styled like TimePicker and written the same
// way (no portal, so it works inside a native <dialog>). `value`, `min` and `max` are local
// "YYYY-MM-DD" strings and `onChange` gets one, so it drops in for <input type="date">.
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const pad = (n) => String(n).padStart(2, "0");
const toKey = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;
const parseKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const isKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
const todayKey = () => {
  const now = new Date();
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
};

// `align="right"` / `placement="top"` keep the panel inside tight spots, e.g. the right-hand
// column of a tall form that scrolls.
const DatePicker = ({ id, value, onChange, min, max, placeholder = "Select date", className, align = "left", placement = "bottom" }) => {
  const autoId = useId();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  // Open on the chosen day, else the first allowed day (a trip's start), else this month
  const anchor = isKey(value) ? parseKey(value) : isKey(min) && min > todayKey() ? parseKey(min) : new Date();
  const [view, setView] = useState({ year: anchor.getFullYear(), month: anchor.getMonth() });

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    return [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => toKey(view.year, view.month, i + 1)),
    ];
  }, [view]);

  const shiftMonth = (delta) => {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  const toggle = () => {
    if (!open) {
      const shown = isKey(value) ? parseKey(value) : anchor;
      setView({ year: shown.getFullYear(), month: shown.getMonth() });
    }
    setOpen((current) => !current);
  };

  const text = isKey(value)
    ? parseKey(value).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })
    : "";
  const today = todayKey();

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          // Stop the modal's own Escape handling from closing the whole form.
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${autoId}-panel`}
        onClick={toggle}
        className={cn("field flex items-center justify-between gap-2 text-left", className)}
      >
        <span className={cn("truncate", !text && "text-ink/55")}>{text || placeholder}</span>
        <CalendarDays size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={`${autoId}-panel`}
          role="dialog"
          aria-label="Choose a date"
          className={cn(
            "absolute z-20 w-72 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-ink/10",
            align === "right" ? "right-0" : "left-0",
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2"
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <button type="button" aria-label="Previous month" className="btn-ghost h-8 w-8 !p-0" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <p className="font-display text-lg text-ink" aria-live="polite">
              {new Date(view.year, view.month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </p>
            <button type="button" aria-label="Next month" className="btn-ghost h-8 w-8 !p-0" onClick={() => shiftMonth(1)}>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-extrabold text-ink-soft">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((key, index) => {
              if (!key) return <span key={`blank-${index}`} />;
              const disabled = (isKey(min) && key < min) || (isKey(max) && key > max);
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={parseKey(key).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "mx-auto h-9 w-9 rounded-full border-0 p-0 text-sm font-bold transition",
                    selected
                      ? "bg-ink text-white"
                      : disabled
                        ? "bg-transparent text-ink/25"
                        : "bg-transparent text-ink hover:bg-lagoon-light",
                    !selected && key === today && !disabled && "ring-2 ring-mustard"
                  )}
                >
                  {Number(key.slice(8))}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
