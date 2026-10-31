# Tourgether UI revamp: plan for the remaining pages

This is a work plan for finishing the UI revamp of `client/`. It is written so a Claude Code session (or a developer) can pick it up cold and work through it top to bottom. Do the phases in order: Phase 0 fixes bugs that block the later pages, and Phase 1 builds shared pieces the pages depend on.

## Where things stand

Done and approved by the project owner:

- Tailwind CSS v3 is set up (`client/tailwind.config.js`, `client/postcss.config.js`). The design tokens live in the Tailwind config, and shared control classes live in `client/src/index.css` under `@layer components`.
- Restyled: Navbar, Footer, Home, Login, Register, Dashboard, and the trip card (`components/Cards/Card.jsx`).
- The API base URL comes from `client/src/config.js` (`API_URL`, set with `VITE_API_URL`). `client/.env.development` points dev at `http://localhost:5000`.
- Errors from the API go through `client/src/lib/apiError.js` (`apiErrorMessage(error, fallback)`).

Not done yet. These pages still use their old per-page CSS:

| Route | File | Old CSS |
|---|---|---|
| `/dashboard` | `pages/Dashboard/Dashboard.jsx` | none; already restyled, but its content changes in 2.1 |
| `/my-trips` | `pages/Trips/MyTrips.jsx` | `MyTrips.css` |
| `/create-trip` | `pages/Trips/NewTripForm.jsx` | `NewTripForm.css` |
| `/trip/:id` | `pages/Trips/Trip.jsx` | `Trip.css` |
| `/trip/:id/events` | `pages/Trips/AllEvents.jsx` | `AllEvents.css` |
| `/trip/:tripId/accept` | `pages/Trips/AcceptInvitation.jsx` | `AcceptInvitation.css` |
| `/profile` | `pages/Profile/Profile.jsx` | `Profile.css` |
| `/quiz`, `/result` | `pages/Quiz/Quiz.jsx` | `Quiz.css` |
| `/reset-password` | `pages/ResetPassword/ResetPassword.jsx` | `ResetPassword.css` |

## Design system: what to reuse

The direction is **"boarding pass in a sunny landscape"**: warm travel imagery, no hard outlines, everything flowing together. The owner explicitly rejected (1) a generic cream-and-serif template look and (2) visible lines, borders and dividers. Keep to these rules:

- **No outlines or dividers.** Separate things with fill colour, spacing and soft shadows, not borders. No dashed lines.
- **One accent motif: the ticket.** Use `Ticket` for anything that is "a trip", "an invitation" or "a pass". Don't use it for every box.
- **One moving thing per page at most.** Only motion that responds to an action (opening a modal, pressing a button) is fine everywhere. Respect `prefers-reduced-motion`.
- **Copy:** plain, active, sentence case. Buttons say what happens ("Create trip", "Send invite"), not "Submit". Errors say what went wrong and what to do.

### Tokens (`tailwind.config.js`)

| Token | Value | Use |
|---|---|---|
| `paper` | `#FFFDF7` | Page background |
| `ink` / `ink-soft` / `ink-deep` | `#0F4C57` / `#3E6B74` / `#082F37` | Headings and text / secondary text / dark button ledge |
| `lagoon` / `lagoon-light` | `#0A7C84` / `#DDF1EF` | Focus rings / soft fills (fields, chips, empty states) |
| `sky`, `hill` | `#BFE4E2`, `#A9D9D6` | Scene only |
| `mustard` / `mustard-dark` | `#F6C453` / `#D9A43A` | Primary button, ticket stubs / button ledge |
| `orange` | `#E4761B` | Illustration accents only; not for text (contrast too low) |
| `plum` | `#6B0A44` | Inline links |
| `font-display` | Gloock | Headings only, no weight classes (it has one weight) |
| `font-sans` | Figtree | Everything else; use `font-bold` / `font-extrabold` for emphasis |
| `shadow-soft`, `shadow-float` | | Modals; small floating chips |
| `drop-shadow-ticket`, `drop-shadow-ticket-lg` | | Tickets (normal / hover) |

### Shared classes (`index.css`)

