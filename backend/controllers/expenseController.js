const Expense = require('../models/Expense');
const { CATEGORIES, SPLIT_METHODS } = require('../models/Expense');
const { memberIds, loadTripForMember } = require('../services/tripAccess');
const { isCurrency, toMinor, toMajor, settleUp } = require('../lib/settleUp');

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const PEOPLE = 'name profilePicture';
const RECENTLY_DELETED = 30;

const withPeople = (query) =>
  query
    .populate('shares.user', PEOPLE)
    .populate('history.by', 'name')
    .populate('deletedBy', 'name');

const sendError = (res, message, error) => {
  console.error(`${message}:`, error);
  res.status(500).json({ success: false, message, error: error.message });
};

const payersOf = (expense) => expense.shares.filter((share) => share.paid > 0).map((share) => share.user);

// Anyone who paid, whoever added it and the trip organiser can edit, delete or restore an expense
const canManage = (expense, trip, userId) =>
  [expense.createdBy, trip.createdBy, ...payersOf(expense)].some((id) => id.equals(userId));

const notAllowed = (res, action) =>
  res.status(403).json({ success: false, message: `Only someone who paid, whoever added it or the organiser can ${action} this` });

// Validate an expense body. `existing` is the expense being edited: people already on it
// stay allowed even if they have since left the trip. Returns { error } or { data }.
//
// `shares` is [{ user, paid, owed, weight }] in major units. The client works out the split
// (equal, exact, percent or shares) and the server only checks that it adds up, as Splitwise
// does, so there's one source of truth for each person's part.
const parseExpense = (body, trip, existing) => {
  const allowed = new Set(memberIds(trip));
  if (existing) existing.shares.forEach((share) => allowed.add(String(share.user)));

  const category = body.category || 'other';
  const currency = String(body.currency || '').toUpperCase();
  const description = String(body.description || '').trim() || (category === 'settlement' ? 'Payment' : '');
  const splitMethod = category === 'settlement' ? 'exact' : body.splitMethod || 'equal';
  const date = body.date || new Date().toISOString().slice(0, 10);

  if (!description) return { error: 'Add what the expense was for' };
  if (!CATEGORIES.includes(category)) return { error: 'That category is not recognised' };
  if (!SPLIT_METHODS.includes(splitMethod)) return { error: 'That way of splitting is not recognised' };
  if (!isCurrency(currency)) return { error: 'Pick a valid currency' };
  if (!DATE_FORMAT.test(date)) return { error: 'Invalid date format' };
  const total = toMinor(body.amount, currency);
  if (!Number.isFinite(total) || total <= 0) return { error: 'The amount has to be more than zero' };

  // Merge repeated people, drop anyone with no part in it
  const byUser = new Map();
  for (const share of Array.isArray(body.shares) ? body.shares : []) {
    const user = String(share?.user?._id || share?.user || '');
    const paid = toMinor(share.paid || 0, currency);
    const owed = toMinor(share.owed || 0, currency);
    const weight = Number(share.weight || 0);
    if (!allowed.has(user)) return { error: 'Everyone on the expense has to be on the trip' };
    if (![paid, owed, weight].every((value) => Number.isFinite(value) && value >= 0)) {
      return { error: 'Amounts on the split must be zero or more' };
    }
    const current = byUser.get(user) || { user, paid: 0, owed: 0, weight: 0 };
    byUser.set(user, { user, paid: current.paid + paid, owed: current.owed + owed, weight: current.weight + weight });
  }
  const shares = [...byUser.values()].filter((share) => share.paid > 0 || share.owed > 0);
  const sum = (key) => shares.reduce((acc, share) => acc + share[key], 0);
  const money = (minor) => `${toMajor(minor, currency)} ${currency}`;

  if (!shares.some((share) => share.paid > 0)) return { error: 'Say who paid' };
  if (!shares.some((share) => share.owed > 0)) return { error: 'Split the expense between at least one person' };
  if (sum('paid') !== total) return { error: `What people paid adds up to ${money(sum('paid'))}, not ${money(total)}` };
  if (sum('owed') !== total) return { error: `The split adds up to ${money(sum('owed'))}, not ${money(total)}` };
  if (
    category === 'settlement' &&
    (shares.length !== 2 || !shares.some((share) => share.paid === total && share.owed === 0))
  ) {
    return { error: 'A payment goes from one person to one other person' };
  }

  return {
    data: {
      description,
      amount: toMajor(total, currency),
      currency,
      category,
      date,
      splitMethod,
      shares: shares.map((share) => ({
        user: share.user,
        paid: toMajor(share.paid, currency),
        owed: toMajor(share.owed, currency),
        weight: share.weight,
      })),
    },
  };
};

