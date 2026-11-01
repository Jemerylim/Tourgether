import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { ArrowLeftRight, ArrowRight, Download, Pencil, Plus, RotateCcw, Search, Wallet } from "lucide-react";
import Avatar from "../../components/Avatar/Avatar";
import Modal from "../../components/Modal/Modal";
import ConfirmDialog from "../../components/Modal/ConfirmDialog";
import { EmptyState } from "../../components/PageState/PageState";
import QuickStart from "../../components/PageState/QuickStart";
import { useToast } from "../../components/Toast/Toast";
import { API_URL, assetUrl } from "../../config";
import { apiErrorMessage } from "../../lib/apiError";
import { cn } from "../../lib/utils";
import ExpenseForm, { bodyFromForm, formFor } from "./ExpenseForm";
import { CATEGORIES, CURRENCIES, categoryOf, expensesCsv, formatMoney, idOf, invertRate, netOf, rateText } from "./expenseMath";

const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` } });
const photoOf = (user) => assetUrl(user?.profilePicture);

// Simplify debts and which way round rates read are per-viewer preferences, so they live
// in this browser only
const SIMPLIFY_KEY = "tourgether.simplifyDebts";
const RATE_FLIPPED_KEY = "tourgether.rateFlipped";
const readSetting = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === "on";
  } catch {
    return fallback;
  }
};
const writeSetting = (key, on) => {
  try {
    localStorage.setItem(key, on ? "on" : "off");
  } catch {
    // Not remembered, but the setting still works for this visit
  }
};

const downloadFile = (name, text) => {
  const url = URL.createObjectURL(new Blob([`﻿${text}`], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
};

// Trip expenses: who paid for what, and the fewest payments that square everyone up.
const TripExpenses = ({ trip, members, userId, isOrganiser }) => {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [summary, setSummary] = useState([]);
  const [baseCurrency, setBaseCurrency] = useState(trip.baseCurrency || null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed; { _id? ...fields } = add / edit
  const [viewing, setViewing] = useState(null); // the expense open in the form, if any
  const [formError, setFormError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [settling, setSettling] = useState(null); // { from, to, amount, owed, currency }
  const [simplify, setSimplify] = useState(() => readSetting(SIMPLIFY_KEY, true));
  const [rateFlipped, setRateFlipped] = useState(() => readSetting(RATE_FLIPPED_KEY, false));
  const [filters, setFilters] = useState({ query: "", category: "", mine: false });
  const [rates, setRates] = useState(new Map()); // currency -> trip rate into the base currency
  const [editingRate, setEditingRate] = useState(null); // { currency, text } while changing a rate

  const applyData = ({ expenses: list, deleted: bin, summary: totals, baseCurrency: base, rates: tripRateList }) => {
    setExpenses(list);
    setDeleted(bin);
    setSummary(totals);
    setBaseCurrency(base);
    setRates(new Map(tripRateList.map(({ currency, rate }) => [currency, rate])));
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/api/expenses/trip/${trip._id}`, authHeaders())
      .then(({ data }) => applyData(data.data))
      .catch((error) => showToast(apiErrorMessage(error, "Couldn't load the expenses"), "error"))
      .finally(() => setLoading(false));
  }, [trip._id, showToast]);

  // Everyone who appears anywhere: current members plus anyone on an older expense
  const people = useMemo(() => {
    const map = new Map(members.map((member) => [member._id, member]));
    [...expenses, ...deleted].forEach((expense) =>
      expense.shares.forEach(({ user }) => {
        if (user?._id && !map.has(user._id)) map.set(user._id, user);
      })
    );
    return map;
  }, [members, expenses, deleted]);

  const nameOf = (id, { subject = false } = {}) =>
    id === userId ? (subject ? "You" : "you") : people.get(id)?.name || "Someone";

  const payersOf = (expense) => expense.shares.filter((share) => share.paid > 0).map((share) => idOf(share.user));

  const canManage = (expense) =>
    isOrganiser || idOf(expense.createdBy) === userId || payersOf(expense).includes(userId);

  // Every currency other than the base one that the trip uses or has a rate for
  const rateCurrencies = useMemo(
    () =>
      baseCurrency
        ? [...new Set([...expenses.map((expense) => expense.currency), ...rates.keys()])].filter((code) => code !== baseCurrency)
        : [],
    [expenses, rates, baseCurrency]
  );

  const needsRate = (expense) => Boolean(baseCurrency) && expense.currency !== baseCurrency && !rates.has(expense.currency);

  const closeForm = () => {
    setForm(null);
    setViewing(null);
  };

  // `description` pre-fills the title, for the suggestion chips on the empty state
  const openNew = (description = "") => {
    setFormError("");
    setViewing(null);
    const blank = formFor(null, { userId, members, currency: expenses[0]?.currency || baseCurrency || "USD" });
    setForm(typeof description === "string" && description ? { ...blank, description } : blank);
  };

  const openExpense = (expense) => {
    setFormError("");
    setViewing(expense);
    setForm(formFor(expense, { userId, members }));
  };

  const save = async (event) => {
    event.preventDefault();
    const { error, body } = bodyFromForm(form, formPeople.map((person) => person._id));
    if (error) return setFormError(error);

    try {
      const { data } = form._id
        ? await axios.put(`${API_URL}/api/expenses/${form._id}`, body, authHeaders())
        : await axios.post(`${API_URL}/api/expenses`, { ...body, tripId: trip._id }, authHeaders());
      applyData(data.data);
      showToast(form._id ? "Expense updated" : "Expense added", "success");
      closeForm();
    } catch (error) {
      setFormError(apiErrorMessage(error, "Couldn't save the expense"));
    }
  };

  const remove = async () => {
    setConfirmingDelete(false);
    try {
      const { data } = await axios.delete(`${API_URL}/api/expenses/${form._id}`, authHeaders());
      applyData(data.data);
      showToast(form.category === "settlement" ? "Payment deleted" : "Expense deleted", "success");
      closeForm();
    } catch (error) {
      setFormError(apiErrorMessage(error, "Couldn't delete the expense"));
    }
  };

  const restore = async (expense) => {
    try {
      const { data } = await axios.post(`${API_URL}/api/expenses/${expense._id}/restore`, {}, authHeaders());
      applyData(data.data);
      showToast(`Restored "${expense.description}"`, "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't restore the expense"), "error");
    }
  };

  const changeBaseCurrency = async (value) => {
    try {
      const { data } = await axios.put(
        `${API_URL}/api/expenses/trip/${trip._id}/currency`,
        { baseCurrency: value || null },
        authHeaders()
      );
      applyData(data.data);
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't change the settle-up currency"), "error");
    }
  };

  // Save the trip rate being edited (typed in the direction shown), or remove it when
  // called with null. Every expense in that currency is converted with it.
  const saveRate = async (event) => {
    event?.preventDefault();
    const { currency, text } = editingRate;
    const typed = Number(text);
    const rate = event === null ? null : rateFlipped ? 1 / typed : typed;
    if (rate !== null && !(rate > 0)) return;
    try {
      const { data } = await axios.put(`${API_URL}/api/expenses/trip/${trip._id}/rates`, { currency, rate }, authHeaders());
      applyData(data.data);
      setEditingRate(null);
      showToast(rate === null ? `${currency} now settles separately` : `${currency} now settles in ${baseCurrency}`, "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't save the rate"), "error");
    }
  };

  const toggleSimplify = () => {
    writeSetting(SIMPLIFY_KEY, !simplify);
    setSimplify(!simplify);
  };

  // Show rates the other way round, converting a rate that's being typed
  const switchRateDirection = (flipped) => {
    if (editingRate) setEditingRate({ ...editingRate, text: invertRate(editingRate.text) });
    writeSetting(RATE_FLIPPED_KEY, flipped);
    setRateFlipped(flipped);
  };

  // A settle-up payment is recorded as an expense the debtor paid and the creditor owes.
  // The amount can be less than what's owed, for paying back in parts.
  const recordPayment = async (event) => {
    event.preventDefault();
    const { from, to, amount, currency } = settling;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    setSettling(null);
    try {
      const { data } = await axios.post(
        `${API_URL}/api/expenses`,
        {
          tripId: trip._id,
          category: "settlement",
          description: "Payment",
          amount: value,
          currency,
          date: dayjs().format("YYYY-MM-DD"),
          shares: [
            { user: from, paid: value, owed: 0 },
            { user: to, paid: 0, owed: value, weight: value },
          ],
        },
        authHeaders()
      );
      applyData(data.data);
      showToast("Payment recorded", "success");
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't record the payment"), "error");
    }
  };

  const exportCsv = () =>
    downloadFile(`${trip.name || "trip"} expenses.csv`.replace(/[\\/:*?"<>|]/g, ""), expensesCsv(expenses, people, baseCurrency, rates));

  // People offered in the form: current members, plus anyone already on the expense being edited
  const formPeople = form
    ? [...new Set([...members.map((member) => member._id), ...(viewing?.shares || []).map((share) => idOf(share.user))])]
        .map((id) => people.get(id))
        .filter(Boolean)
    : [];

  const query = filters.query.trim().toLowerCase();
  const shown = expenses.filter(
    (expense) =>
      (!query || expense.description.toLowerCase().includes(query)) &&
      (!filters.category || expense.category === filters.category) &&
      (!filters.mine || expense.shares.some((share) => idOf(share.user) === userId))
  );

  return (
    <section aria-label="Expenses">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-xl text-ink-soft">
          Log what everyone pays for. Tourgether works out who owes whom with as few payments as possible.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {expenses.length > 0 && (
            <button type="button" className="btn-ghost" onClick={exportCsv}>
              <Download size={18} aria-hidden="true" />
              Export CSV
            </button>
          )}
          <button type="button" className="btn-primary" onClick={openNew}>
            <Plus size={18} aria-hidden="true" />
            Add expense
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="base-currency" className="font-extrabold text-ink">Settle up in</label>
        {isOrganiser ? (
          <select id="base-currency" className="field w-auto py-1.5" value={baseCurrency || ""}
            onChange={(e) => changeBaseCurrency(e.target.value)}>
            <option value="">Each currency separately</option>
            {[...new Set([baseCurrency, ...CURRENCIES].filter(Boolean))].map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        ) : (
          <span id="base-currency" className="font-bold text-ink-soft">{baseCurrency || "each currency separately"}</span>
        )}
      </div>

      {baseCurrency && (rateCurrencies.length > 0 || isOrganiser) && (
        <div className="-mt-3 mb-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-extrabold text-ink">Rates</span>
          {[...new Set([...rateCurrencies, editingRate?.currency].filter(Boolean))].map((currency) => {
            const rate = rates.get(currency);
            const [left, right] = rateFlipped ? [baseCurrency, currency] : [currency, baseCurrency];
            if (editingRate?.currency === currency) {
              return (
                <form key={currency} className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-lagoon-light py-1 pl-3 pr-1 font-bold text-ink" onSubmit={saveRate}>
                  <label htmlFor="trip-rate">1 {left} =</label>
                  <input
                    id="trip-rate"
                    autoFocus
                    className="w-24 rounded-full border-0 bg-white px-2 py-0.5 text-right text-sm font-bold text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-lagoon"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={editingRate.text}
                    onChange={(e) => setEditingRate({ ...editingRate, text: e.target.value.replace(/[^\d.]/g, "") })}
                    onKeyDown={(e) => e.key === "Escape" && setEditingRate(null)}
                  />
                  <span>{right}</span>
                  <button type="submit" className="rounded-full border-0 bg-ink px-2.5 py-0.5 text-xs font-extrabold text-white" disabled={!(Number(editingRate.text) > 0)}>
                    Save
                  </button>
                  {rate > 0 && (
                    <button type="button" className="rounded-full border-0 bg-transparent px-1.5 py-0.5 text-xs font-extrabold text-plum underline" onClick={() => saveRate(null)}>
                      Remove
                    </button>
                  )}
                  <button type="button" className="rounded-full border-0 bg-transparent px-1.5 py-0.5 text-xs font-extrabold text-ink-soft" onClick={() => setEditingRate(null)}>
                    Cancel
                  </button>
                </form>
              );
            }
            const label = rate > 0 ? rateText({ from: currency, to: baseCurrency, rate, flipped: rateFlipped }) : `${currency}: no rate yet`;
            return isOrganiser ? (
              <button
                key={currency}
                type="button"
                title={rate > 0 ? "Change this rate" : "Add a rate"}
                onClick={() => setEditingRate({ currency, text: rate > 0 ? String(Number((rateFlipped ? 1 / rate : rate).toPrecision(6))) : "" })}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-0 px-3 py-1 font-bold text-ink",
                  rate > 0 ? "bg-lagoon-light hover:bg-hill" : "bg-mustard/40 hover:bg-mustard/60"
                )}
              >
                {label}
                <Pencil size={12} aria-hidden="true" />
              </button>
            ) : (
              <span key={currency} className={cn("rounded-full px-3 py-1 font-bold text-ink", rate > 0 ? "bg-lagoon-light" : "bg-mustard/40")}>
                {label}
              </span>
            );
          })}
          {isOrganiser && !editingRate && (
            <label className="inline-flex items-center">
              <span className="sr-only">Add a rate for another currency</span>
              <select
                className="rounded-full border-0 bg-transparent py-1 text-xs font-extrabold text-ink-soft hover:text-ink"
                value=""
                onChange={(e) => e.target.value && setEditingRate({ currency: e.target.value, text: "" })}
              >
                <option value="">+ Add currency</option>
                {CURRENCIES.filter((code) => code !== baseCurrency && !rateCurrencies.includes(code)).map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </label>
          )}
          {(rateCurrencies.length > 0 || editingRate) && (
            <button
              type="button"
              onClick={() => switchRateDirection(!rateFlipped)}
              className="inline-flex items-center gap-1.5 rounded-full border-0 bg-transparent px-2 py-1 text-xs font-extrabold text-ink-soft hover:text-ink"
            >
              <ArrowLeftRight size={14} aria-hidden="true" />
              Show as 1 {rateFlipped ? (rateCurrencies.length === 1 ? rateCurrencies[0] : "other currency") : baseCurrency}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-ink-soft">Loading expenses...</p>
      ) : expenses.length === 0 && deleted.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No expenses yet"
          text="Log the first one, like the hotel deposit or tonight's dinner, and Tourgether will keep track of who owes whom."
        >
          <QuickStart
            label="Common first expenses"
            suggestions={["Hotel deposit", "Flights", "Groceries", "Taxi", "Dinner"]}
            onPick={(description) => openNew(description)}
          />
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          {/* Settle up, one card per currency */}
          <div className="space-y-6">
            {summary.map((group) => {
              const mine = group.balances.find((balance) => balance.user === userId)?.amount || 0;
              const myTotals = group.people.find((person) => person.user === userId);
              const unconverted = baseCurrency && group.currency !== baseCurrency;
              const owings = simplify ? group.transfers : group.debts;
              return (
                <article key={group.currency} className="rounded-3xl bg-white p-5 drop-shadow-ticket">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl text-ink">Settle up</h3>
                    {(summary.length > 1 || unconverted) && (
                      <span className="rounded-full bg-lagoon-light px-2.5 py-1 text-xs font-extrabold text-ink">
                        {group.currency}
                      </span>
                    )}
                  </div>
                  {unconverted && (
                    <p className="mt-2 rounded-2xl bg-mustard/30 px-3 py-2 text-sm text-ink">
                      There's no {group.currency} rate to {baseCurrency} yet, so these are settled separately.{" "}
                      {isOrganiser ? "Add one under Rates above." : "The organiser can add one under Rates."}
                    </p>
                  )}

                  <div
                    className={cn(
                      "mt-4 rounded-2xl px-4 py-3",
                      mine > 0 ? "bg-lagoon-light" : mine < 0 ? "bg-plum/10" : "bg-paper"
                    )}
                  >
                    <p className="text-sm font-bold text-ink-soft">Your balance</p>
                    <p className={cn("font-display text-3xl", mine < 0 ? "text-plum" : "text-ink")}>
                      {mine > 0 && `You're owed ${formatMoney(mine, group.currency)}`}
                      {mine < 0 && `You owe ${formatMoney(-mine, group.currency)}`}
                      {mine === 0 && "You're all square"}
                    </p>
                    {myTotals && (
                      <p className="mt-1 text-sm text-ink-soft">
                        You paid <span className="font-extrabold text-ink">{formatMoney(myTotals.paid, group.currency)}</span>
                        {" · "}your share of the trip{" "}
                        <span className="font-extrabold text-ink">{formatMoney(myTotals.share, group.currency)}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-extrabold text-ink">{simplify ? "Payments to settle up" : "Who owes whom"}</h4>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={simplify}
                      onClick={toggleSimplify}
                      className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-xs font-extrabold text-ink-soft"
                    >
                      Simplify debts
                      <span className={cn("relative h-5 w-9 rounded-full transition", simplify ? "bg-lagoon" : "bg-ink/20")}>
                        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", simplify ? "left-[1.125rem]" : "left-0.5")} />
                      </span>
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {simplify
                      ? "Debts are combined so everyone settles with as few payments as possible."
                      : "Each debt as it came from the expenses, before combining."}
                  </p>
                  {owings.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-soft">Everyone is settled up.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {owings.map((transfer) => {
                        const involved = [transfer.from, transfer.to].includes(userId);
                        return (
                          <li key={`${transfer.from}-${transfer.to}`} className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5">
                            <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
                              <Avatar src={photoOf(people.get(transfer.from))} name={people.get(transfer.from)?.name} className="h-8 w-8 text-xs" />
                              <ArrowRight size={14} className="text-ink-soft" />
                              <Avatar src={photoOf(people.get(transfer.to))} name={people.get(transfer.to)?.name} className="h-8 w-8 text-xs" />
                            </span>
                            <span className={cn("min-w-0 flex-1 text-sm", involved ? "font-extrabold text-ink" : "text-ink-soft")}>
                              {nameOf(transfer.from, { subject: true })}{" "}
                              {simplify ? (transfer.from === userId ? "pay" : "pays") : transfer.from === userId ? "owe" : "owes"}{" "}
                              {nameOf(transfer.to)}
                            </span>
                            <span className="shrink-0 text-sm font-extrabold text-ink">
                              {formatMoney(transfer.amount, group.currency)}
                            </span>
                            {(involved || isOrganiser) && (
                              <button
                                type="button"
                                className="shrink-0 rounded-full border-0 bg-mustard px-3 py-1 text-xs font-extrabold text-ink hover:bg-mustard-dark"
                                onClick={() =>
                                  setSettling({ ...transfer, owed: transfer.amount, amount: String(transfer.amount), currency: group.currency })
                                }
                              >
                                Record payment
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {group.spent > 0 && (
                    <>
                      <h4 className="mt-5 text-sm font-extrabold text-ink">
                        Trip spending · {formatMoney(group.spent, group.currency)}
                      </h4>
                      <ul className="mt-2 space-y-2">
                        {group.byCategory.map(({ category, amount }) => {
                          const { label, icon: Icon } = categoryOf(category);
                          return (
                            <li key={category} className="text-sm">
                              <div className="flex items-center gap-2">
                                <Icon size={14} className="text-ink-soft" aria-hidden="true" />
                                <span className="flex-1 text-ink">{label}</span>
                                <span className="font-bold text-ink">{formatMoney(amount, group.currency)}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lagoon-light">
                                <div className="h-full rounded-full bg-lagoon" style={{ width: `${(amount / group.spent) * 100}%` }} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  )}
                </article>
              );
            })}
          </div>

          {/* Expense list (row layout adapted from https://21st.dev/@hari/components/transaction-list) */}
          <article className="rounded-3xl bg-white p-3 drop-shadow-ticket sm:p-4">
            <h3 className="px-2 pt-1 font-display text-2xl text-ink">Expenses</h3>

            <div className="mt-3 flex flex-wrap items-center gap-2 px-2">
              <label className="relative min-w-[10rem] flex-1">
                <span className="sr-only">Search expenses</span>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                <input className="field py-1.5 pl-9" placeholder="Search" value={filters.query}
                  onChange={(e) => setFilters({ ...filters, query: e.target.value })} />
              </label>
              <label className="sr-only" htmlFor="expense-filter-category">Category</label>
              <select id="expense-filter-category" className="field w-auto py-1.5" value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">All categories</option>
                {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                <option value="settlement">Payments</option>
              </select>
              <button
                type="button"
                aria-pressed={filters.mine}
                onClick={() => setFilters({ ...filters, mine: !filters.mine })}
                className={cn(
                  "rounded-full border-0 px-3 py-1.5 text-sm font-bold transition",
                  filters.mine ? "bg-ink text-white" : "bg-lagoon-light/70 text-ink hover:bg-lagoon-light"
                )}
              >
                Involving me
              </button>
            </div>

            {shown.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-ink-soft">
                {expenses.length === 0 ? "No expenses yet." : "No expenses match."}
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {shown.map((expense) => {
                  const { icon: Icon, label } = categoryOf(expense.category);
                  const payers = payersOf(expense);
                  const isPayment = expense.category === "settlement";
                  const net = netOf(expense, userId);
                  const owedBy = expense.shares.filter((share) => share.owed > 0).length;
                  const to = idOf(expense.shares.find((share) => share.owed > 0)?.user);
                  return (
                    <li key={expense._id}>
                      <button
                        type="button"
                        onClick={() => openExpense(expense)}
                        className="flex w-full items-center gap-3 rounded-2xl border-0 bg-transparent p-2 text-left hover:bg-lagoon-light/60"
                      >
                        <span
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                            isPayment ? "bg-mustard text-ink" : "bg-ink text-white"
                          )}
                          title={label}
                        >
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-ink">
                            {isPayment ? `${nameOf(payers[0], { subject: true })} paid ${nameOf(to)}` : expense.description}
                          </span>
                          <span className="block truncate text-sm text-ink-soft">
                            {isPayment
                              ? "Settle-up payment"
                              : `${payers.length === 1 ? nameOf(payers[0], { subject: true }) : `${payers.length} people`} paid · ${
                                  expense.splitMethod === "equal" ? `split ${owedBy} ${owedBy === 1 ? "way" : "ways"}` : "split unevenly"
                                }`}
                            {" · "}
                            {dayjs(expense.date).format("D MMM")}
                          </span>
                          {needsRate(expense) && (
                            <span className="mt-0.5 inline-block rounded-full bg-mustard/40 px-2 text-xs font-bold text-ink">
                              No {expense.currency} rate yet
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block font-extrabold text-ink">{formatMoney(expense.amount, expense.currency)}</span>
                          {!isPayment && net > 0 && (
                            <span className="block text-xs font-bold text-lagoon">you lent {formatMoney(net, expense.currency)}</span>
                          )}
                          {!isPayment && net < 0 && (
                            <span className="block text-xs font-bold text-plum">you owe {formatMoney(-net, expense.currency)}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {deleted.length > 0 && (
              <details className="mt-3 rounded-2xl bg-paper px-3 py-2">
                <summary className="cursor-pointer text-sm font-extrabold text-ink">Recently deleted ({deleted.length})</summary>
                <ul className="mt-2 space-y-2">
                  {deleted.map((expense) => (
                    <li key={expense._id} className="flex items-center gap-3 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold text-ink">
                          {expense.description} · {formatMoney(expense.amount, expense.currency)}
                        </span>
                        <span className="block truncate text-ink-soft">
                          Deleted by {expense.deletedBy?.name || "someone"} · {dayjs(expense.deletedAt).format("D MMM")}
                        </span>
                      </span>
                      {canManage(expense) && (
                        <button type="button" className="btn-ghost shrink-0 py-1 text-sm" onClick={() => restore(expense)}>
                          <RotateCcw size={14} aria-hidden="true" />
                          Restore
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        </div>
      )}

      {/* Add / edit / view an expense */}
      <Modal
        open={Boolean(form)}
        onClose={closeForm}
        title={
          viewing && !canManage(viewing)
            ? form?.category === "settlement" ? "Payment" : "Expense"
            : form?.category === "settlement" ? "Edit payment" : form?._id ? "Edit expense" : "Add expense"
        }
        className="max-w-lg"
      >
        {form && (
          <ExpenseForm
            form={form}
            setForm={setForm}
            people={formPeople}
            userId={userId}
            baseCurrency={baseCurrency}
            tripRate={rates.get(form.currency)}
            rateFlipped={rateFlipped}
            history={viewing?.history}
            readOnly={Boolean(viewing) && !canManage(viewing)}
            error={formError}
            onSubmit={save}
            onDelete={() => setConfirmingDelete(true)}
            onCancel={closeForm}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        title={form?.category === "settlement" ? "Delete this payment?" : "Delete this expense?"}
        message="Balances will be worked out again without it, for everyone on the trip. You can restore it from Recently deleted."
        confirmLabel="Delete"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={remove}
      />

      {/* Record a settle-up payment, in full or in part */}
      <Modal open={Boolean(settling)} onClose={() => setSettling(null)} title="Record a payment">
        {settling && (
          <form onSubmit={recordPayment} noValidate>
            <p className="text-ink-soft">
              {nameOf(settling.from, { subject: true })} paid {nameOf(settling.to)}. This updates everyone's balances.
            </p>
            <label htmlFor="settle-amount" className="field-label mt-4">Amount ({settling.currency})</label>
            <input id="settle-amount" className="field" inputMode="decimal" value={settling.amount}
              onChange={(e) => setSettling({ ...settling, amount: e.target.value.replace(/[^\d.]/g, "") })} />
            <p className="mt-1 text-sm text-ink-soft">
              {Number(settling.amount) < settling.owed
                ? `Paying part of it leaves ${formatMoney(settling.owed - Number(settling.amount || 0), settling.currency)} still owed.`
                : `${formatMoney(settling.owed, settling.currency)} is owed in total.`}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setSettling(null)}>Not yet</button>
              <button type="submit" className="btn-dark" disabled={!(Number(settling.amount) > 0)}>Record payment</button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
};

export default TripExpenses;