- `btn-primary` (mustard, pressable ledge), `btn-dark` (ink), `btn-ghost` (text only).
- `field` (filled input, no border; works for `input`, `textarea`, `select`) and `field-label`.

### Components (`client/src/components/`)

| Component | What it is |
|---|---|
| `Navbar` | Fixed, 76px. Pass `overlay` on pages that start with a `Scene`; it stays transparent until scroll. |
| `Footer` | Wave plus ink footer. Use on marketing-style pages only (Home, Quiz). |
| `Scene` | Sky, sun, clouds and hills. The front hill is `paper`, so content below it continues seamlessly. To start under the navbar use `className="-mt-[76px] pt-[76px] ..."`; place the sun with `sunClassName`. |
| `Ticket` | Boarding pass with cut-out notches. Props: `main`, `stub`, `mainClassName`, `stubClassName`, `stacked` (always vertical), `as` (e.g. `"button"`). |
| `DepartureBoard` | Flip tile cycling destinations. Decorative. |
| `AuthLayout` | Scene + ticket form for auth screens. Props: `image`, `caption`, `footer` (stub content), `imageSide`. |
| `Cards/Card` | A trip as a ticket. Props: `title`, `start`, `end`, `imageUrl`, `onClick`. |

### Legacy CSS gotcha

`index.css` still has old global rules for `a`, `a:hover`, `button`, `h1` so that unconverted pages keep working. Class utilities beat them, with two exceptions:

1. `a:hover` outranks a plain colour class. Add an explicit `hover:text-…` to links.
2. A raw `<button>` picks up the legacy padding, background and border. Any `<button>` that doesn't use a `btn-*` class needs `border-0 bg-transparent p-0` (or its own values).

These rules are removed in Phase 3, once every page is converted.

## Library components to adapt

These were picked from the local 21st.dev library (`C:\Users\khx07\React-Skills\components`, searched with the `/react-components` skill) for this project. The selection rules were: no new runtime dependencies (the client has `lucide-react`, `clsx` and `tailwind-merge`; it does **not** have framer-motion, Radix, Ark UI or Base UI), good accessibility, and logic worth keeping. Each one was read before it was picked.

| Use | Library component (folder under `components/`) | Take | Leave |
|---|---|---|---|
| `Modal` (Phase 1.2) | `feedback-overlays/lailai0916--dialog` | All the logic: native `<dialog>` + `showModal()` (gives a focus trap and Escape), body scroll lock, focus restore, the backdrop click that ignores drags started inside | Its CSS module, which is **missing from the local copy**. Style with Tailwind: `rounded-3xl bg-white p-7 shadow-soft backdrop:bg-ink-deep/50` |
| `Toast` (1.3) | `feedback-overlays/ayushmxxn--toast` | The API shape: `ToastProvider` + `useToast()` returning `showToast(message, type)`, and the auto-dismiss timer | framer-motion (use a CSS transition plus `prefers-reduced-motion`), the five position containers (use bottom-centre only), and the `window.innerWidth` read during render |
| Invite emails (2.2, 2.3) | `forms/laziekiki--smart-tag-input` | Behaviour: Enter or comma adds; pasting `a@x.com, b@y.com` splits into several; duplicates are ignored case-insensitively; Backspace on an empty input selects and then removes the last chip; the counter is `aria-live` | The inline `<style>` string and the suggestions list. Add email validation; the limit is 10 |
| Trip dates (2.2) | `forms/bidyut10--date-range-picker-card` | The "check-in / check-out" month grid: first tap sets the start, the second sets the end, the range fills in between | Make it controlled (`start`, `end` as `YYYY-MM-DD` strings in and out, so `startDate`/`endDate` state and the API payload stay the same), disable past days, restyle selected days `bg-ink text-white` and in-range days `bg-lagoon-light`. Format dates in local time; don't use `toISOString()`, which shifts the day in UTC+8 |
| Notes autosave (2.4) | `forms/klyv-ui--save-indicator` | The pattern: states `saving` / `saved` / `error` with a retry, and a relative "saved just now" | Its helper files (`save-indicator-utils/*`) are **missing from the local copy**. Rebuild it as a small inline component, using the code only as a reference |
| Profile photo (2.6) | `forms/arunjdass--fileupload` | Drag-and-drop on a single file plus the preview and remove flow (uses `lucide-react` only) | Multi-file handling and its colours. Accept `image/*` only |
| Avatar (1.6) | `data-display/subframeapp--avatar` | Image with an initials fallback, sizes, no dependencies | Its square variant and colour props |
| Quiz options (2.7) | `buttons/a11ypros--accessible-radio-group` | Native `<input type="radio">` inside a `<fieldset>`/`<legend>`, so keyboard behaviour comes for free. Style the `<label>` as the card and use `peer-checked:` / `has-[:checked]:` for the selected state | Its visual styling |

