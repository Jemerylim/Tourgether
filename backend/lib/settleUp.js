// Money maths for expense splitting. Everything is done in whole minor units (cents,
// or yen for currencies without decimals) so splits never drift by a fraction of a cent.

const currencyFormat = (currency) => new Intl.NumberFormat('en', { style: 'currency', currency });

const SUPPORTED = new Set(
  typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : []
);

const isCurrency = (code) => {
  if (!/^[A-Z]{3}$/.test(code || '')) return false;
  if (SUPPORTED.size) return SUPPORTED.has(code);
  try {
    currencyFormat(code);
    return true;
  } catch {
    return false;
  }
};

// 100 for USD, 1 for JPY
const minorPerMajor = (currency) => 10 ** currencyFormat(currency).resolvedOptions().maximumFractionDigits;

const toMinor = (amount, currency) => Math.round(Number(amount) * minorPerMajor(currency));
const toMajor = (minor, currency) => minor / minorPerMajor(currency);

// Split `total` minor units in proportion to `weights` (largest remainder), so the parts
// always add up exactly. Ties go to the earliest entries.
const allocate = (total, weights) => {
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

// Split `total` minor units between `ids` as evenly as possible. The leftover units
// go one each to the first people in the list, so the shares always add up exactly.
const splitShares = (total, ids) =>
  allocate(total, ids.map(() => 1)).map((share, index) => ({ id: ids[index], share }));

// Fewest-ish transfers: repeatedly settle the biggest debtor against the biggest creditor.
const transfersFor = (balances) => {
  const debtors = [];
  const creditors = [];
  balances.forEach((amount, id) => {
    if (amount < 0) debtors.push({ id, amount: -amount });
    if (amount > 0) creditors.push({ id, amount });
  });
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers = [];
  let d = 0;
  let c = 0;
  while (d < debtors.length && c < creditors.length) {
    const amount = Math.min(debtors[d].amount, creditors[c].amount);
    transfers.push({ from: debtors[d].id, to: creditors[c].id, amount });
    debtors[d].amount -= amount;
    creditors[c].amount -= amount;
    if (debtors[d].amount === 0) d += 1;
    if (creditors[c].amount === 0) c += 1;
  }
  return transfers;
};

const idOf = (user) => String(user._id || user);

// An expense's shares as [{ id, paid, owed }] in minor units of the currency it settles in:
// the trip's base currency when there's a rate for its currency (`rates`: Map of
// currency -> base units per unit), otherwise its own currency.
const sharesIn = (expense, baseCurrency, rates) => {
  const shares = expense.shares.map((share) => ({
    id: idOf(share.user),
    paid: toMinor(share.paid, expense.currency),
    owed: toMinor(share.owed, expense.currency),
  }));
  const total = toMinor(expense.amount, expense.currency);
  const rate = rates.get(expense.currency);
  if (!baseCurrency || expense.currency === baseCurrency || !(rate > 0)) {
    return { currency: expense.currency, total, shares };
  }

  const converted = toMinor(toMajor(total, expense.currency) * rate, baseCurrency);
  const paid = allocate(converted, shares.map((share) => share.paid));
  const owed = allocate(converted, shares.map((share) => share.owed));
  return {
    currency: baseCurrency,
    total: converted,
    shares: shares.map((share, index) => ({ id: share.id, paid: paid[index], owed: owed[index] })),
  };
};

// Expenses -> one summary per currency they settle in: what was spent (overall, by category
// and per person), each person's balance (positive = they're owed), the simplified transfers
// that would settle everyone up, and the original person-to-person debts before simplifying.
// With a base currency, every expense in a currency the trip has a rate for is converted
// into it; the rest stay in their own currency. Settlement payments move balances but
// don't count as spending. Amounts come back in major units (dollars, not cents).
const settleUp = (expenses, baseCurrency = null, rates = new Map()) => {
  const byCurrency = new Map();

  expenses.forEach((expense) => {
    const { currency, total, shares } = sharesIn(expense, baseCurrency, rates);
    if (!byCurrency.has(currency)) {
      byCurrency.set(currency, {
        spent: 0,
        balances: new Map(),
        byCategory: new Map(),
        people: new Map(),
        pairs: new Map(),
      });
    }
    const group = byCurrency.get(currency);
    const add = (map, id, amount) => map.set(id, (map.get(id) || 0) + amount);

    const nets = new Map();
    shares.forEach(({ id, paid, owed }) => {
      add(group.balances, id, paid - owed);
      add(nets, id, paid - owed);
    });
    // Original debts: within each expense, whoever owes pays whoever paid
    transfersFor(nets).forEach(({ from, to, amount }) => add(group.pairs, `${from}|${to}`, amount));

    if (expense.category !== 'settlement') {
      group.spent += total;
      add(group.byCategory, expense.category, total);
      shares.forEach(({ id, paid, owed }) => {
        const person = group.people.get(id) || { paid: 0, share: 0 };
        group.people.set(id, { paid: person.paid + paid, share: person.share + owed });
      });
    }
  });

  return [...byCurrency.entries()].map(([currency, group]) => {
    const major = (minor) => toMajor(minor, currency);

    // Net A->B against B->A so each pair shows one debt at most
    const debts = [];
    group.pairs.forEach((amount, key) => {
      const [from, to] = key.split('|');
      if (from > to && group.pairs.has(`${to}|${from}`)) return;
      const net = amount - (group.pairs.get(`${to}|${from}`) || 0);
      if (net > 0) debts.push({ from, to, amount: major(net) });
      if (net < 0) debts.push({ from: to, to: from, amount: major(-net) });
    });

    return {
      currency,
      spent: major(group.spent),
      byCategory: [...group.byCategory.entries()]
        .map(([category, amount]) => ({ category, amount: major(amount) }))
        .sort((a, b) => b.amount - a.amount),
      people: [...group.people.entries()].map(([user, { paid, share }]) => ({
        user,
        paid: major(paid),
        share: major(share),
      })),
      balances: [...group.balances.entries()]
        .filter(([, amount]) => amount !== 0)
        .map(([user, amount]) => ({ user, amount: major(amount) })),
      transfers: transfersFor(group.balances).map((transfer) => ({ ...transfer, amount: major(transfer.amount) })),
      debts: debts.sort((a, b) => b.amount - a.amount),
    };
  });
};

module.exports = { isCurrency, toMinor, toMajor, splitShares, settleUp };
