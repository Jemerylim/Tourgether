import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Backpack, ListTodo, Plus, User, Users, X } from "lucide-react";
import Avatar from "../../components/Avatar/Avatar";
import { useToast } from "../../components/Toast/Toast";
import QuickStart from "../../components/PageState/QuickStart";
import { fireConfetti } from "../../lib/confetti";
import { API_URL, assetUrl } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { cn } from "../../lib/utils";

const LISTS = [
  {
    value: "packing",
    title: "Packing list",
    icon: Backpack,
    placeholder: "Bluetooth speaker",
    defaultKind: "personal",
    doneWord: "packed",
    suggestions: ["Passport", "Phone charger", "Power adapter", "Sunscreen", "Toiletries", "Medication"],
    claim: "I'll bring it",
    ownerLine: (name, isMe) => (isMe ? "You're bringing it" : `${name} is bringing it`),
  },
  {
    value: "todo",
    title: "To-do",
    icon: ListTodo,
    placeholder: "Book the ferry tickets",
    defaultKind: "shared",
    doneWord: "done",
    suggestions: ["Book flights", "Book accommodation", "Buy travel insurance", "Exchange currency"],
    claim: "I'll do it",
    ownerLine: (name, isMe) => (isMe ? "You're on it" : `${name} is on it`),
  },
];

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } });
const photoOf = (user) => assetUrl(user?.profilePicture);

const isDoneFor = (item, userId) =>
  item.kind === "shared" ? item.done : item.doneBy.some((user) => user._id === userId);

// Round check that draws in. Adapted from https://21st.dev/@ssychui/components/onboarding-checklist
// with the framer-motion path animation done as a CSS stroke-dashoffset transition.
const CheckCircle = ({ on }) => (
  <span
    className={cn(
      "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors duration-150",
      on ? "border-lagoon bg-lagoon" : "border-ink/20 bg-white group-hover:border-lagoon"
    )}
  >
    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path
        d="M1.5 5.2 4 7.6 8.5 2.4"
        pathLength="1"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1"
        strokeDashoffset={on ? 0 : 1}
        className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
      />
    </svg>
  </span>
);

// Circular progress, drawn with a stroke-dasharray on an SVG circle
const ProgressRing = ({ share, label }) => {
  const radius = 15;
  const circumference = 2 * Math.PI * radius;
  return (
    <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center" role="img" aria-label={label}>
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="4" className="stroke-lagoon-light" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={cn("transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none", share === 1 ? "stroke-mustard" : "stroke-lagoon")}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - share)}
        />
      </svg>
      <span className="absolute text-[10px] font-extrabold tabular-nums text-ink">{Math.round(share * 100)}%</span>
    </span>
  );
};

