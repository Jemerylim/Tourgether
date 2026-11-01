import React from "react";
import { Check } from "lucide-react";
import { MAX_TRAVEL_STYLES, TRAVEL_STYLES } from "../../lib/travelStyles";
import { cn } from "../../lib/utils";

const styleOf = (value) => TRAVEL_STYLES.find((style) => style.value === value);

// Read-only chips for the styles someone has picked
export const StyleChips = ({ styles = [], className }) => (
  <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Travel style">
    {styles.map(styleOf).filter(Boolean).map(({ value, label, icon: Icon }) => (
      <li
        key={value}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-extrabold text-ink shadow-float"
      >
        <Icon size={15} className="text-lagoon" aria-hidden="true" />
        {label}
      </li>
    ))}
  </ul>
);

// Toggle chips for choosing styles, up to MAX_TRAVEL_STYLES
export const StylePicker = ({ value, onChange }) => {
  const toggle = (style) => {
    if (value.includes(style)) onChange(value.filter((item) => item !== style));
    else if (value.length < MAX_TRAVEL_STYLES) onChange([...value, style]);
  };

  return (
    <fieldset>
      <legend className="field-label">
        Travel style <span className="font-bold text-ink-soft">(up to {MAX_TRAVEL_STYLES})</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {TRAVEL_STYLES.map(({ value: style, label, icon: Icon }) => {
          const on = value.includes(style);
          const full = !on && value.length >= MAX_TRAVEL_STYLES;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={on}
              disabled={full}
              onClick={() => toggle(style)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-0 px-3 py-1.5 text-sm font-extrabold transition disabled:opacity-40",
                on ? "bg-ink text-white" : "bg-white text-ink hover:bg-sky"
              )}
            >
              {on ? <Check size={15} aria-hidden="true" /> : <Icon size={15} aria-hidden="true" />}
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
};
