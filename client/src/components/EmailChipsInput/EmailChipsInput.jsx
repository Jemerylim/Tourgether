// Adapted from https://21st.dev/@laziekiki/components/smart-tag-input
import React, { useId, useRef, useState } from "react";
import { X } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Chips for invited emails. Enter or comma adds; pasting a list splits it; duplicates are
// ignored; Backspace on an empty input selects and then removes the last chip.
// People are added by email or by name. `validate(text)` (sync or async) either returns a
// message to reject the entry, or `{ email }` with the account's real email address (a name
// is resolved to its email this way). `labels` maps an email to the name shown on its chip.
const EmailChipsInput = ({ emails, onChange, validate, labels = {}, max = 10, label = "Invite travellers" }) => {
  const inputId = useId();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [checking, setChecking] = useState(false);

  const full = emails.length >= max;

  // Resolves to the list after adding `raw`, or the same list (with an error set) if rejected.
  const addTo = async (list, raw) => {
    const value = raw.trim();
    if (!value) return list;
    const looksLikeEmail = value.includes("@");
    if (looksLikeEmail && !EMAIL_REGEX.test(value)) {
      setError(`"${value}" isn't a valid email address.`);
      return list;
    }
    if (!looksLikeEmail && value.length < 2) {
      setError("Type at least 2 letters of their name, or their full email.");
      return list;
    }
    if (list.length >= max) {
      setError(`You can invite up to ${max} people.`);
      return list;
    }
    const result = validate ? await validate(value) : null;
    if (typeof result === "string") {
      setError(result);
      return list;
    }
    const email = result?.email ?? value;
    if (list.some((existing) => existing.toLowerCase() === email.toLowerCase())) {
      setError(`${labels[email] || email} is already on the list.`);
      return list;
    }
    return [...list, email];
  };

  const commit = async (raw) => {
    setError("");
    setChecking(true);
    const next = await addTo(emails, raw);
    setChecking(false);
    if (next !== emails) {
      onChange(next);
      setQuery("");
    }
    setSelected(null);
  };

  const remove = (email) => {
    onChange(emails.filter((item) => item !== email));
    setSelected(null);
    setError("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if ((event.key === "Enter" || event.key === ",") && query.trim()) {
      event.preventDefault();
      commit(query);
    } else if (event.key === "Enter") {
      event.preventDefault(); // Never submit a surrounding form from here.
    } else if (event.key === "Backspace" && !query) {
      if (selected) remove(selected);
      else setSelected(emails.at(-1) ?? null);
    } else if (event.key === "Escape") {
      setQuery("");
      setSelected(null);
    }
  };

  const handlePaste = async (event) => {
    const values = event.clipboardData
      .getData("text")
      .split(/[,;\n]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (values.length > 1) {
      event.preventDefault();
      setError("");
      setChecking(true);
      let list = emails;
      for (const value of values) list = await addTo(list, value);
      setChecking(false);
      onChange(list);
    }
  };

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-sm font-extrabold text-ink">
          {label}
        </label>
        <span className="text-sm text-ink-soft" aria-live="polite">
          {emails.length} of {max} invited
        </span>
      </div>

      <div
        className="flex min-h-[3.25rem] cursor-text flex-wrap items-center gap-2 rounded-xl bg-lagoon-light/70 px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-lagoon"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            event.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        {emails.map((email) => (
          <span
            key={email}
            className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm font-bold ${
              selected === email ? "bg-ink text-white" : "bg-white text-ink"
            }`}
          >
            <span title={email}>{labels[email] || email}</span>
            <button
              type="button"
              onClick={() => remove(email)}
              aria-label={`Remove ${labels[email] || email}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full border-0 bg-transparent p-0 text-current hover:bg-ink/10"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          disabled={full || checking}
          autoComplete="off"
          placeholder={full ? "Invite limit reached" : checking ? "Checking..." : "Name or email"}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
            setError("");
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => query.trim() && !checking && commit(query)}
          className="min-w-[10rem] flex-1 border-0 bg-transparent p-1 text-base text-ink-deep outline-none placeholder:text-ink/40"
        />
      </div>

      <p className="mt-1.5 min-h-[1.25rem] text-sm font-bold text-red-700" role={error ? "alert" : undefined}>
        {error}
      </p>
    </div>
  );
};

export default EmailChipsInput;
