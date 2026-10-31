import React, { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { CalendarCheck, Check, Plus, Trash2, Trophy, Vote, X } from "lucide-react";
import Avatar from "../../components/Avatar/Avatar";
import Modal from "../../components/Modal/Modal";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import TimePicker from "../../components/TimePicker/TimePicker";
import { useToast } from "../../components/Toast/Toast";
import { API_URL } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { cn } from "../../lib/utils";

const MAX_OPTIONS = 10;
const emptyDraft = { question: "", options: ["", ""], allowMultiple: false, date: "", startTime: "", endTime: "" };

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } });

const photoOf = (user) => (user.profilePicture ? `${API_URL}/${user.profilePicture}` : undefined);

const slotLabel = ({ date, startTime, endTime }) =>
  date ? `${dayjs(date).format("ddd D MMM")}${startTime ? `, ${startTime}–${endTime}` : ""}` : null;

const totalVoters = (poll) => new Set(poll.options.flatMap((option) => option.votes.map((voter) => voter._id))).size;

// Date + start/end time inputs, shared by the "new poll" and "close poll" forms.
const SlotFields = ({ idPrefix, slot, onChange, min, max }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <div>
      <label htmlFor={`${idPrefix}-date`} className="field-label">Date</label>
      <input id={`${idPrefix}-date`} type="date" className="field" value={slot.date} min={min} max={max}
        onChange={(e) => onChange({ date: e.target.value })} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-start`} className="field-label">Starts</label>
      <TimePicker id={`${idPrefix}-start`} value={slot.startTime}
        onChange={(startTime) => onChange({ startTime })} />
    </div>
    <div>
      <label htmlFor={`${idPrefix}-end`} className="field-label">Ends</label>
      <TimePicker id={`${idPrefix}-end`} value={slot.endTime}
        onChange={(endTime) => onChange({ endTime })} />
    </div>
  </div>
);

const PollCard = ({ poll, userId, canManage, onVote, onSuggest, onClose, onDelete }) => {
  const [suggestion, setSuggestion] = useState("");
  const [busy, setBusy] = useState(false);
  const isOpen = poll.status === "open";
  const voters = totalVoters(poll);
  const mostVotes = Math.max(...poll.options.map((option) => option.votes.length));
  const myChoices = poll.options
    .filter((option) => option.votes.some((voter) => voter._id === userId))
    .map((option) => option._id);
  const slot = slotLabel(poll);

  const choose = async (optionId) => {
    if (!isOpen || busy) return;
    const chosen = myChoices.includes(optionId);
    const next = poll.allowMultiple
      ? chosen ? myChoices.filter((id) => id !== optionId) : [...myChoices, optionId]
      : chosen ? [] : [optionId];
    setBusy(true);
    await onVote(poll._id, next);
    setBusy(false);
  };

  const suggest = async (e) => {
    e.preventDefault();
    if (!suggestion.trim()) return;
    if (await onSuggest(poll._id, suggestion.trim())) setSuggestion("");
  };

  return (
    <article className="rounded-3xl bg-white p-5 drop-shadow-ticket">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl text-ink">{poll.question}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            {poll.createdBy?.name ? `Asked by ${poll.createdBy.name} · ` : ""}
            {poll.allowMultiple ? "Pick any" : "Pick one"} · {voters} {voters === 1 ? "vote" : "votes"}
            {slot && ` · ${slot}`}
          </p>
        </div>
        {!isOpen && (
          <span className="rounded-full bg-lagoon-light px-2.5 py-1 text-xs font-extrabold text-ink">Closed</span>
        )}
        {canManage && (
          <button
            type="button"
            aria-label="Delete poll"
            onClick={() => onDelete(poll)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-lagoon-light"
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {poll.options.map((option) => {
          const count = option.votes.length;
          const share = voters ? Math.round((count / voters) * 100) : 0;
          const mine = myChoices.includes(option._id);
          const won = poll.winningOption === option._id;
          const leading = isOpen && count > 0 && count === mostVotes;
          return (
            <li key={option._id}>
              <button
                type="button"
                onClick={() => choose(option._id)}
                disabled={!isOpen || busy}
                aria-pressed={isOpen ? mine : undefined}
                className={cn(
                  "relative flex w-full items-center gap-3 overflow-hidden rounded-xl border-2 bg-lagoon-light/40 px-4 py-3 text-left transition",
                  isOpen ? "cursor-pointer hover:border-lagoon/50 disabled:cursor-wait" : "cursor-default",
                  mine ? "border-lagoon" : "border-transparent",
                  won && "border-mustard bg-mustard/20"
                )}
              >
                {/* Vote share bar behind the text */}
                <span
                  aria-hidden="true"
                  className={cn("absolute inset-y-0 left-0 transition-all", won ? "bg-mustard/40" : "bg-lagoon-light")}
                  style={{ width: `${share}%` }}
                />
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                  {won ? (
                    <Trophy size={18} className="text-ink" aria-label="Winner" />
                  ) : (
                    isOpen && (
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center border-2 border-lagoon",
                          poll.allowMultiple ? "rounded-md" : "rounded-full",
                          mine && "bg-lagoon text-white"
                        )}
                      >
                        {mine && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                      </span>
                    )
                  )}
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">{option.text}</span>
                  {leading && <span className="text-xs font-extrabold uppercase tracking-wide text-lagoon">Leading</span>}
                </span>
                <span className="relative flex -space-x-1.5" aria-hidden="true">
                  {option.votes.slice(0, 4).map((voter) => (
                    <Avatar key={voter._id} src={photoOf(voter)} name={voter.name}
                      className="h-6 w-6 text-[10px] ring-2 ring-white" />
                  ))}
                </span>
                <span className="relative w-14 shrink-0 text-right text-sm font-extrabold text-ink" title={option.votes.map((voter) => voter.name).join(", ")}>
                  {count} · {share}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!isOpen && poll.event && (
        <p className="mt-3 flex items-center gap-2 text-sm font-bold text-lagoon">
          <CalendarCheck size={16} aria-hidden="true" />
          Added to the trip calendar
        </p>
      )}

      {isOpen && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {poll.options.length < MAX_OPTIONS && (
            <form onSubmit={suggest} className="flex min-w-0 flex-1 gap-2">
              <label htmlFor={`suggest-${poll._id}`} className="sr-only">Suggest an option</label>
              <input
                id={`suggest-${poll._id}`}
                className="field py-2 text-sm"
                placeholder="Suggest another option"
                maxLength={100}
                value={suggestion}
                onChange={(e) => setSuggestion(e.target.value)}
              />
              <button type="submit" className="btn-ghost shrink-0 px-3" aria-label="Add option" disabled={!suggestion.trim()}>
                <Plus size={18} aria-hidden="true" />
              </button>
            </form>
          )}
          {canManage && (
            <button type="button" className="btn-dark ml-auto" onClick={() => onClose(poll)}>
              Close poll
            </button>
          )}
        </div>
      )}
    </article>
  );
};

// Group polls for a trip ("Which restaurant on night 2?"). Members vote; when the poll
// closes, the winning option can go straight onto the trip calendar via `onEventCreated`.
const TripPolls = ({ trip, userId, isOrganiser, onEventCreated }) => {
  const { showToast } = useToast();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [formError, setFormError] = useState("");
  const [closing, setClosing] = useState(null);
  const [closeForm, setCloseForm] = useState({ optionId: "", createEvent: true, date: "", startTime: "", endTime: "" });
  const [deleting, setDeleting] = useState(null);

  const minDate = trip.startDate ? dayjs(trip.startDate).format("YYYY-MM-DD") : undefined;
  const maxDate = trip.endDate ? dayjs(trip.endDate).format("YYYY-MM-DD") : undefined;

  useEffect(() => {
    axios
      .get(`${API_URL}/api/polls/trip/${trip._id}`, authHeaders())
      .then(({ data }) => setPolls(data.data))
      .catch((error) => {
        console.error("Error fetching polls:", error);
        showToast(apiErrorMessage(error, "Couldn't load the polls"), "error");
      })
      .finally(() => setLoading(false));
  }, [trip._id, showToast]);

  const replacePoll = (updated) => setPolls((prev) => prev.map((poll) => (poll._id === updated._id ? updated : poll)));

  const canManage = (poll) => isOrganiser || poll.createdBy?._id === userId;

  const handleVote = async (pollId, optionIds) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/polls/${pollId}/vote`, { optionIds }, authHeaders());
      replacePoll(data.data);
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't save your vote"), "error");
    }
  };

  const handleSuggest = async (pollId, text) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/polls/${pollId}/options`, { text }, authHeaders());
      replacePoll(data.data);
      return true;
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't add that option"), "error");
      return false;
    }
  };

  const closeCreateForm = () => {
    setCreating(false);
    setDraft(emptyDraft);
    setFormError("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const options = draft.options.map((text) => text.trim()).filter(Boolean);
    const slotParts = [draft.date, draft.startTime, draft.endTime].filter(Boolean).length;
    if (!draft.question.trim()) return setFormError("Add a question for the group.");
    if (options.length < 2) return setFormError("Add at least two options.");
    if (new Set(options.map((text) => text.toLowerCase())).size !== options.length) {
      return setFormError("Each option has to be different.");
    }
    if (slotParts > 0 && slotParts < 3) return setFormError("Fill in the date and both times, or leave them all empty.");
    if (slotParts === 3 && draft.endTime <= draft.startTime) return setFormError("The end time has to be after the start time.");

    try {
      const { data } = await axios.post(
        `${API_URL}/api/polls`,
        { ...draft, question: draft.question.trim(), options, tripId: trip._id },
        authHeaders()
      );
      setPolls((prev) => [data.data, ...prev]);
      closeCreateForm();
      showToast("Poll created", "success");
    } catch (error) {
      setFormError(apiErrorMessage(error, "Couldn't create the poll"));
    }
  };

  const openCloseForm = (poll) => {
    // Preselect the option with the most votes; in a tie the closer picks
    const leader = [...poll.options].sort((a, b) => b.votes.length - a.votes.length)[0];
    setCloseForm({
      optionId: leader?._id || "",
      createEvent: true,
      date: poll.date || "",
      startTime: poll.startTime || "",
      endTime: poll.endTime || "",
    });
    setFormError("");
    setClosing(poll);
  };

  const handleClose = async (e) => {
    e.preventDefault();
    const { createEvent, date, startTime, endTime } = closeForm;
    if (createEvent && (!date || !startTime || !endTime)) {
      return setFormError("Pick a date and times to add the winner to the calendar.");
    }
    if (createEvent && endTime <= startTime) return setFormError("The end time has to be after the start time.");

    try {
      const { data } = await axios.post(`${API_URL}/api/polls/${closing._id}/close`, closeForm, authHeaders());
      replacePoll(data.data.poll);
      if (data.data.event) onEventCreated(data.data.event);
      setClosing(null);
      showToast(data.data.event ? "Poll closed and added to the calendar" : "Poll closed", "success");
    } catch (error) {
      setFormError(apiErrorMessage(error, "Couldn't close the poll"));
    }
  };

  const handleDelete = async () => {
    const poll = deleting;
    setDeleting(null);
    try {
      await axios.delete(`${API_URL}/api/polls/${poll._id}`, authHeaders());
      setPolls((prev) => prev.filter((p) => p._id !== poll._id));
      showToast("Poll deleted", "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't delete the poll"), "error");
    }
  };

  const tied = closing
    ? closing.options.filter(
        (option) => option.votes.length === Math.max(...closing.options.map((o) => o.votes.length))
      ).length > 1
    : false;

  return (
    <section className="mt-10" aria-labelledby="polls-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="polls-heading" className="font-display text-3xl text-ink">Polls</h2>
          <p className="text-ink-soft">Can't decide? Put it to a vote. The winner can go straight onto the calendar.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
          <Vote size={18} aria-hidden="true" />
          New poll
        </button>
      </div>

      {loading ? (
        <p className="text-ink-soft">Loading polls...</p>
      ) : polls.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-ink/15 p-8 text-center">
          <p className="font-bold text-ink">No polls yet</p>
          <p className="mt-1 text-sm text-ink-soft">Ask the group something like "Which restaurant on night 2?"</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {polls.map((poll) => (
            <PollCard
              key={poll._id}
              poll={poll}
              userId={userId}
              canManage={canManage(poll)}
              onVote={handleVote}
              onSuggest={handleSuggest}
              onClose={openCloseForm}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {/* New poll */}
      <Modal open={creating} onClose={closeCreateForm} title="New poll" className="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-4" noValidate>
          <div>
            <label htmlFor="poll-question" className="field-label">Question</label>
            <input id="poll-question" className="field" maxLength={150} placeholder="Which restaurant on night 2?"
              value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          </div>

          <fieldset>
            <legend className="field-label">Options</legend>
            <div className="space-y-2">
              {draft.options.map((text, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    className="field py-2.5"
                    aria-label={`Option ${index + 1}`}
                    maxLength={100}
                    placeholder={`Option ${index + 1}`}
                    value={text}
                    onChange={(e) =>
                      setDraft({ ...draft, options: draft.options.map((t, i) => (i === index ? e.target.value : t)) })
                    }
                  />
                  {draft.options.length > 2 && (
                    <button
                      type="button"
                      aria-label={`Remove option ${index + 1}`}
                      onClick={() => setDraft({ ...draft, options: draft.options.filter((_, i) => i !== index) })}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-lagoon-light"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {draft.options.length < MAX_OPTIONS && (
              <button type="button" className="btn-ghost mt-2 px-3"
                onClick={() => setDraft({ ...draft, options: [...draft.options, ""] })}>
                <Plus size={16} aria-hidden="true" />
                Add option
              </button>
            )}
          </fieldset>

          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" className="h-4 w-4 accent-lagoon" checked={draft.allowMultiple}
              onChange={(e) => setDraft({ ...draft, allowMultiple: e.target.checked })} />
            Members can pick more than one option
          </label>

          <div>
            <p className="field-label">When would it happen? <span className="font-normal text-ink-soft">(optional)</span></p>
            <SlotFields idPrefix="poll" slot={draft} min={minDate} max={maxDate}
              onChange={(change) => setDraft({ ...draft, ...change })} />
          </div>

          {formError && <p role="alert" className="text-sm font-bold text-red-700">{formError}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={closeCreateForm}>Cancel</button>
            <button type="submit" className="btn-primary">Create poll</button>
          </div>
        </form>
      </Modal>

      {/* Close poll */}
      <Modal open={Boolean(closing)} onClose={() => setClosing(null)} title="Close poll" className="max-w-lg">
        {closing && (
          <form onSubmit={handleClose} className="space-y-4" noValidate>
            <fieldset>
              <legend className="field-label">
                {tied ? "It's a tie. Pick the winner" : "Winner"}
              </legend>
              <div className="space-y-2">
                {[...closing.options]
                  .sort((a, b) => b.votes.length - a.votes.length)
                  .map((option) => (
                    <label key={option._id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-lagoon-light/40 px-4 py-2.5",
                        closeForm.optionId === option._id ? "border-lagoon" : "border-transparent"
                      )}>
                      <input type="radio" name="winner" className="accent-lagoon" value={option._id}
                        checked={closeForm.optionId === option._id}
                        onChange={() => setCloseForm({ ...closeForm, optionId: option._id })} />
                      <span className="flex-1 font-bold text-ink">{option.text}</span>
                      <span className="text-sm text-ink-soft">
                        {option.votes.length} {option.votes.length === 1 ? "vote" : "votes"}
                      </span>
                    </label>
                  ))}
              </div>
            </fieldset>

            <label className="flex items-center gap-2 text-sm font-bold text-ink">
              <input type="checkbox" className="h-4 w-4 accent-lagoon" checked={closeForm.createEvent}
                onChange={(e) => setCloseForm({ ...closeForm, createEvent: e.target.checked })} />
              Add the winner to the trip calendar
            </label>

            {closeForm.createEvent && (
              <SlotFields idPrefix="close" slot={closeForm} min={minDate} max={maxDate}
                onChange={(change) => setCloseForm({ ...closeForm, ...change })} />
            )}

            <p className="text-sm text-ink-soft">Voting stops once the poll is closed.</p>

            {formError && <p role="alert" className="text-sm font-bold text-red-700">{formError}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setClosing(null)}>Cancel</button>
              <button type="submit" className="btn-dark">Close poll</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this poll?"
        message={`"${deleting?.question}" and its votes will be removed for everyone. Any event it added stays on the calendar.`}
        confirmLabel="Delete poll"
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </section>
  );
};

export default TripPolls;
