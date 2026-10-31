const mongoose = require('mongoose');

// "settlement" is a payment between two members to square up: the share with `paid` paid
// the share with `owed`. It moves balances like any expense but isn't counted as trip spending.
const CATEGORIES = ['food', 'stay', 'transport', 'activity', 'shopping', 'other', 'settlement'];

// How the form worked out who owes what. Only the resulting shares count towards balances;
// the method and each share's `weight` are kept so the form can show the split again.
const SPLIT_METHODS = ['equal', 'exact', 'percent', 'shares'];

// One person's part in an expense, in major units of the expense's currency. Every expense
// has paid totals and owed totals that each add up to its amount.
const shareSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paid: { type: Number, default: 0, min: 0 },
    owed: { type: Number, default: 0, min: 0 },
    // What was typed for this person: 1 for "in" on an equal split, the exact amount,
    // the percentage or the number of shares
    weight: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// Who did what to an expense. `changes` lists the fields an edit touched, with old and new
// values as display text ("split" has none: it changed as a whole).
const historySchema = new mongoose.Schema(
  {
    action: { type: String, enum: ['created', 'edited', 'deleted', 'restored'], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    at: { type: Date, default: Date.now },
    changes: [{ _id: false, field: String, from: String, to: String }],
  },
  { _id: false }
);

// Define the Expense schema
const expenseSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true,
  },
  description: {
    type: String,
    required: [true, 'Please add what the expense was for'],
    trim: true,
    maxlength: 100,
  },
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
    min: [0, 'The amount has to be more than zero'],
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    match: [/^[A-Z]{3}$/, 'Please use a three-letter currency code'],
  },
  shares: {
    type: [shareSchema],
    validate: [(shares) => shares.length > 0, 'Split the expense between at least one person'],
  },
  splitMethod: {
    type: String,
    enum: SPLIT_METHODS,
    default: 'equal',
  },
  category: {
    type: String,
    enum: CATEGORIES,
    default: 'other',
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Deleted expenses are kept so they can be restored; they don't count towards balances
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  history: [historySchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

expenseSchema.index({ trip: 1, deletedAt: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.SPLIT_METHODS = SPLIT_METHODS;
