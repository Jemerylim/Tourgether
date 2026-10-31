// Route state that remembers which page opened the next one, so that page's back link
// returns to the right place. `idx` is React Router's position in the browser history;
// PageHeader uses it to step back through history instead of pushing a new entry.
export const fromHere = (location, label) => ({
  from: { to: location.pathname + location.search, label, idx: window.history.state?.idx },
});
