const bcrypt = require('bcryptjs');

// Account changes (email, password, deletion) ask for the current password, so a stolen
// token alone can't take an account over. That also makes these routes a password oracle,
// so wrong guesses are counted per account and paused after a few.
const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const fails = new Map(); // user id -> { count, resetAt }

// True when `password` is the user's current one. Otherwise sends the 401 (or 429 once
// there have been too many wrong guesses) itself and returns false.
const confirmPassword = async (res, user, password) => {
  const key = String(user._id);
  const now = Date.now();
  const record = fails.get(key);
  const live = record && now < record.resetAt ? record : null;

  if (live && live.count >= MAX_FAILS) {
    res.status(429).json({ message: 'Too many wrong passwords. Try again in a few minutes.' });
    return false;
  }

  if (typeof password !== 'string' || !(await bcrypt.compare(password, user.password))) {
    const next = live || { count: 0, resetAt: now + WINDOW_MS };
    next.count += 1;
    fails.set(key, next);
    res.status(401).json({ message: "That password isn't right." });
    return false;
  }

  fails.delete(key);
  return true;
};

module.exports = confirmPassword;
