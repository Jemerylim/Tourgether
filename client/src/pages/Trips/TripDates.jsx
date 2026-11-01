// The day grid with intensity levels and a hover tooltip is adapted from "GitHub Activity Grid"
// by wensity (https://21st.dev/@wensity/components/github-activity-grid), rebuilt as a month
// calendar without framer-motion.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { CalendarCheck, ChevronLeft, ChevronRight, Lock, LockOpen, Pencil } from "lucide-react";
import DateRangePicker from "../../components/DateRangePicker/DateRangePicker";
import { fireConfetti } from "../../lib/confetti";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import { useToast } from "../../components/Toast/Toast";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { cn } from "../../lib/utils";

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } });

const KEY = "YYYY-MM-DD";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const rangeLabel = (start, end) =>
  start === end
    ? dayjs(start).format("ddd D MMM")
    : `${dayjs(start).format("ddd D MMM")} to ${dayjs(end).format("ddd D MMM")}`;

const nameList = (people) => people.map((person) => person.name).join(", ");

// One day in the grid. The tooltip is plain CSS (hover or keyboard focus) and is anchored to
// the edge of the grid on the first and last columns so it never gets clipped.
const DayCell = ({ day, column, total, editing, mine, locked, highlighted, past, onDragStart, onKeyToggle }) => {
  const count = day.members.length;
  const ratio = total ? count / total : 0;
  const names = count ? nameList(day.members) : "Nobody has marked this day";
  const label = `${dayjs(day.date).format("dddd D MMMM")}: ${count} of ${total} free${count ? `, ${names}` : ""}`;

  let style;
  if (!editing && count) style = { backgroundColor: `rgba(10, 124, 132, ${0.18 + 0.82 * ratio})` };

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={editing ? `${dayjs(day.date).format("dddd D MMMM")}${mine ? ", marked free" : ""}` : label}
        aria-pressed={editing ? mine : undefined}
        disabled={editing && past}
        data-date={day.date}
        onPointerDown={(e) => {
          if (!editing || past || e.button > 0) return;
          e.currentTarget.releasePointerCapture?.(e.pointerId); // so moving over other days is seen
          onDragStart(day.date);
        }}
        onClick={(e) => editing && e.detail === 0 && onKeyToggle(day.date)} // Enter / Space
        style={style}
        className={cn(
          "relative flex h-14 w-full select-none flex-col sm:h-[4.25rem] items-center justify-center rounded-lg border-2 p-0 text-sm font-bold transition",
          editing ? "cursor-pointer" : "cursor-default",
          !style && "bg-ink/5 text-ink",
          style && ratio > 0.5 ? "text-white" : "text-ink",
          editing && mine ? "border-mustard bg-mustard text-ink" : "border-transparent",
          editing && past && "cursor-not-allowed opacity-30",
          highlighted && !editing && "border-mustard",
          locked && !editing && "border-ink"
        )}
      >
        <span className="text-base">{dayjs(day.date).date()}</span>
        {!editing && count > 0 && <span className="text-xs font-extrabold leading-none opacity-80">{count}</span>}
      </button>
      {!editing && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none invisible absolute bottom-full z-20 mb-1 w-max max-w-[14rem] rounded-xl bg-ink-deep px-3 py-2 text-left text-xs text-white opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100",
            column === 0 ? "left-0" : column === 6 ? "right-0" : "left-1/2 -translate-x-1/2"
          )}
        >
          <p className="font-extrabold">{dayjs(day.date).format("ddd D MMM")}</p>
          <p className="opacity-90">{count ? `${count} of ${total} free: ${names}` : names}</p>
        </div>
      )}
    </div>
  );
};

