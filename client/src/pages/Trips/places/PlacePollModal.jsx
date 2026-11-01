import React, { useState } from "react";
import { Heart } from "lucide-react";
import Modal from "../../../components/Modal/Modal";

const MAX_OPTIONS = 10;

// Put some of a list's places to a vote. Starts with the most-wanted four ticked.
const PlacePollModal = ({ list, places, onClose, onCreate }) => {
  const [question, setQuestion] = useState(`Which of these ${list.name.toLowerCase()} should we do?`);
  const [picked, setPicked] = useState(
    () => new Set([...places].sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0)).slice(0, 4).map((place) => place._id))
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_OPTIONS) next.add(id);
      return next;
    });

  const submit = async (event) => {
    event.preventDefault();
    if (!question.trim()) return setError("Add a question.");
    if (picked.size < 2) return setError("Pick at least two places.");
    setSaving(true);
    const message = await onCreate(question.trim(), places.filter((place) => picked.has(place._id)));
    setSaving(false);
    if (message) setError(message);
  };

  return (
    <Modal open onClose={onClose} title="Ask the group">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="place-poll-question" className="field-label">
            Question
          </label>
          <input
            id="place-poll-question"
            className="field"
            maxLength={150}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </div>
        <fieldset>
          <legend className="field-label">Options ({picked.size} of up to {MAX_OPTIONS})</legend>
          <ul className="max-h-72 space-y-1.5 overflow-y-auto">
            {places.map((place) => (
              <li key={place._id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-paper px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-lagoon"
                    checked={picked.has(place._id)}
                    disabled={!picked.has(place._id) && picked.size >= MAX_OPTIONS}
                    onChange={() => toggle(place._id)}
                  />
                  <span className="min-w-0 flex-1 truncate font-bold text-ink">{place.name}</span>
                  {place.votes?.length > 0 && (
                    <span className="flex items-center gap-1 text-xs font-extrabold text-plum">
                      <Heart size={12} className="fill-current" aria-hidden="true" />
                      {place.votes.length}
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm font-bold text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            Start poll
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PlacePollModal;
