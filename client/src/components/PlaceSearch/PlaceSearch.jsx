import React, { useEffect, useId, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { searchPlaces } from "../../lib/places";
import { cn } from "../../lib/utils";

// Search-as-you-type for real places (ARIA combobox). Arrow keys move through the
// results, Enter picks one, Escape closes the list. `onPick` gets
// { sourceId, name, address, category, lat, lng }.
const PlaceSearch = ({ label, placeholder = "Add a place", near, citiesOnly = false, onPick, autoFocus = false, className }) => {
  const listId = useId();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const nearLat = near?.lat;
  const nearLng = near?.lng;

  // Wait for a pause in typing, and drop the answer to an older query if a newer one went out
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const near = nearLat == null ? undefined : { lat: nearLat, lng: nearLng };
        setResults(await searchPlaces(text, { near, citiesOnly, signal: controller.signal }));
        setFailed(false);
        setActive(-1);
      } catch (error) {
        if (error.name === "CanceledError") return;
        setResults([]);
        setFailed(true);
      }
      setLoading(false);
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, nearLat, nearLng, citiesOnly]);

  const pick = (place) => {
    onPick(place);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter" && open && results[active]) {
      event.preventDefault();
      pick(results[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2;
  const optionId = (index) => `${listId}-${index}`;

  return (
    <div className={cn("relative", className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        {label || placeholder}
      </label>
      <div className="relative">
        <MapPin size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          className="field pl-11 pr-10"
          placeholder={placeholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {loading && (
          <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-ink-soft motion-reduce:animate-none" aria-hidden="true" />
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching places"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-soft"
        >
          {results.map((place, index) => (
            <li
              key={`${place.sourceId}-${index}`}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              // mousedown, so the pick lands before the input's blur closes the list
              onMouseDown={(event) => {
                event.preventDefault();
                pick(place);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn("flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5", index === active && "bg-lagoon-light")}
            >
              <MapPin size={16} className="mt-1 shrink-0 text-lagoon" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink">{place.name}</span>
                <span className="block truncate text-sm text-ink-soft">
                  {[place.category, place.address].filter(Boolean).join(" · ")}
                </span>
              </span>
            </li>
          ))}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2.5 text-sm text-ink-soft">
              {failed ? "Search isn't answering right now. Try again in a moment." : "No places match that yet."}
            </li>
          )}
          {loading && results.length === 0 && <li className="px-3 py-2.5 text-sm text-ink-soft">Searching...</li>}
        </ul>
      )}
    </div>
  );
};

export default PlaceSearch;
