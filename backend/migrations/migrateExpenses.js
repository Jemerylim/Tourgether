const Expense = require('../models/Expense');
const Trip = require('../models/Trip');
const { toMinor, toMajor, splitShares } = require('../lib/settleUp');

// Exchange rates used to be set on each expense (`fx: { currency, rate }`). They now belong
// to the trip, one per currency pair: keep the newest rate for each pair the trip doesn't
// have yet, then drop `fx` from the expenses.
const moveRatesToTrips = async () => {
  const collection = Expense.collection;
  const withRates = await collection.find({ fx: { $exists: true } }).sort({ createdAt: 1 }).toArray();
  if (withRates.length === 0) return;

  const newest = new Map(); // `${trip}|${from}|${to}` -> rate
  withRates.forEach(({ trip, currency, fx }) => {
    if (fx?.rate > 0 && fx.currency) newest.set(`${trip}|${currency}|${fx.currency}`, fx.rate);
  });
  const trips = await Trip.find({ _id: { $in: [...new Set(withRates.map((expense) => String(expense.trip)))] } });
  await Promise.all(
    trips.map((trip) => {
      newest.forEach((rate, key) => {
        const [tripId, from, to] = key.split('|');
        if (tripId === String(trip._id) && !trip.rates.some((entry) => entry.from === from && entry.to === to)) {
          trip.rates.push({ from, to, rate });
        }
      });
      return trip.save();
    })
  );
  await collection.updateMany({ fx: { $exists: true } }, { $unset: { fx: '' } });
  console.log(`Moved exchange rates from ${withRates.length} expense(s) to their trips`);
};

// Expenses used to store one payer (`paidBy`) and an equal split (`splitAmong`). Turn any
// left in that shape into per-person shares, splitting exactly as before so balances don't
// move. Safe to run on every start: it only touches expenses that have no shares yet.
const migrateExpenses = async () => {
  await moveRatesToTrips();

  const collection = Expense.collection;
  const legacy = await collection.find({ shares: { $exists: false }, paidBy: { $exists: true } }).toArray();
  if (legacy.length === 0) return;

  await collection.bulkWrite(
    legacy.map((expense) => {
      const { currency } = expense;
      const payer = String(expense.paidBy);
      const owedBy = new Map(
        splitShares(toMinor(expense.amount, currency), expense.splitAmong.map(String)).map(({ id, share }) => [id, share])
      );
      const ids = [...new Set([payer, ...owedBy.keys()])];
      const shares = ids.map((id) => ({
        user: id === payer ? expense.paidBy : expense.splitAmong.find((other) => String(other) === id),
        paid: id === payer ? expense.amount : 0,
        owed: toMajor(owedBy.get(id) || 0, currency),
        weight: expense.category === 'settlement' ? toMajor(owedBy.get(id) || 0, currency) : owedBy.has(id) ? 1 : 0,
      }));

      return {
        updateOne: {
          filter: { _id: expense._id },
          update: {
            $set: {
              shares,
              splitMethod: expense.category === 'settlement' ? 'exact' : 'equal',
              deletedAt: null,
              history: [{ action: 'created', by: expense.createdBy, at: expense.createdAt || new Date(), changes: [] }],
            },
            $unset: { paidBy: '', splitAmong: '' },
          },
        },
      };
    })
  );
  console.log(`Moved ${legacy.length} expense(s) to per-person shares`);
};

module.exports = migrateExpenses;
