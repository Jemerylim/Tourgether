// Layout inspired by https://21st.dev/@preetsuthar17/components/time-picker (hour / minute /
// AM-PM columns). Written without Radix: its portaled popovers render behind a native
// <dialog>, so the panel here is a plain absolutely-positioned sibling inside the modal.
import React, { useEffect, useId, useRef, useState } from "react";
import { Check, Clock } from "lucide-react";
import { cn } from "../../lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTE_STEP = 5;
const pad = (n) => String(n).padStart(2, "0");

// "HH:mm" (24h, what the API stores) <-> 12-hour parts.
const parse = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value || "");
  if (!match) return null;
  const h24 = Number(match[1]);
  return { hour: h24 % 12 || 12, minute: Number(match[2]), pm: h24 >= 12 };
};
const build = ({ hour, minute, pm }) => `${pad((hour % 12) + (pm ? 12 : 0))}:${pad(minute)}`;
const label = (value) => {
  const time = parse(value);
  return time ? `${pad(time.hour)}:${pad(time.minute)} ${time.pm ? "PM" : "AM"}` : "";
};

const Column = ({ title, options, selected, onSelect }) => {
  const selectedRef = useRef(null);

  useEffect(() => {
    // Scroll inside the column only; scrollIntoView would also scroll the page.
    const item = selectedRef.current;
    if (item?.parentElement) item.parentElement.scrollTop = item.offsetTop - item.parentElement.offsetTop - 40;
  }, []);

  return (
    <div role="listbox" aria-label={title} className="flex max-h-48 flex-1 flex-col gap-1 overflow-y-auto px-1">
      {options.map(({ value, text }) => {
        const active = value === selected;
        return (
          <button
            key={value}
            ref={active ? selectedRef : undefined}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(value)}
            className={cn(
              "rounded-lg border-0 px-3 py-1.5 text-sm font-bold transition",
              active ? "bg-ink text-white" : "bg-transparent text-ink hover:bg-lagoon-light"
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
};

// A time field that opens hour / minute / AM-PM columns. `value` and `onChange` use
// "HH:mm", the same as <input type="time">, so it drops in for one.
const TimePicker = ({ id, value, onChange, placeholder = "Select time", className }) => {
  const autoId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const time = parse(value);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const update = (change) => onChange(build({ hour: 9, minute: 0, pm: false, ...time, ...change }));

  // Keep a minute that isn't on the 5-minute grid (e.g. a dragged event) selectable.
  const minutes = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
  if (time && !minutes.includes(time.minute)) minutes.push(time.minute);
  minutes.sort((a, b) => a - b);

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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${autoId}-panel`}
        onClick={() => setOpen((current) => !current)}
        className={cn("field flex items-center justify-between gap-2 text-left", className)}
      >
        <span className={time ? "" : "text-ink/40"}>{label(value) || placeholder}</span>
        <Clock size={16} className="shrink-0 text-ink-soft" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={`${autoId}-panel`}
          className="absolute left-0 top-full z-20 mt-2 w-64 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-ink/10"
        >
          <div className="flex gap-1">
            <Column
              title="Hour"
              options={HOURS.map((h) => ({ value: h, text: pad(h) }))}
              selected={time?.hour}
              onSelect={(hour) => update({ hour })}
            />
            <Column
              title="Minute"
              options={minutes.map((m) => ({ value: m, text: pad(m) }))}
              selected={time?.minute}
              onSelect={(minute) => update({ minute })}
            />
            <Column
              title="AM or PM"
              options={[
                { value: false, text: "AM" },
                { value: true, text: "PM" },
              ]}
              selected={time?.pm}
              onSelect={(pm) => update({ pm })}
            />
          </div>
          <button type="button" className="btn-dark mt-3 w-full py-2" onClick={() => setOpen(false)}>
            <Check size={16} aria-hidden="true" />
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