const TripDates = ({ trip, userId, isOrganiser, onLocked }) => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() =>
    dayjs(trip.startDate && dayjs(trip.startDate).isAfter(dayjs()) ? trip.startDate : undefined).startOf("month")
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [lookingAt, setLookingAt] = useState(null); // a best range being previewed on the grid
  const [locking, setLocking] = useState(null); // the range waiting for confirmation
  const [unlocking, setUnlocking] = useState(false);
  const [custom, setCustom] = useState({ start: "", end: "" }); // organiser's own pick

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/usertripdate/trip/${trip._id}/summary`, authHeaders());
      setSummary(data.data);
      setError("");
    } catch (err) {
      setError(apiErrorMessage(err, "Couldn't load everyone's availability"));
    }
  }, [trip._id]);

  useEffect(() => {
    load();
  }, [load]);

  const byDate = useMemo(() => new Map((summary?.days || []).map((day) => [day.date, day])), [summary]);
  const myDays = useMemo(
    () => new Set((summary?.days || []).filter((day) => day.members.some((m) => m._id === userId)).map((d) => d.date)),
    [summary, userId]
  );

  const today = dayjs().format(KEY);
  const lockedStart = trip.startDate ? dayjs(trip.startDate).format(KEY) : null;
  const lockedEnd = trip.endDate ? dayjs(trip.endDate).format(KEY) : null;

  const startEditing = () => {
    setDraft(new Set([...myDays].filter((date) => date >= today)));
    setEditing(true);
  };

  const toggleDay = (date) =>
    setDraft((prev) => {
      const next = new Set(prev);
      if (!next.delete(date)) next.add(date);
      return next;
    });

  // Press on a day and drag to paint every day between there and the pointer. Starting on
  // a marked day unmarks instead. Each move is worked out from the draft as it was when
  // the press began, so dragging back shrinks the stretch again.
  const drag = useRef(null);

  const startDrag = (date) => {
    drag.current = { anchor: date, adding: !draft.has(date), base: draft };
    paint(date);
  };

  const paint = (date) => {
    const { anchor, adding, base } = drag.current;
    const [from, to] = anchor <= date ? [anchor, date] : [date, anchor];
    const next = new Set(base);
    for (let day = dayjs(from); !day.isAfter(to); day = day.add(1, "day")) {
      const key = day.format(KEY);
      if (key < today) continue;
      if (adding) next.add(key);
      else next.delete(key);
    }
    setDraft(next);
  };

  const dragOver = (e) => {
    if (!drag.current) return;
    const date = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-date]")?.dataset.date;
    if (date) paint(date);
  };

  useEffect(() => {
    const stop = () => {
      drag.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  const save = async () => {
    setSaving(true);
    // Past days can't be changed here, so keep whatever was already saved for them
    const pastDays = [...myDays].filter((date) => date < today);
    try {
      await axios.put(
        `${API_URL}/api/usertripdate/trip/${trip._id}/user/${userId}`,
        { availDates: [...pastDays, ...draft] },
        authHeaders()
      );
      await load();
      setEditing(false);
      showToast("Your availability is saved", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't save your availability"), "error");
    } finally {
      setSaving(false);
    }
  };

  // Who is free on every day of a stretch, whether or not it's one of the suggestions
  const freeOn = (start, end) => {
    let people = null;
    for (let day = dayjs(start); !day.isAfter(end); day = day.add(1, "day")) {
      const free = byDate.get(day.format(KEY))?.members || [];
      people = people ? people.filter((p) => free.some((q) => q._id === p._id)) : free;
    }
    return people || [];
  };

  const unlock = async () => {
    setUnlocking(false);
    try {
      const { data } = await axios.put(`${API_URL}/api/trips/${trip._id}`, { startDate: null, endDate: null }, authHeaders());
      onLocked(data.data);
      showToast("Dates unlocked. The trip is back to dates to be decided.", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't unlock the dates"), "error");
    }
  };

  const lock = async () => {
    const range = locking;
    setLocking(null);
    try {
      const { data } = await axios.put(
        `${API_URL}/api/trips/${trip._id}`,
        { startDate: range.start, endDate: range.end },
        authHeaders()
      );
      onLocked(data.data);
      fireConfetti({ count: 40 });
      showToast("Trip dates locked in for everyone", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Couldn't lock these dates"), "error");
    }
  };

  // Weeks of the shown month, padded with empty cells so the 1st lands on its weekday
  const cells = useMemo(() => {
    const count = month.daysInMonth();
    const blanks = Array.from({ length: month.day() }, () => null);
    return [
      ...blanks,
      ...Array.from({ length: count }, (_, i) => {
        const date = month.date(i + 1).format(KEY);
        return byDate.get(date) || { date, members: [] };
      }),
    ];
  }, [month, byDate]);

  if (error) {
    return (
      <div className="rounded-3xl bg-white p-6 drop-shadow-ticket">
        <p role="alert" className="font-bold text-red-700">{error}</p>
        <button type="button" className="btn-ghost mt-3" onClick={load}>Try again</button>
      </div>
    );
  }
  if (!summary) return <p className="text-ink-soft">Loading availability...</p>;

  const { totalMembers, responded, bestRanges } = summary;
  const inRange = (date, range) => range && date >= range.start && date <= range.end;
  const isLocked = (range) => range.start === lockedStart && range.end === lockedEnd;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="rounded-3xl bg-white p-4 drop-shadow-ticket sm:p-6" aria-label="Availability calendar">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-display text-2xl text-ink">{month.format("MMMM YYYY")}</h2>
          <button type="button" aria-label="Previous month" className="btn-ghost !px-2.5" onClick={() => setMonth(month.subtract(1, "month"))}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next month" className="btn-ghost !px-2.5" onClick={() => setMonth(month.add(1, "month"))}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>

        <p className="mt-1 text-sm text-ink-soft">
          {editing
            ? "Tap days, or press and drag across a stretch, to mark when you could travel. Then save."
            : `${responded} of ${totalMembers} ${totalMembers === 1 ? "member has" : "members have"} shared their dates. Hover a day to see who is free.`}
        </p>

        <div
          className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2.5"
          style={editing ? { touchAction: "none" } : undefined}
          onPointerMove={editing ? dragOver : undefined}
        >
          {WEEKDAYS.map((name) => (
            <span key={name} className="pb-1 text-center text-xs font-extrabold uppercase text-ink-soft">{name}</span>
          ))}
          {cells.map((day, index) =>
            day ? (
              <DayCell
                key={day.date}
                day={day}
                column={index % 7}
                total={totalMembers}
                editing={editing}
                mine={draft.has(day.date)}
                past={day.date < today}
                locked={lockedStart && day.date >= lockedStart && day.date <= lockedEnd}
                highlighted={inRange(day.date, lookingAt)}
                onDragStart={startDrag}
                onKeyToggle={toggleDay}
              />
            ) : (
              <span key={`blank-${index}`} />
            )
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {editing ? (
            <>
              <button type="button" className="btn-primary" disabled={saving} onClick={save}>
                {saving ? "Saving..." : "Save my dates"}
              </button>
              <button type="button" className="btn-ghost" disabled={saving} onClick={() => setEditing(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" className="btn-primary" onClick={startEditing}>
              <Pencil size={16} aria-hidden="true" />
              {myDays.size ? "Edit my dates" : "Add my dates"}
            </button>
          )}

          {!editing && (
            <div className="ml-auto flex items-center gap-2 text-xs font-bold text-ink-soft" aria-hidden="true">
              <span>Fewer</span>
              {[0.18, 0.4, 0.65, 1].map((alpha) => (
                <span key={alpha} className="h-4 w-4 rounded" style={{ backgroundColor: `rgba(10, 124, 132, ${alpha})` }} />
              ))}
              <span>More free</span>
            </div>
          )}
        </div>
      </section>

      <aside className="rounded-3xl bg-white p-4 drop-shadow-ticket sm:p-6" aria-label="Best dates">
        <h3 className="font-display text-xl text-ink">Best dates</h3>
        {lockedStart && lockedEnd && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* Re-keyed on new dates, so the stamp thumps down again each time they're locked */}
            <span
              key={`${lockedStart}-${lockedEnd}`}
              className="inline-flex -rotate-6 animate-stamp items-center gap-1.5 rounded-lg border-2 border-plum px-2.5 py-1 text-xs font-extrabold uppercase tracking-widest text-plum"
            >
              <Lock size={12} aria-hidden="true" />
              Locked
            </span>
            <span className="text-sm font-bold text-ink">{rangeLabel(lockedStart, lockedEnd)}</span>
          </div>
        )}
        {isOrganiser && lockedStart && lockedEnd && (
          <button type="button" className="btn-ghost mt-2" onClick={() => setUnlocking(true)}>
            <LockOpen size={16} aria-hidden="true" />
            Unlock dates
          </button>
        )}

        {bestRanges.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Once members add the days they are free, the stretches that suit the most people show up here.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {bestRanges.map((range, index) => (
              <li
                key={`${range.start}-${range.end}`}
                onMouseEnter={() => setLookingAt(range)}
                onMouseLeave={() => setLookingAt(null)}
                className="rounded-2xl border-2 border-lagoon-light p-3"
              >
                <button
                  type="button"
                  className="block w-full border-0 bg-transparent p-0 text-left"
                  onClick={() => setMonth(dayjs(range.start).startOf("month"))}
                  onFocus={() => setLookingAt(range)}
                  onBlur={() => setLookingAt(null)}
                >
                  <p className="font-extrabold text-ink">
                    {index === 0 && <span className="mr-2 rounded-full bg-mustard px-2 py-0.5 text-xs">Best</span>}
                    {rangeLabel(range.start, range.end)}
                  </p>
                  <p className="text-sm text-ink-soft">
                    {range.days} {range.days === 1 ? "day" : "days"} · {range.count} of {totalMembers} free
                    {range.count === totalMembers ? " (everyone)" : ""}
                  </p>
                  <p className="mt-1 text-sm text-ink">{nameList(range.members)}</p>
                </button>
                {isOrganiser && (
                  <button
                    type="button"
                    className="btn-dark mt-3 w-full"
                    disabled={isLocked(range)}
                    onClick={() => setLocking(range)}
                  >
                    <CalendarCheck size={16} aria-hidden="true" />
                    {isLocked(range) ? "Dates locked" : "Lock these dates"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isOrganiser && (
          <form
            className="mt-5 border-t-2 border-lagoon-light pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              setLocking({ start: custom.start, end: custom.end });
            }}
          >
            <h4 className="font-extrabold text-ink">Choose other dates</h4>
            <p className="text-sm text-ink-soft">Not one of the suggestions? Confirm any dates you like.</p>
            <div className="mt-3">
              <DateRangePicker
                compact
                start={custom.start}
                end={custom.end}
                initialMonth={month.format(KEY)}
                onChange={(start, end) => setCustom({ start, end })}
              />
            </div>
            <p className="mt-2 text-sm text-ink">
              {custom.start && custom.end
                ? `${rangeLabel(custom.start, custom.end)}: ${freeOn(custom.start, custom.end).length} of ${totalMembers} free for all of it`
                : custom.start
                  ? "Now tap the last day."
                  : "Tap the first day, then the last."}
            </p>
            <button
              type="submit"
              className="btn-dark mt-3 w-full"
              disabled={!custom.start || !custom.end}
              title={custom.start && custom.end ? undefined : "Pick the first and last day first"}
            >
              <CalendarCheck size={16} aria-hidden="true" />
              Confirm these dates
            </button>
          </form>
        )}
      </aside>

      <ConfirmDialog
        open={Boolean(locking)}
        title="Lock these dates?"
        message={
          locking
            ? `The trip will run ${rangeLabel(locking.start, locking.end)} for everyone. ${(() => {
                const free = freeOn(locking.start, locking.end);
                const missing = summary.totalMembers - free.length;
                return missing > 0
                  ? `${missing} ${missing === 1 ? "member isn't" : "members aren't"} marked as free for all of it. `
                  : "Everyone is free. ";
              })()}You can unlock it again later.`
            : ""
        }
        confirmLabel="Lock dates"
        cancelLabel="Not yet"
        onCancel={() => setLocking(null)}
        onConfirm={lock}
      />

      <ConfirmDialog
        open={unlocking}
        title="Unlock the dates?"
        message="The trip goes back to dates to be decided, and the calendar is no longer limited to them. Events already added are kept."
        confirmLabel="Unlock dates"
        cancelLabel="Keep them"
        onCancel={() => setUnlocking(false)}
        onConfirm={unlock}
      />
    </div>
  );
};

export default TripDates;
