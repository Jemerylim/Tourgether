import { BedDouble, Bus, HandCoins, Receipt, ShoppingBag, Ticket, Utensils } from "lucide-react";

export const CATEGORIES = [
  { value: "food", label: "Food & drink", icon: Utensils },
  { value: "stay", label: "Stay", icon: BedDouble },
  { value: "transport", label: "Transport", icon: Bus },
  { value: "activity", label: "Activities", icon: Ticket },
  { value: "shopping", label: "Shopping", icon: ShoppingBag },
  { value: "other", label: "Other", icon: Receipt },
];
export const categoryOf = (value) =>
  value === "settlement"
    ? { value, label: "Payment", icon: HandCoins }
    : CATEGORIES.find((category) => category.value === value) || CATEGORIES[CATEGORIES.length - 1];

export const CURRENCIES = ["USD", "EUR", "GBP", "SGD", "MYR", "THB", "IDR", "JPY", "KRW", "CNY", "HKD", "TWD", "VND", "PHP", "INR", "AUD", "NZD", "CAD", "CHF"];

export const SPLIT_METHODS = [
  { value: "equal", label: "Equally" },
  { value: "exact", label: "Exact" },
  { value: "percent", label: "%" },
  { value: "shares", label: "Shares" },
];

export const idOf = (user) => String(user?._id || user);

export const formatMoney = (amount, currency) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);

// Rates are stored as "1 expense currency = rate base currency". `flipped` shows them the
// other way round ("1 base currency = 1/rate expense currency"), which many people find
// more natural.
export const formatRate = (rate) => new Intl.NumberFormat(undefined, { maximumSignificantDigits: 6 }).format(rate);
export const invertRate = (text) => {
  const value = Number(text);
  return value > 0 ? String(Number((1 / value).toPrecision(6))) : "";
};
export const rateText = ({ from, to, rate, flipped }) =>
  flipped ? `1 ${to} = ${formatRate(1 / rate)} ${from}` : `1 ${from} = ${formatRate(rate)} ${to}`;

// Same maths as the server: whole minor units (cents, or yen), so splits add up exactly.
const minorPerMajor = (currency) =>
  10 ** new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits;
export const toMinor = (amount, currency) => Math.round(Number(amount || 0) * minorPerMajor(currency));
export const toMajor = (minor, currency) => minor / minorPerMajor(currency);

// Split `total` minor units in proportion to `weights` (largest remainder). Ties go to the
// earliest entries, so an equal split gives the extra cents to the first people listed.
export const allocate = (total, weights) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const exact = weights.map((weight) => (total * weight) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  exact
    .map((value, index) => ({ index, rest: value - parts[index] }))
    .sort((a, b) => b.rest - a.rest || a.index - b.index)
    .forEach(({ index }) => {
      if (left > 0) {
        parts[index] += 1;
        left -= 1;
      }
    });
  return parts;
};

const numberOf = (text) => {
  const value = Number(text || 0);
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

// Work out each person's part from the form. `ids` is everyone offered in the form.
// Returns { owed, weights } (Maps of id -> minor units / typed number), plus `error`
// and `left` (what's still to assign, in the method's own unit) while it doesn't add up.
export const computeSplit = ({ amount, currency, splitMethod, included, split }, ids) => {
  const total = toMinor(amount, currency);
  const result = (weights, owed, extra = {}) => ({
    weights: new Map(ids.map((id, index) => [id, weights[index]])),
    owed: new Map(ids.map((id, index) => [id, owed[index]])),
    ...extra,
  });

  if (splitMethod === "equal") {
    const weights = ids.map((id) => (included.includes(id) ? 1 : 0));
    if (!weights.some(Boolean)) return result(weights, weights, { error: "Pick at least one person to split with." });
    return result(weights, allocate(total, weights));
  }

  const weights = ids.map((id) => numberOf(split[id]));
  if (splitMethod === "exact") {
    const owed = weights.map((value) => toMinor(value, currency));
    const left = total - owed.reduce((a, b) => a + b, 0);
    if (left !== 0) {
      return result(weights, owed, {
        left: toMajor(left, currency),
        error: left > 0 ? `${formatMoney(toMajor(left, currency), currency)} still to assign.` : `That's ${formatMoney(toMajor(-left, currency), currency)} too much.`,
      });
    }
    return result(weights, owed);
  }

  const sum = weights.reduce((a, b) => a + b, 0);
  if (splitMethod === "percent" && Math.abs(sum - 100) > 1e-6) {
    const left = Math.round((100 - sum) * 1000) / 1000;
    return result(weights, allocate(total, weights), {
      left,
      error: left > 0 ? `${left}% still to assign.` : `That's ${-left}% too much.`,
    });
  }
  if (sum <= 0) return result(weights, weights, { error: "Give at least one person a share." });
  return result(weights, allocate(total, weights));
};

// What each payer put in, from the form, as a Map of id -> minor units
export const computePaid = ({ amount, currency, payer, paid }, ids) => {
  const total = toMinor(amount, currency);
  if (payer !== "multiple") return { paid: new Map([[payer, total]]) };
  const map = new Map(ids.map((id) => [id, toMinor(numberOf(paid[id]), currency)]));
  const left = total - [...map.values()].reduce((a, b) => a + b, 0);
  if (left === 0) return { paid: map };
  return {
    paid: map,
    error:
      left > 0
        ? `${formatMoney(toMajor(left, currency), currency)} of the payment not accounted for.`
        : `What people paid is ${formatMoney(toMajor(-left, currency), currency)} more than the total.`,
  };
};

// A person's part in one expense in its own currency: positive = they lent, negative = they owe
export const netOf = (expense, userId) => {
  const share = expense.shares.find((entry) => idOf(entry.user) === userId);
  return share ? share.paid - share.owed : 0;
};

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Splitwise-style export: one row per expense, one column per person with what they lent
// (+) or owe (-) on it, in the expense's own currency.
export const expensesCsv = (expenses, people, baseCurrency, rates) => {
  const columns = [...people.values()];
  const header = ["Date", "Description", "Category", "Amount", "Currency", ...(baseCurrency ? [`Rate to ${baseCurrency}`] : []), "Paid by", ...columns.map((person) => person.name)];
  const rows = expenses.map((expense) => [
    expense.date,
    expense.description,
    categoryOf(expense.category).label,
    expense.amount,
    expense.currency,
    ...(baseCurrency ? [expense.currency === baseCurrency ? 1 : rates.get(expense.currency) ?? ""] : []),
    expense.shares.filter((share) => share.paid > 0).map((share) => share.user?.name || "Someone").join(" & "),
    ...columns.map((person) => {
      const net = netOf(expense, idOf(person));
      return net ? toMajor(toMinor(net, expense.currency), expense.currency) : 0;
    }),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
};
