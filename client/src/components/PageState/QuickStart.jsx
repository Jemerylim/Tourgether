import React from "react";

// A row of tappable suggestions under an empty state ("Passport", "Hotel deposit"...), so a
// blank section starts with one tap instead of a blank field.
const QuickStart = ({ label = "Try one", suggestions, onPick }) => (
  <div className="mt-6">
    <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft">{label}</p>
    <div className="flex flex-wrap gap-2">
      {suggestions.map((text) => (
        <button
          key={text}
          type="button"
          onClick={() => onPick(text)}
          className="rounded-full border-0 bg-lagoon-light px-3.5 py-1.5 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:bg-sky"
        >
          {text}
        </button>
      ))}
    </div>
  </div>
);

export default QuickStart;