// What an edit changed, as display text for the history
const changesBetween = (before, after) => {
  const changes = [];
  const note = (field, from, to) => {
    if (from !== to) changes.push({ field, from, to });
  };
  const splitKey = (expense) =>
    JSON.stringify([
      expense.splitMethod,
      expense.shares
        .map((share) => [String(share.user), share.paid, share.owed, share.weight])
        .sort((a, b) => a[0].localeCompare(b[0])),
    ]);

  note('description', before.description, after.description);
  note('amount', `${before.amount} ${before.currency}`, `${after.amount} ${after.currency}`);
  note('category', before.category, after.category);
  note('date', before.date, after.date);
  if (splitKey(before) !== splitKey(after)) changes.push({ field: 'split' });
  return changes;
};

// The trip's rates into its base currency, as a Map of currency -> rate
const ratesToBase = (trip) =>
  new Map(
    trip.baseCurrency
      ? (trip.rates || []).filter((entry) => entry.to === trip.baseCurrency).map((entry) => [entry.from, entry.rate])
      : []
  );

// The trip's expenses newest first, recently deleted ones, its rates and the settle-up summary
const tripExpenses = async (trip) => {
  const rates = ratesToBase(trip);
  const [expenses, deleted] = await Promise.all([
    withPeople(Expense.find({ trip: trip._id, deletedAt: null }).sort({ date: -1, createdAt: -1 })),
    withPeople(
      Expense.find({ trip: trip._id, deletedAt: { $ne: null } }).sort({ deletedAt: -1 }).limit(RECENTLY_DELETED)
    ),
  ]);
  return {
    expenses,
    deleted,
    baseCurrency: trip.baseCurrency || null,
    rates: [...rates.entries()].map(([currency, rate]) => ({ currency, rate })),
    summary: settleUp(expenses, trip.baseCurrency, rates),
  };
};

// Load an expense and its trip, checking the user is on the trip and may manage it.
// Sends the error response itself and returns null when the request can't go on.
const loadManagedExpense = async (req, res, action) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    res.status(404).json({ success: false, message: 'Expense not found' });
    return null;
  }
  const trip = await loadTripForMember(req, res, expense.trip);
  if (!trip) return null;
  if (!canManage(expense, trip, req.user._id)) {
    notAllowed(res, action);
    return null;
  }
  return { expense, trip };
};

// Get all expenses and balances for a trip
exports.getExpensesByTrip = async (req, res) => {
  try {
    const trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    res.status(200).json({ success: true, data: await tripExpenses(trip) });
  } catch (error) {
    sendError(res, 'Error fetching expenses', error);
  }
};

// Add an expense (or a settle-up payment) to a trip
exports.createExpense = async (req, res) => {
  try {
    const trip = await loadTripForMember(req, res, req.body.tripId);
    if (!trip) return;

    const { error, data } = parseExpense(req.body, trip);
    if (error) return res.status(400).json({ success: false, message: error });

    await Expense.create({
      ...data,
      trip: trip._id,
      createdBy: req.user._id,
      history: [{ action: 'created', by: req.user._id }],
    });
    res.status(201).json({ success: true, data: await tripExpenses(trip) });
  } catch (error) {
    sendError(res, 'Error adding expense', error);
  }
};

