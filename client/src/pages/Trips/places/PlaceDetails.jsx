import React, { useEffect, useState } from "react";
import { Clock, Globe, Heart, Phone, Ticket, Utensils } from "lucide-react";
import SaveIndicator from "../../../components/SaveIndicator/SaveIndicator";
import { placeDetails } from "../../../lib/places";

const Fact = ({ icon: Icon, children }) => (
  <li className="flex items-start gap-2 text-sm text-ink">
    <Icon size={15} className="mt-0.5 shrink-0 text-ink-soft" aria-hidden="true" />
    <span className="min-w-0 break-words">{children}</span>
  </li>
);

// What's known about a saved place, opened from its row: the group's notes (saved when
// the box loses focus), opening hours and links from OpenStreetMap, and who wants to go
const PlaceDetails = ({ place, members, onSaveNotes }) => {
  const [details, setDetails] = useState(null);
  const [notes, setNotes] = useState(place.notes || "");
  const [status, setStatus] = useState("idle");
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
    </div>
  );
};

export default PlaceDetails;
