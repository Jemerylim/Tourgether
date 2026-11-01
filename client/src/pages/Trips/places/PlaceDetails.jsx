import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Clock, Compass, Globe, Heart, Phone, Plus, Ticket, Utensils } from "lucide-react";
import SaveIndicator from "../../../components/SaveIndicator/SaveIndicator";
import { nearbyPlaces, placeDetails } from "../../../lib/places";

const Fact = ({ icon: Icon, children }) => (
  <li className="flex items-start gap-2 text-sm text-ink">
    <Icon size={15} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
    <span className="min-w-0 break-words">{children}</span>
  </li>
);

// What's known about a saved place, opened from its row: the group's notes (saved when
// the box loses focus), opening hours and links from OpenStreetMap, who wants to go,
// a move to another list, and sights and food within walking distance
const PlaceDetails = ({ place, members, lists, position, onSaveNotes, onMove, onMoveBy, onAddNearby }) => {
  const [details, setDetails] = useState(null);
  const [notes, setNotes] = useState(place.notes || "");
  const [status, setStatus] = useState("idle");
  const [nearby, setNearby] = useState(null);
  const [nearbyState, setNearbyState] = useState("idle");

  const findNearby = async () => {
    setNearbyState("loading");
    try {
      setNearby(await nearbyPlaces(place));
      setNearbyState("done");
    } catch {
      setNearbyState("failed");
    }
  };
  const memberName = (id) => members.find((member) => member._id === id)?.name;
  const voters = (place.votes || []).map(memberName).filter(Boolean);
  const addedBy = memberName(place.addedBy);

  useEffect(() => {
    let cancelled = false;
    placeDetails(place.sourceId)
      .then((found) => !cancelled && setDetails(found))
      .catch(() => !cancelled && setDetails({ failed: true }));
    return () => {
      cancelled = true;
    };
  }, [place.sourceId]);

  const save = async () => {
    if (notes === (place.notes || "")) return;
    setStatus("saving");
    setStatus((await onSaveNotes(place, notes)) ? "saved" : "error");
  };

  return (
    <div className="ml-10 mt-2 space-y-3 rounded-2xl border border-ink/10 bg-white p-4">
      {details === null ? (
        <p className="text-sm text-ink-soft">Looking up details...</p>
      ) : (
        <>
          {details.description && <p className="text-sm text-ink-soft">{details.description}</p>}
          <ul className="space-y-1.5">
            {details.openingHours && <Fact icon={Clock}>{details.openingHours}</Fact>}
            {details.cuisine && <Fact icon={Utensils}>{details.cuisine}</Fact>}
            {details.fee && <Fact icon={Ticket}>Entry fee: {details.fee}</Fact>}
            {details.website && (
              <Fact icon={Globe}>
                <a href={details.website} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                  {details.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </a>
              </Fact>
            )}
            {details.phone && (
              <Fact icon={Phone}>
                <a href={`tel:${details.phone.replace(/[^\d+]/g, "")}`} className="font-bold underline">
                  {details.phone}
                </a>
              </Fact>
            )}
          </ul>
          {!details.openingHours && !details.website && !details.phone && !details.description && (
            <p className="text-sm text-ink-soft">
              {details.failed
                ? "Couldn't look up opening hours right now. Try again in a moment."
                : "No opening hours or links on the map for this one yet."}
            </p>
          )}
        </>
      )}

      <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-ink-soft">
        <Heart size={13} aria-hidden="true" />
        {voters.length ? `${voters.join(", ")} ${voters.length === 1 ? "wants" : "want"} to go` : "No must-do votes yet"}
        {addedBy && <span>· Added by {addedBy}</span>}
      </p>

      <div>
        <label htmlFor={`place-notes-${place._id}`} className="field-label">
          Notes for the group
        </label>
        <textarea
          id={`place-notes-${place._id}`}
          className="field min-h-[4.5rem] resize-y text-sm"
          maxLength={500}
          placeholder="Book ahead, cash only, best at sunset..."
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setStatus("idle");
          }}
          onBlur={save}
        />
        <SaveIndicator status={status} onRetry={save} />
      </div>

      {(lists.length > 1 || onMoveBy) && (
        <div className="flex flex-wrap items-end gap-2">
          {lists.length > 1 && (
            <div className="min-w-[10rem] flex-1">
              <label htmlFor={`place-list-${place._id}`} className="field-label">
                List
              </label>
              <select
                id={`place-list-${place._id}`}
                className="field py-2 text-sm"
                value={place.list}
                onChange={(event) => onMove(place, lists.find((list) => list._id === event.target.value))}
              >
                {lists.map((list) => (
                  <option key={list._id} value={list._id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {onMoveBy && (
            <div className="flex gap-1">
              <button
                type="button"
                className="btn-ghost !px-2.5 !py-2"
                aria-label="Move up the list"
                disabled={position.index === 0}
                onClick={() => onMoveBy(-1)}
              >
                <ArrowUp size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn-ghost !px-2.5 !py-2"
                aria-label="Move down the list"
                disabled={position.index === position.count - 1}
                onClick={() => onMoveBy(1)}
              >
                <ArrowDown size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        {nearbyState === "idle" && (
          <button type="button" className="btn-ghost -ml-3 !px-3 !py-1.5" onClick={findNearby}>
            <Compass size={16} aria-hidden="true" />
            What's nearby?
          </button>
        )}
        {nearbyState === "loading" && <p className="text-sm text-ink-soft">Looking around {place.name}...</p>}
        {nearbyState === "failed" && (
          <p className="text-sm text-ink-soft">
            Couldn't look around right now.{" "}
            <button type="button" className="border-0 bg-transparent p-0 font-bold underline" onClick={findNearby}>
              Try again
            </button>
          </p>
        )}
        {nearbyState === "done" && (
          <>
            <p className="field-label">Within a short walk</p>
            {nearby.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing well known close by.</p>
            ) : (
              <ul className="space-y-1.5">
                {nearby.map((other) => (
                  <li key={other.sourceId} className="flex items-center gap-2 rounded-xl bg-paper py-1.5 pl-3 pr-1.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{other.name}</span>
                      <span className="block truncate text-xs text-ink-soft">{other.category || other.description}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Add ${other.name}`}
                      onClick={() => {
                        onAddNearby(other);
                        setNearby((prev) => prev.filter((item) => item.sourceId !== other.sourceId));
                      }}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-0 bg-lagoon-light p-0 text-ink hover:bg-sky"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlaceDetails;
