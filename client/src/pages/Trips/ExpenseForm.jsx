import React from "react";
import dayjs from "dayjs";
import Avatar from "../../components/Avatar/Avatar";
import { assetUrl } from "../../config";
import { cn } from "../../lib/utils";
import {
  CATEGORIES,
  CURRENCIES,
  SPLIT_METHODS,
  categoryOf,
  computePaid,
  computeSplit,
  formatMoney,
  formatRate,
  idOf,
  rateText,
  toMajor,
  toMinor,
} from "./expenseMath";

const photoOf = (user) => assetUrl(user?.profilePicture);

// Form state for a new expense, or for editing `expense`
export const formFor = (expense, { userId, members, currency }) => {
  if (!expense) {
    return {
      description: "",
      amount: "",
      currency,
      category: "food",
      date: dayjs().format("YYYY-MM-DD"),
      payer: userId,
      to: "",
      paid: {},
      splitMethod: "equal",
      included: members.map((member) => member._id),
      split: {},
    };
  }

  const payers = expense.shares.filter((share) => share.paid > 0);
  const single = payers.length === 1 && toMinor(payers[0].paid, expense.currency) === toMinor(expense.amount, expense.currency);
  return {
    _id: expense._id,
    description: expense.description,
    amount: String(expense.amount),
    currency: expense.currency,
    category: expense.category,
    date: expense.date,
    payer: single ? idOf(payers[0].user) : "multiple",
    to: idOf(expense.shares.find((share) => share.owed > 0)?.user),
    paid: Object.fromEntries(payers.map((share) => [idOf(share.user), String(share.paid)])),
    splitMethod: expense.splitMethod || "equal",
    included: expense.shares.filter((share) => share.owed > 0).map((share) => idOf(share.user)),
    split: Object.fromEntries(
      expense.shares.filter((share) => share.weight > 0).map((share) => [idOf(share.user), String(share.weight)])
    ),
  };
};