// Edit an expense
exports.updateExpense = async (req, res) => {
  try {
    const loaded = await loadManagedExpense(req, res, 'edit');
    if (!loaded) return;
    const { expense, trip } = loaded;
    if (expense.deletedAt) return res.status(400).json({ success: false, message: 'Restore this expense before editing it' });

    const { error, data } = parseExpense(req.body, trip, expense);
    if (error) return res.status(400).json({ success: false, message: error });

    const changes = changesBetween(expense, data);
    if (changes.length > 0) {
      expense.set({ ...data, updatedBy: req.user._id });
      expense.history.push({ action: 'edited', by: req.user._id, changes });
      await expense.save();
    }
    res.status(200).json({ success: true, data: await tripExpenses(trip) });
  } catch (error) {
    sendError(res, 'Error updating expense', error);
  }
};

// Delete an expense. It's kept (and can be restored) but no longer counts.
exports.deleteExpense = async (req, res) => {
  try {
    const loaded = await loadManagedExpense(req, res, 'delete');
    if (!loaded) return;
    const { expense, trip } = loaded;

    if (!expense.deletedAt) {
      expense.set({ deletedAt: new Date(), deletedBy: req.user._id });
      expense.history.push({ action: 'deleted', by: req.user._id });
      await expense.save();
    }
    res.status(200).json({ success: true, data: await tripExpenses(trip) });
  } catch (error) {
    sendError(res, 'Error deleting expense', error);
  }
};

// Bring back a deleted expense
exports.restoreExpense = async (req, res) => {
  try {
    const loaded = await loadManagedExpense(req, res, 'restore');
    if (!loaded) return;
    const { expense, trip } = loaded;

    if (expense.deletedAt) {
      expense.set({ deletedAt: null, deletedBy: undefined });
      expense.history.push({ action: 'restored', by: req.user._id });
      await expense.save();
    }
    res.status(200).json({ success: true, data: await tripExpenses(trip) });
  } catch (error) {
    sendError(res, 'Error restoring expense', error);
  }
};

// Set the trip's rate from one currency into its base currency (organiser only). Every
// expense in that currency is converted with it. An empty rate removes it, so those
// expenses settle in their own currency again.
exports.setRate = async (req, res) => {
  try {
    const trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    if (!trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the organiser can change exchange rates' });
    }

    const to = trip.baseCurrency;
    const from = String(req.body.currency || '').toUpperCase();
    const remove = req.body.rate === null || req.body.rate === '';
    const rate = Number(req.body.rate);
    if (!to) return res.status(400).json({ success: false, message: 'Pick a settle-up currency first' });
    if (!isCurrency(from) || from === to) {
      return res.status(400).json({ success: false, message: 'Pick a currency other than the settle-up currency' });
    }
    if (!remove && (!Number.isFinite(rate) || rate <= 0)) {
      return res.status(400).json({ success: false, message: 'The rate has to be more than zero' });
    }

    trip.rates = trip.rates.filter((entry) => !(entry.from === from && entry.to === to));
    if (!remove) trip.rates.push({ from, to, rate });
    await trip.save();
    res.status(200).json({ success: true, data: await tripExpenses(trip) });
  } catch (error) {
    sendError(res, 'Error setting the exchange rate', error);
  }
};

// Choose the currency everyone settles up in (organiser only). null settles each currency
// separately. Rates already set into that currency start counting again.
exports.setBaseCurrency = async (req, res) => {
  try {
    const trip = await loadTripForMember(req, res, req.params.tripId);
    if (!trip) return;
    if (!trip.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the organiser can change the settle-up currency' });
    }

    const baseCurrency = req.body.baseCurrency ? String(req.body.baseCurrency).toUpperCase() : null;
    if (baseCurrency && !isCurrency(baseCurrency)) return res.status(400).json({ success: false, message: 'Pick a valid currency' });

    trip.baseCurrency = baseCurrency;
    await trip.save();
    res.status(200).json({ success: true, data: await tripExpenses(trip) });
  } catch (error) {
    sendError(res, 'Error changing the settle-up currency', error);
  }
};