const ChecklistCard = ({ list, items, members, userId, isOrganiser, onAdd, onToggle, onAssign, onDelete }) => {
  const [text, setText] = useState("");
  const [kind, setKind] = useState(list.defaultKind);
  const Icon = list.icon;
  const doneCount = items.filter((item) => isDoneFor(item, userId)).length;
  const share = items.length ? doneCount / items.length : 0;

  // A little celebration the moment the last item gets ticked, not when the list loads full
  const wasComplete = useRef(share === 1 && items.length > 0);
  useEffect(() => {
    const complete = items.length > 0 && share === 1;
    if (complete && !wasComplete.current) fireConfetti({ count: 36 });
    wasComplete.current = complete;
  }, [share, items.length]);

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    if (await onAdd({ text: text.trim(), list: list.value, kind })) setText("");
  };

  return (
    <article className="rounded-3xl bg-white p-5 drop-shadow-ticket">
      <div className="flex items-center gap-2">
        <Icon size={20} className="text-lagoon" aria-hidden="true" />
        <h3 className="flex-1 font-display text-2xl text-ink">{list.title}</h3>
        <span className="text-sm font-extrabold tabular-nums text-ink-soft">
          {doneCount} / {items.length} {list.doneWord}
        </span>
        <ProgressRing share={share} label={`${doneCount} of ${items.length} ${list.doneWord}`} />
      </div>

      {items.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-ink-soft">Nothing here yet. Add the first item below, or tap one of these.</p>
          <QuickStart
            label="Quick add"
            suggestions={list.suggestions}
            onPick={(text) => onAdd({ text, list: list.value, kind: list.defaultKind })}
          />
        </div>
      ) : (
        <ul className="mt-3">
          {items.map((item) => {
            const on = isDoneFor(item, userId);
            const owner = item.assignedTo;
            const ownerIsMe = owner?._id === userId;
            return (
              <li key={item._id} className="group/row -mx-2 flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-paper">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${on ? "Untick" : "Tick"} ${item.text}`}
                  onClick={() => onToggle(item)}
                  className="group mt-0.5 border-0 bg-transparent p-0"
                >
                  <CheckCircle on={on} />
                </button>

                <div className="min-w-0 flex-1">
                  <p className={cn("font-bold transition-colors duration-300", on ? "text-ink-soft line-through decoration-ink/30" : "text-ink")}>
                    {item.text}
                  </p>

                  {item.kind === "shared" ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                      {owner ? (
                        <>
                          <Avatar src={photoOf(owner)} name={owner.name} className="h-5 w-5 text-[9px]" />
                          <span className={ownerIsMe ? "font-bold text-ink" : ""}>{list.ownerLine(owner.name, ownerIsMe)}</span>
                          {ownerIsMe && !item.done && (
                            <button type="button" className="border-0 bg-transparent p-0 text-sm font-bold text-plum underline"
                              onClick={() => onAssign(item, null)}>
                              Not me
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <User size={14} aria-hidden="true" />
                          <span>Nobody yet</span>
                          <button
                            type="button"
                            className="rounded-full border-0 bg-mustard px-2.5 py-0.5 text-xs font-extrabold text-ink hover:bg-mustard-dark"
                            onClick={() => onAssign(item, userId)}
                          >
                            {list.claim}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2 text-sm text-ink-soft">
                      <Users size={14} aria-hidden="true" />
                      <span>
                        Everyone · {item.doneBy.length} of {members.length} {list.doneWord}
                      </span>
                      <span className="flex -space-x-1" aria-hidden="true">
                        {item.doneBy.slice(0, 5).map((user) => (
                          <Avatar key={user._id} src={photoOf(user)} name={user.name} className="h-5 w-5 text-[9px] ring-2 ring-white" />
                        ))}
                      </span>
                    </div>
                  )}
                </div>

                {(isOrganiser || item.createdBy === userId) && (
                  <button
                    type="button"
                    aria-label={`Delete ${item.text}`}
                    onClick={() => onDelete(item)}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-ink-soft opacity-100 hover:bg-lagoon-light hover:text-ink sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover/row:opacity-100"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="mt-4 border-t border-dashed border-ink/15 pt-4">
        <div className="flex gap-2">
          <label htmlFor={`add-${list.value}`} className="sr-only">Add to {list.title}</label>
          <input
            id={`add-${list.value}`}
            className="field py-2.5"
            maxLength={100}
            placeholder={list.placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            className="btn-dark shrink-0 px-4"
            disabled={!text.trim()}
            aria-label={`Add to ${list.title}`}
            title={text.trim() ? undefined : "Type an item first"}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" role="radiogroup" aria-label="Who handles it">
          {[
            { value: "shared", label: "One person", icon: User },
            { value: "personal", label: "Everyone", icon: Users },
          ].map(({ value, label, icon: KindIcon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => setKind(value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-0 px-3 py-1 font-bold transition",
                kind === value ? "bg-ink text-white" : "bg-lagoon-light/70 text-ink hover:bg-lagoon-light"
              )}
            >
              <KindIcon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
          <span className="text-ink-soft">
            {kind === "shared" ? "Someone handles it for the group" : "Each person ticks off their own"}
          </span>
        </div>
      </form>
    </article>
  );
};

// Shared packing list and to-do list. "One person" items are claimed by someone for the
// whole group; "Everyone" items are ticked off by each member for themselves.
const TripChecklist = ({ trip, members, userId, isOrganiser }) => {
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_URL}/api/checklist/trip/${trip._id}`, authHeaders())
      .then(({ data }) => setItems(data.data))
      .catch((error) => showToast(apiErrorMessage(error, "Couldn't load the lists"), "error"))
      .finally(() => setLoading(false));
  }, [trip._id, showToast]);

  const replaceItem = (updated) => setItems((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));

  const handleAdd = async (body) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/checklist`, { ...body, tripId: trip._id }, authHeaders());
      setItems((prev) => [...prev, data.data]);
      return true;
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't add that item"), "error");
      return false;
    }
  };

  // Ticks update straight away and roll back if the server says no
  const handleToggle = async (item) => {
    const me = members.find((member) => member._id === userId) || { _id: userId, name: "You" };
    const optimistic =
      item.kind === "shared"
        ? { ...item, done: !item.done, assignedTo: item.assignedTo || (!item.done ? me : null) }
        : {
            ...item,
            doneBy: isDoneFor(item, userId)
              ? item.doneBy.filter((user) => user._id !== userId)
              : [...item.doneBy, me],
          };
    replaceItem(optimistic);
    try {
      const { data } = await axios.post(`${API_URL}/api/checklist/${item._id}/toggle`, {}, authHeaders());
      replaceItem(data.data);
    } catch (error) {
      replaceItem(item);
      showToast(apiErrorMessage(error, "Couldn't update that item"), "error");
    }
  };

  const handleAssign = async (item, assignedTo) => {
    try {
      const { data } = await axios.put(`${API_URL}/api/checklist/${item._id}`, { assignedTo }, authHeaders());
      replaceItem(data.data);
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't update that item"), "error");
    }
  };

  const handleDelete = async (item) => {
    setItems((prev) => prev.filter((other) => other._id !== item._id));
    try {
      await axios.delete(`${API_URL}/api/checklist/${item._id}`, authHeaders());
    } catch (error) {
      setItems((prev) => [...prev, item].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
      showToast(apiErrorMessage(error, "Couldn't delete that item"), "error");
    }
  };

  return (
    <section aria-label="Packing and to-do lists">
      <p className="mb-5 max-w-xl text-ink-soft">
        Claim the things one person brings for the group, and tick off what everyone needs for themselves.
      </p>
      {loading ? (
        <p className="text-ink-soft">Loading lists...</p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {LISTS.map((list) => (
            <ChecklistCard
              key={list.value}
              list={list}
              items={items.filter((item) => item.list === list.value)}
              members={members}
              userId={userId}
              isOrganiser={isOrganiser}
              onAdd={handleAdd}
              onToggle={handleToggle}
              onAssign={handleAssign}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TripChecklist;