// The request body for the form, or { error } when it doesn't add up
export const bodyFromForm = (form, ids) => {
  const amount = Number(form.amount);
  const isPayment = form.category === "settlement";
  if (!isPayment && !form.description.trim()) return { error: "Add what the expense was for." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount above zero." };
  const { _id, payer, to, paid: _paid, included, split, ...fields } = form;

  if (isPayment) {
    if (!to || to === payer) return { error: "Pick who received the payment." };
    return {
      body: {
        ...fields,
        amount,
        shares: [
          { user: payer, paid: amount, owed: 0, weight: 0 },
          { user: to, paid: 0, owed: amount, weight: amount },
        ],
      },
    };
  }

  const paid = computePaid(form, ids);
  if (paid.error) return { error: paid.error };
  const owed = computeSplit(form, ids);
  if (owed.error) return { error: owed.error };

  const shares = ids
    .map((id) => ({
      user: id,
      paid: toMajor(paid.paid.get(id) || 0, form.currency),
      owed: toMajor(owed.owed.get(id) || 0, form.currency),
      weight: owed.weights.get(id) || 0,
    }))
    .filter((share) => share.paid > 0 || share.owed > 0);
  return { body: { ...fields, amount, shares } };
};

// Pill-style radio group (look adapted from https://21st.dev/@originui/components/tabs)
const SegmentedControl = ({ name, label, value, options, onChange }) => (
  <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-lagoon-light/70 p-1">
    {options.map((option) => (
      <label
        key={option.value}
        className={cn(
          "cursor-pointer whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lagoon",
          value === option.value ? "bg-white text-ink shadow-float" : "text-ink-soft hover:text-ink"
        )}
      >
        <input
          type="radio"
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          className="sr-only"
        />
        {option.label}
      </label>
    ))}
  </div>
);

const PersonRow = ({ person, userId, children }) => (
  <li className="flex items-center gap-3">
    <Avatar src={photoOf(person)} name={person.name} className="h-8 w-8 shrink-0 text-xs" />
    <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">{person._id === userId ? "You" : person.name}</span>
    {children}
  </li>
);

const AmountInput = ({ id, label, value, onChange, suffix }) => (
  <span className="flex w-36 shrink-0 items-center rounded-xl border-2 border-ink/10 bg-white pr-2 focus-within:border-lagoon">
    <input
      id={id}
      aria-label={label}
      inputMode="decimal"
      placeholder="0"
      value={value || ""}
      onChange={(event) => onChange(event.target.value.replace(/[^\d.]/g, ""))}
      className="w-full min-w-0 border-0 bg-transparent px-2 py-1.5 text-right text-sm font-bold text-ink outline-none"
    />
    <span className="text-xs font-bold text-ink-soft">{suffix}</span>
  </span>
);

const FIELD_LABELS = { description: "name", amount: "amount", category: "category", date: "date", rate: "rate", split: "split" };

const describeChange = ({ field, from, to }) => {
  if (field === "split") return "changed the split";
  const show = (value) =>
    field === "category" ? categoryOf(value).label : field === "rate" && value ? formatRate(Number(value)) : value || "none";
  return `${FIELD_LABELS[field] || field}: ${show(from)} → ${show(to)}`;
};

const History = ({ history }) => (
  <details className="rounded-2xl bg-paper px-4 py-3 text-sm">
    <summary className="cursor-pointer font-extrabold text-ink">History</summary>
    <ol className="mt-2 space-y-1.5">
      {[...history].reverse().map((entry, index) => (
        <li key={index} className="text-ink-soft">
          <span className="font-bold text-ink">{entry.by?.name || "Someone"}</span> {entry.action} it
          {entry.changes?.length > 0 && ` (${entry.changes.map(describeChange).join("; ")})`}
          {" · "}
          {dayjs(entry.at).format("D MMM, h:mm a")}
        </li>
      ))}
    </ol>
  </details>
);

// Add, edit or (read-only) view an expense or settle-up payment
const ExpenseForm = ({ form, setForm, people, userId, baseCurrency, tripRate, rateFlipped, history, readOnly, error, onSubmit, onDelete, onCancel }) => {
  const isPayment = form.category === "settlement";
  const ids = people.map((person) => person._id);
  const update = (fields) => setForm((current) => ({ ...current, ...fields }));
  const needsRate = Boolean(baseCurrency) && form.currency !== baseCurrency;
  const hasAmount = Number(form.amount) > 0;

  const split = !isPayment && hasAmount ? computeSplit(form, ids) : null;
  const paid = !isPayment && hasAmount && form.payer === "multiple" ? computePaid(form, ids) : null;


  const switchMethod = (splitMethod) =>
    update({
      splitMethod,
      // Start "shares" at one each for whoever was in; the other methods start empty
      split: splitMethod === "shares" ? Object.fromEntries(form.included.map((id) => [id, "1"])) : {},
    });

  const nameOption = (person) => (person._id === userId ? `${person.name} (you)` : person.name);
  const unit = { exact: form.currency, percent: "%", shares: "×" }[form.splitMethod];

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <fieldset disabled={readOnly} className="min-w-0 space-y-4">
        {!isPayment && (
          <div>
            <label htmlFor="expense-description" className="field-label">What was it for?</label>
            <input id="expense-description" className="field" maxLength={100} placeholder="Dinner at the night market"
              value={form.description} onChange={(e) => update({ description: e.target.value })} />
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <div>
            <label htmlFor="expense-amount" className="field-label">Amount</label>
            <input id="expense-amount" className="field" inputMode="decimal" placeholder="0.00"
              value={form.amount} onChange={(e) => update({ amount: e.target.value.replace(/[^\d.]/g, "") })} />
          </div>
          <div>
            <label htmlFor="expense-currency" className="field-label">Currency</label>
            <select id="expense-currency" className="field px-3" value={form.currency}
              onChange={(e) => update({ currency: e.target.value })}>
              {[...new Set([form.currency, baseCurrency, ...CURRENCIES].filter(Boolean))].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>
        </div>

        {needsRate && (
          <p className="rounded-2xl bg-paper px-3 py-2 text-sm text-ink-soft">
            {tripRate > 0 ? (
              <>
                Converted at the trip's rate,{" "}
                <span className="font-bold text-ink">
                  {rateText({ from: form.currency, to: baseCurrency, rate: tripRate, flipped: rateFlipped })}
                </span>
                {hasAmount && <> · ≈ {formatMoney(Number(form.amount) * tripRate, baseCurrency)}</>}
              </>
            ) : (
              <>There's no {form.currency} rate yet, so this settles in {form.currency} until one is added under Rates.</>
            )}
          </p>
        )}

        {!isPayment && (
          <fieldset>
            <legend className="field-label">Category</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.category === value}
                  onClick={() => update({ category: value })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border-0 px-3 py-1.5 text-sm font-bold transition",
                    form.category === value ? "bg-ink text-white" : "bg-lagoon-light/70 text-ink hover:bg-lagoon-light"
                  )}
                >
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="expense-paid-by" className="field-label">{isPayment ? "From" : "Paid by"}</label>
            <select id="expense-paid-by" className="field" value={form.payer}
              onChange={(e) => update({ payer: e.target.value })}>
              {people.map((person) => (
                <option key={person._id} value={person._id}>{nameOption(person)}</option>
              ))}
              {!isPayment && <option value="multiple">Several people</option>}
            </select>
          </div>
          {isPayment ? (
            <div>
              <label htmlFor="expense-to" className="field-label">To</label>
              <select id="expense-to" className="field" value={form.to} onChange={(e) => update({ to: e.target.value })}>
                {people.filter((person) => person._id !== form.payer).map((person) => (
                  <option key={person._id} value={person._id}>{nameOption(person)}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="expense-date" className="field-label">Date</label>
              <input id="expense-date" type="date" className="field" value={form.date}
                onChange={(e) => update({ date: e.target.value })} />
            </div>
          )}
        </div>

        {isPayment && (
          <div>
            <label htmlFor="expense-date" className="field-label">Date</label>
            <input id="expense-date" type="date" className="field" value={form.date}
              onChange={(e) => update({ date: e.target.value })} />
          </div>
        )}

        {!isPayment && form.payer === "multiple" && (
          <fieldset>
            <legend className="field-label">Who paid how much</legend>
            <ul className="space-y-2">
              {people.map((person) => (
                <PersonRow key={person._id} person={person} userId={userId}>
                  <AmountInput
                    id={`paid-${person._id}`}
                    label={`${person.name} paid`}
                    value={form.paid[person._id]}
                    suffix={form.currency}
                    onChange={(value) => update({ paid: { ...form.paid, [person._id]: value } })}
                  />
                </PersonRow>
              ))}
            </ul>
            {paid?.error && <p className="mt-2 text-sm font-bold text-plum">{paid.error}</p>}
          </fieldset>
        )}

        {!isPayment && (
          <fieldset>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <legend className="text-sm font-extrabold text-ink">Split</legend>
              <SegmentedControl
                name="split-method"
                label="How to split"
                value={form.splitMethod}
                options={SPLIT_METHODS}
                onChange={switchMethod}
              />
            </div>

            {form.splitMethod === "equal" ? (
              <>
                <div className="mb-1.5 flex justify-end">
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 text-sm font-extrabold text-plum underline"
                    onClick={() => update({ included: form.included.length === ids.length ? [] : ids })}
                  >
                    {form.included.length === ids.length ? "Clear" : "Everyone"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {people.map((person) => {
                    const on = form.included.includes(person._id);
                    return (
                      <button
                        key={person._id}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          update({
                            included: on ? form.included.filter((id) => id !== person._id) : [...form.included, person._id],
                          })
                        }
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-bold transition",
                          on ? "border-lagoon bg-lagoon-light text-ink" : "border-transparent bg-paper text-ink-soft"
                        )}
                      >
                        <Avatar src={photoOf(person)} name={person.name} className={cn("h-7 w-7 text-[11px]", !on && "opacity-50")} />
                        {person._id === userId ? "You" : person.name}
                        {on && split && !split.error && (
                          <span className="font-normal text-ink-soft">
                            {formatMoney(toMajor(split.owed.get(person._id), form.currency), form.currency)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <ul className="space-y-2">
                {people.map((person) => (
                  <PersonRow key={person._id} person={person} userId={userId}>
                    {form.splitMethod !== "exact" && split && split.owed.get(person._id) > 0 && (
                      <span className="text-xs text-ink-soft">
                        {formatMoney(toMajor(split.owed.get(person._id), form.currency), form.currency)}
                      </span>
                    )}
                    <AmountInput
                      id={`split-${person._id}`}
                      label={`${person.name}'s part`}
                      value={form.split[person._id]}
                      suffix={unit}
                      onChange={(value) => update({ split: { ...form.split, [person._id]: value } })}
                    />
                  </PersonRow>
                ))}
              </ul>
            )}
            {split?.error && <p className="mt-2 text-sm font-bold text-plum">{split.error}</p>}
          </fieldset>
        )}
      </fieldset>

      {history?.length > 0 && <History history={history} />}

      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        {form._id && !readOnly && (
          <button type="button" className="mr-auto border-0 bg-transparent p-0 text-sm font-extrabold text-plum underline" onClick={onDelete}>
            Delete
          </button>
        )}
        <button type="button" className="btn-ghost ml-auto" onClick={onCancel}>{readOnly ? "Close" : "Cancel"}</button>
        {!readOnly && <button type="submit" className="btn-primary">{form._id ? "Save changes" : "Add expense"}</button>}
      </div>
    </form>
  );
};

export default ExpenseForm;