Considered and **not** used:
- Steppers (`sean0205--…dotted-progress` needs Base UI, `corr--stepper` draws connecting lines): build the quiz dots by hand.
- Timelines (`nayan-radadiya6--timeline-rail`, `manuarora700--timeline`): they're built around a vertical rail line, which the no-lines rule forbids.
- Empty-state kits: the Dashboard empty state already matches the design.
- Spinners: use `lucide-react`'s `Loader2` with `animate-spin`, which needs no new code.
- Stamp (`designali-in--stamp`): a 13-line wrapper around another missing component; build the stamp by hand.

**How to adapt (applies to all of the above):**

1. The client is plain JavaScript. Convert `.tsx` to `.jsx`: remove the types and `type` imports, keep `forwardRef` only where a ref is actually used.
2. There is no `@/` alias. Import `cn` from a relative path (`../../lib/utils`).
3. Drop `"use client"` (Vite, not Next.js) and all `dark:` styles (there is no dark mode).
4. Replace every colour with the tokens above, and remove borders.
5. Put the source URL as the first-line comment, for example `// Adapted from https://21st.dev/@lailai0916/components/dialog`. Each component's `meta.json` has the URL.
6. Check each author's licence on 21st.dev before the app is used commercially.

## Ground rules for every page

1. **Change presentation only.** Keep state, effects, API calls, routes and handler logic as they are, unless this plan says otherwise. If a bug is in the way, fix it in its own step and mention it.
2. Replace the page's CSS import with Tailwind classes, then **delete the page's `.css` file** with `git rm`.
3. Every page gets `<Navbar />`, a `main` with `mx-auto max-w-6xl px-4 sm:px-6 py-10 text-left`, and an `h1` in `font-display text-4xl sm:text-5xl text-ink`. Use the `PageHeader` component from Phase 1.
4. Loading, error and empty states keep the Navbar and use the shared states from Phase 1.
5. Inputs get a matching `id`/`htmlFor`, `autoComplete` where it applies, and `required` where the API requires the value.
6. Replace `alert()` and `window.confirm()` with the Toast and ConfirmDialog from Phase 1.
7. After each page, run `npx vite build` in `client/`. It must pass with no new warnings. Then check the page at 375px and at 1440px wide.
8. Make one commit per page, so each change is easy to review and revert.

## Phase 0: fix these first (bugs found during review)

1. **`/my-trips` is broken.** `MyTrips.jsx` still passes `content=` to `Card`, which now takes `start` and `end`, so the dates don't render. Pass `start`/`end` the way `Dashboard.jsx` does (a `formatDate` helper).
2. **Unsplash API key is committed in source** (`MyTrips.jsx`, `client_id: "DDOK…"`). Move it to `VITE_UNSPLASH_ACCESS_KEY` in `.env.development`/`.env.production`, read it in `config.js`, and skip the Unsplash call when it's not set. Tell the owner to rotate the key, because it's in git history.
3. **Broken fallback image.** `MyTrips.jsx` sets `trip.imageUrl = "../../assets/travel.jpg"`, a string path that doesn't resolve at runtime. Leave `imageUrl` undefined instead: `Card` already shows a plane icon when there's no image.
4. **`Quiz.jsx` crashes on `/result`.** `Result` uses `useLocation` without importing it.
5. **`Quiz.jsx` "Skip" goes to `/home`**, which doesn't exist. Point it to `/`, or to `/dashboard` when logged in.
6. **`dayjs` is imported by `Trip.jsx` and `AllEvents.jsx` but isn't in `client/package.json`.** It only works as a transitive dependency. Run `npm install dayjs --legacy-peer-deps` in `client/`.
7. **`components/Calendar/Calendar.jsx` (react-big-calendar) isn't imported anywhere.** Confirm with a search, then delete it and `Calendar.css`. Ask the owner before removing the `react-big-calendar` and `moment` dependencies.

## Phase 1: shared building blocks

Build these in `client/src/components/` before converting pages. Keep each one small, in plain JSX, matching the existing components' style.

1. **`PageHeader`**: `title`, optional `subtitle`, optional `back` (`{ to, label }`), optional `actions` (buttons on the right). The back link is a `btn-ghost` with a `lucide-react` `ArrowLeft` icon.
2. **`Modal`**: overlay `fixed inset-0 z-[2000] bg-ink-deep/50 p-4`, centred panel `rounded-3xl bg-white p-7 shadow-soft max-w-md w-full`. Props: `open`, `onClose`, `title`, `children`. Needs `role="dialog"`, `aria-modal`, `aria-labelledby`. Close on Escape and on a backdrop click, return focus to the trigger, and lock body scroll while open. It replaces the Login forgot-password modal, the Trip event-form overlay and the Trip manage-members overlay.
3. **`Toast`**: a small provider plus a `useToast()` hook. Toasts sit bottom-centre, ink background with white text, auto-dismiss after about 3.5 seconds, and use `role="status"`. Wrap the app in `App.jsx`. It replaces all `alert()` calls.
4. **`ConfirmDialog`**: built on `Modal`. Props: `title`, `message`, `confirmLabel` (e.g. "Delete event"), `onConfirm`. The confirm button is `btn-dark`. It replaces `window.confirm`.
5. **`PageState`**: `LoadingState` (a `Loader2` icon spinning plus text), `ErrorState` (message plus an optional retry button) and `EmptyState` (icon, title, text, action). Model `EmptyState` on the empty state in `Dashboard.jsx` (rounded-3xl `bg-lagoon-light`, left-aligned).
6. **`Avatar`**: shows an image if there is one, otherwise the initials on `bg-mustard` in a circle. Sizes `sm` and `lg`. It's used by Profile and the members list.

`Modal`, `Toast` and `Avatar` start from the library components in the table above; `PageHeader`, `ConfirmDialog` and `PageState` are written from scratch. If something here needs another library search, run `node C:/Users/khx07/.claude/skills/react-components/scripts/search.js <words> --max-lines 220 --limit 5`. Use **at most one** `--no-dep` filter: combining several makes the script return no results.

## Phase 2: pages, in this order

### 2.1 Dashboard and My Trips (decided)

Before this change both pages showed the same list. **Decision (made by the owner): Dashboard shows what's coming up, with countdowns; My Trips is the full archive, split into Upcoming and Past.** Build it in this order.

#### 2.1a Shared trip helpers: `client/src/lib/trips.js`

Both pages use these helpers, so the logic lives in one place:

- `formatDate(date)`: `toLocaleDateString()` or `"TBD"`. Move it here from `Dashboard.jsx`.
- `isPast(trip)`: true when `endDate` is before today. Compare calendar days in local time, with the time set to midnight. A trip with no `endDate` is never past.
- `splitTrips(trips)` returns `{ upcoming, past }`.
  - `upcoming` is sorted by `startDate`, soonest first. Trips without dates go last.
  - `past` is sorted by `endDate`, most recent first.
- `countdownLabel(trip)`, compared in local calendar days:
  - start date in the future, 2 or more days away: "Departs in N days"
  - start date is tomorrow: "Departs tomorrow"
  - start date is today: "Departs today"
  - started and not yet ended: "Happening now"
  - no `startDate`: "Dates to be decided"
  - past: `null`
- `withCoverImages(trips)`: move the Unsplash lookup out of `MyTrips.jsx` into this function.
  - Cache each result in `sessionStorage` under `cover:<tripId>`, so moving between pages doesn't spend the Unsplash rate limit (50 requests an hour on a demo key).
  - Skip the lookup when the trip already has an `imageUrl` or when `VITE_UNSPLASH_ACCESS_KEY` isn't set (see Phase 0.2).
  - Wrap the whole thing in try/catch so a failed image never blocks the list.

#### 2.1b `Card` additions

- Add an optional `badge` prop. It renders a chip pinned to the top of the stub, over the image: `rounded-full bg-paper/90 px-3 py-1 text-xs font-extrabold text-ink shadow-float`.
- Add an optional `muted` prop for past trips: `opacity-75 saturate-50` on the stub image, with full opacity on hover.

#### 2.1c Dashboard (`/dashboard`): "What's coming up"

- **Data:** keep the existing fetch. Then call `withCoverImages`, then `splitTrips`, and use only `upcoming`.
- **Header:** `PageHeader` with the title "Your trips" and the "Add trip" `btn-primary` as the action.
- **Next trip:** the first upcoming trip, shown as a wide `Card` across the full width.
  - The badge is its `countdownLabel`.
  - Label it "Next trip" in `text-sm font-extrabold text-ink-soft` above the card.
- **Also coming up:** the rest of the upcoming trips, in `grid gap-8 xl:grid-cols-2`, each with its countdown badge.
- **Link to the archive:** a `btn-ghost` "See all trips" link to `/my-trips`. Show it only when there are past trips, with the count: "See all trips (4 past)".
- **Empty states, using `EmptyState`:**
  - **No trips at all:** keep the current copy ("No trips yet" / "Create your first trip").
  - **Only past trips:** title "Nothing booked yet", text "Your last trip was {name}. Plan the next one.", action "Plan a trip". Add a secondary link "See past trips".

#### 2.1d My Trips (`/my-trips`): the full list

- **Data:** keep its existing fetch and error handling (the 404 still means "no trips"). Replace the inline Unsplash code with `withCoverImages`, then use `splitTrips`.
- **Header:** `PageHeader` with the title "My trips" and the "Add trip" `btn-primary` as the action.
- **Upcoming section:** heading "Upcoming" (`font-display text-2xl`), the cards in `grid gap-8 xl:grid-cols-2` with countdown badges. When there are none, show a single line: "No upcoming trips." with a "Plan a trip" link.
- **Past section:** heading "Past trips". Cards use `muted` and the badge "Completed", which is the hook for the passport-stamp idea in the backlog. Hide the section entirely when there are no past trips.
- **No trips at all:** the same `EmptyState` as Dashboard.
- **Navbar:** keep the "My trips" link. With this split, "Dashboard" stays reachable through the logo.

### 2.2 Create trip (`/create-trip`)

Lay the form out as a **ticket being filled in**: one `Ticket` with `stacked` on mobile and side by side from `md`.

- **Main section:** trip name (the label says "Trip name"; the state variable `groupName` stays), dates and the invite list, described below.
- **Dates:** replace the two native date inputs with the adapted `DateRangePicker` (from `bidyut10--date-range-picker-card`; see the table). Above it, show the chosen range as "Departs 12 Jun · Returns 19 Jun", with "Pick your dates" until both are set.
- **Invite list:** an `EmailChipsInput` adapted from `laziekiki--smart-tag-input`. Chips are `rounded-full bg-lagoon-light px-3 py-1` with an `X` icon button that has `aria-label="Remove {email}"`. Show "3 of 10 invited". Keep `groupEmails` as the state, so `handleSubmit` doesn't change. Invalid emails show an inline error under the input instead of becoming a chip.
- **Stub (mustard):** a live summary of what's been entered (trip name, date range, number of travellers) and the "Create trip" `btn-dark`.
- Leave the commented-out "Pick through vote" block alone.
- The add-email button is inside no `<form>`; keep `type="button"` semantics so Enter doesn't do anything unexpected.

### 2.3 Trip detail (`/trip/:id`), the largest page (497 lines)

- **Header:** `PageHeader` with `back={{ to: "/my-trips", label: "My trips" }}`, the trip name as the title and the date range as the subtitle.
  - **Actions:** "Add event" (`btn-primary`), then "All events" and "Members" (`btn-ghost`).
  - **On mobile,** collapse the actions to one icon-button row.
- **Members strip:** under the header, a row of overlapping `Avatar`s, with a "+ Invite" chip for the trip creator. Clicking it opens the Members modal.
- **Calendar:** Schedule-X (`@schedule-x/react`). Don't restyle its internals with selectors. Theme it by overriding its CSS variables on the wrapper; these exist in `@schedule-x/theme-default`:
  - `--sx-color-primary`: `#0F4C57`
  - `--sx-color-on-primary`: `#FFFFFF`
  - `--sx-color-primary-container`: `#DDF1EF`
  - `--sx-color-background` and `--sx-color-surface-container-low`: `#FFFFFF`
  - `--sx-color-surface-container` and `--sx-color-surface-dim`: `#F2F8F7`
  - `--sx-color-surface-container-high`: `#DDF1EF`
  - `--sx-internal-color-text` and `--sx-color-on-background`: `#082F37`
  - `--sx-color-outline-variant` and `--sx-color-outline`: `rgba(15, 76, 87, 0.08)`. The grid needs some separation, so keep it very faint rather than removing it.
  - `--sx-rounding-small`: `12px`

  Check the result in the browser: some of these may also be set on inner elements, in which case set them on `.sx-react-calendar-wrapper`. Put the calendar on a white `rounded-3xl drop-shadow-ticket p-4` surface. Remove the fixed `width: 1200px` rule for `.sx-react-calendar-wrapper` from `index.css` and make it fluid (`w-full`, height about `min(70vh, 720px)`).
- **Event form modal (`Modal`):** fields `Event` (title), `Date`, `Starts`, `Ends` in a two-column grid for date and times. Footer: the primary is "Add event" or "Save changes" when editing; then "Cancel" (ghost); then, when editing, "Delete event" pushed to the left in plum text. Delete goes through `ConfirmDialog`. The date `min`/`max` limits stay.
- **Members modal (`Modal`):** a list of `Avatar` + name + email. The creator gets an "Organiser" chip. Show the remove `X` icon button only to the creator. The invite form uses `field` + `btn-dark` ("Send invite").
- Replace all four `alert()`s with toasts. Keep the messages but make them specific, e.g. "Invite sent to sam@example.com", "Event deleted", "{name} removed from the trip".
- Replace the `alert()` on line 43 about the event date range with an inline error in the event form. It fires from a drag-and-drop callback, so a toast is fine if inline isn't reachable.

### 2.4 All events (`/trip/:id/events`)

A day-by-day itinerary.

- Use `PageHeader` with a back link to the trip.
- Each day is a section whose heading is `font-display text-2xl` (e.g. "Saturday, 14 June").
- Each event is a white `rounded-2xl` row with a soft shadow: the time range on the left in `font-extrabold`, then the title, then the notes `textarea.field` (auto-grow, saves on blur as now).
- Replace the numbered bullets: the events are ordered by time, so the time itself is the marker.
- Under each notes box, show a `SaveIndicator` (pattern from `klyv-ui--save-indicator`): "Saving…", "Saved just now", or "Couldn't save" with a "Retry" link that calls `handleSaveNotes(event.id)` again. This replaces the `alert()`.
- The empty state uses `EmptyState` with a "Add an event" action that goes back to the trip.

### 2.5 Accept invitation (`/trip/:tripId/accept`): the flavour moment

The invitee lands here from an email, so make it feel like **being handed a boarding pass**.

- **Layout:** a full-height `Scene` with `Navbar overlay`, and one centred `Ticket` (`stacked`, `max-w-md`).
- **Main section:** "You're invited", the invitee's name, and the trip name and dates if the API returns them. Check the `/status` response; if they aren't there, show only what is.
- **Stub (mustard):** "Join trip" (`btn-dark`) and "Decline" (`btn-ghost`).
- **Accepted:** the stub turns `lagoon-light` with "You're on the trip", and the primary becomes "Open trip", which goes to `/trip/:tripId`.
- **Declined:** a neutral message and a "Back to my trips" link.
- Replace the two `alert()`s with these states. The page also has no `<Navbar />` today; add it.
- Replace `<a href="/dashboard">` with a router `Link`.

### 2.6 Profile (`/profile`): a passport page

- **Layout:** two columns from `md`.
  - **Left:** a "passport photo" card: a large `Avatar` (the uploaded picture or initials), the name in `font-display`, and the email.
  - **Right:** the bio and an "Edit profile" `btn-ghost`.
- **Edit mode:** switch to a form in place (no modal).
  - **Photo:** a drop zone adapted from `arunjdass--fileupload` (single image, preview in the large `Avatar`, a "Change photo" button, Remove). It feeds the existing `handleFileChange`.
  - **Fields:** Name, Email and Bio (`textarea.field`, 3 rows).
  - **Buttons:** "Save changes" (`btn-primary`) and "Cancel".
- **Message line:** the success or error `message` shows as a toast instead.
- **Missing photo:** the default picture URL is `${API_URL}/uploads/profile-pic.jpg`. If it fails to load, fall back to initials (`onError`).
- **Optional, if the data exists:** a "Stamps" row showing completed trips (from the trips API) as passport stamps. Ask the owner before adding a new API call.

### 2.7 Quiz (`/quiz`, `/result`)

- **Intro:** a `Scene` hero (with `Navbar overlay`) titled "What kind of traveller are you?", with "Start quiz" (`btn-primary`) and "Skip for now" (`btn-ghost`).
- **Progress as a route:** stops along a path ("Question 1 of 2"). Draw it as filled and empty dots joined by spacing, not a line, per the no-lines rule.
- **Options:** big selectable cards (`rounded-2xl bg-white drop-shadow-ticket`). The selected one gets a `bg-lagoon-light` fill and a check icon.
  - **Semantics:** following `a11ypros--accessible-radio-group`, use a real `<fieldset>` with the question as the `<legend>`, and visually hidden `<input type="radio" name="q{n}">` inside each card `<label>`. Arrow keys and the checked state then come from the browser. Style the selected card with `has-[:checked]:bg-lagoon-light`.
  - **Next is disabled until an option is chosen,** instead of the `alert()`.
- **Result:** the traveller type shown as a passport stamp (a circular badge in `plum`, slightly rotated, with Gloock text). Then "Plan a trip" (`btn-primary`, goes to `/create-trip` or `/register` when logged out) and "Retake quiz" (`btn-ghost`). Add `Footer`.
- **Known limitation, keep it:** only the last answer decides the result. Leave a `// TODO` comment, don't redesign the logic.

### 2.8 Reset password (`/reset-password`)

Reuse `AuthLayout` (as Login does): caption "Pick a new password.", `Register.png`, `imageSide="left"`. Fields are "New password" and "Confirm password" with `autoComplete="new-password"`, and the button is "Save new password". The stub holds a "Back to log in" link. Errors go through `apiErrorMessage`.

## Phase 3: clean-up once every page is converted

1. In `index.css`, delete the legacy block (the global `a`, `a:hover`, `button`, `button:hover`, `h1`, `.error-message`, `.success-message`, and the `prefers-color-scheme: light` block). Then search for any class names that relied on them.
2. Check that no page still imports a `.css` file other than `index.css`/`App.css`. Reduce `App.css` to nothing, then delete it and its import.
3. Run `npm run lint` in `client/` and fix new warnings in the files you touched.
4. Do a full manual pass: every route at 375px and 1440px, keyboard only (Tab through every page; focus is always visible; modals trap and return focus), with reduced motion turned on.

## Verification checklist (per page)

- [ ] `npx vite build` passes.
- [ ] Page's old `.css` file is deleted and not imported anywhere.
- [ ] No `alert()` / `window.confirm()` left on the page.
- [ ] Loading, error and empty states render with the Navbar.
- [ ] Works at 375px with no horizontal scroll.
- [ ] Every input has a label; every icon-only button has an `aria-label`.
- [ ] No borders or dividers were introduced.
- [ ] Behaviour unchanged: the same API calls with the same payloads.

## Flavour backlog (after the plan, if wanted)

- **Passport stamps for completed trips:** on Profile and on past trips in My Trips.
- **Time-of-day sky:** `Scene` shifts to dusk colours in the evening (pure CSS; the colour switch is driven by the hour).
- **Trip cover picker:** let the organiser pick one of 3–4 Unsplash results when creating a trip, instead of taking the first.
