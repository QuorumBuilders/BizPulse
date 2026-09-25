# BizPulse — Phase 2 Plan (Post-MVP: Design, Auth Integration, New Features)

Frontend MVP is done. This is the next-phase plan, prioritized, for revamp and
new integration work now that the backend MVP is also complete.

---

## 0. Do this first — before building any new page

**Inspect the backend's Postman collection / API docs for the real contract
of every endpoint below.** Endpoint names tell you the URL, not the
behavior. For each auth endpoint, confirm:

- Exact request body field names (e.g. is it `email` or `identifier`?
  `password1`/`password2` or `password`/`password_confirm`?)
- Exact response shape (what comes back on success, what comes back on
  error, and the error format)
- Token shape: one token, or an access + refresh pair? Where does it go —
  response body, or an `httpOnly` cookie? This changes how you store and
  attach it on the frontend.
- **Does email verification block login?** i.e. after `register/`, can the
  user hit `token/` immediately, or does the API reject login until
  `verify-email/` has been completed? This decides your onboarding flow
  order.
- **Flag with your teammate:** the endpoint list (`email/change`,
  `verify-email`, `verify-email/resend`) looks email-only. The brief says
  signup is "phone number **or** email, user's choice." Confirm whether
  phone-based signup is actually supported by this backend, or whether that
  decision changed. Don't build a phone-signup screen against a backend
  that doesn't accept it.

---

## 1. Design system and UI/UX pass

**Goal:** clean, neutral, senior-frontend-quality UI that a non-technical
user finds obvious to navigate.

- **Neutral colour palette:** a small, restrained set — one neutral scale
  (backgrounds, borders, text) plus one accent colour for actions/success,
  and one for warnings/overdue states (e.g. red for "overdue" in the
  follow-up list). Avoid more than 2 non-neutral colours total; this is
  what makes an app feel calm rather than busy.
- **Type and spacing scale:** pick one consistent scale (e.g. Tailwind's
  default `text-sm/base/lg/xl/2xl` and `4/8/12/16/24px` spacing) and use it
  everywhere, rather than ad hoc sizes per screen.
- **Consistency over novelty:** same button style, same input style, same
  card style across every screen. A senior engineer's UI usually looks
  "boring" in the best sense — nothing to relearn from screen to screen.
- **Accessibility basics:** sufficient colour contrast (important for
  outdoor/bright-phone-screen use, which your actual users will have),
  large tap targets (44px minimum), readable font sizes by default (no
  12px body text).
- **Mobile-first, explicitly:** every screen designed at ~375px width
  first, then scaled up. This was flagged earlier as worth being explicit
  about with the agent.

---

## 2. Landing page

**Purpose:** explain what BizPulse does, then get the visitor into the app.

**Recommended flow, since this is a PWA, not an app-store app:**
- There's no real "download" step separate from using the web app itself.
  A landing page can't trigger a native app-store-style download.
- **"Get Started" should route straight into the web app's signup/login
  screen**, at the same URL the app already lives at.
- **Installing to the home screen is a separate, optional nudge**, not a
  gate before signup: either let the browser's native "Add to Home Screen"
  / install prompt fire naturally, or add a small one-time banner *after*
  signup ("Install BizPulse for faster access — Add to Home Screen") so the
  first-time flow isn't interrupted by an install prompt before they've
  even seen the product.

**Structure (keep it to one screen, no scrolling essay):**
1. Headline + one sentence, ideally reusing the brief's own line: *"She
   keeps doing what she already does. We make sure it adds up to something
   she can show a lender."*
2. 3-4 short feature highlights (typed daily entry, debtor follow-up,
   automatic monthly numbers) — icons + one line each, not paragraphs
3. One "Get Started" button → signup

---

## 3. Auth pages to build (matching the real backend endpoints)

| Endpoint | Page / UI needed | Notes |
|---|---|---|
| `POST /api/auth/register/` | Signup screen (exists — confirm field names match the real contract) | Verify field names against Postman, don't assume from the brief |
| `POST /api/auth/token/` | Login screen | Confirm access/refresh token shape |
| `POST /api/auth/token/refresh/` | No page — a background service that silently refreshes the token before it expires | Needed to keep the user logged in without repeated logins |
| `POST /api/auth/logout/` | Not a full page — a "Log out" action in a settings/profile menu | |
| `POST /api/auth/verify-email/` | Email verification landing screen — the user arrives here via a link from their email; this page calls the endpoint with the token from the URL and shows success/failure | |
| `POST /api/auth/verify-email/resend/` | "Resend verification email" button, shown when the account is unverified (e.g. on login attempt, or a banner in-app) | |
| `POST /api/auth/password/change/` | "Change password" screen, in-app, for a logged-in user (old password + new password + confirm) | |
| `POST /api/auth/password/reset/` | "Forgot password?" screen — user enters their email, requests a reset link | |
| `POST /api/auth/password/reset/confirm/` | "Reset password" screen — user arrives via emailed link with a token, sets a new password | |
| `POST /api/auth/email/change/` | "Change email" screen, in profile/settings | Confirm this still makes sense if phone-based signup turns out to be supported too |

**Build order suggestion:** register → login → token refresh service →
logout, since these block everything else. Password reset and email
verification can follow once the core loop (signup → use the app) works
end to end again with the real backend.

---

## 4. Performance — "ultra fast"

- **Route-level code splitting:** Next.js does this by default per page;
  don't undo it by importing everything into one giant bundle.
- **Keep the landing page static/lightweight** (no heavy JS needed there),
  Next.js static generation is ideal for it.
- **Lean on IndexedDB for perceived speed:** the dashboard and entry
  screens should render from local data instantly, never show a loading
  spinner waiting on the network for data that's already sitting locally.
- **Skeleton states, not spinners**, for anything that must wait on the
  network (e.g. first login before local data exists).
- **Audit bundle size** before calling this done — run `next build` and
  check the output; a "clean, neutral" redesign is a good moment to also
  strip any unused dependencies from the MVP build.
- **Optimize icons/images:** SVGs over raster images, no unnecessarily
  large assets on the landing page.

---

## 5. New features

### Speech-to-text entry
This was already scoped as an optional toggle in the frontend architecture
doc (off by default, opt-in). Building it now:
- Reuse the existing "Prefer to speak this? Turn on" toggle already in the
  home screen design.
- Speech-to-text provider: use the suggestion already confirmed in the
  brief — start with a hosted API such as AssemblyAI (Yoruba model, plain
  TypeScript SDK), typing remains the fallback if it fails or is turned
  off.
- AI's job stays narrow: parse the spoken sentence into the same three
  fields (sold, expenses, credit) the typed form already uses — feed it
  into the exact same save flow (section 4 of the frontend architecture
  doc), don't build a separate voice-only save path.

### WhatsApp integration (backend-led — a bot)
This is primarily backend scope, but flag the frontend touchpoints early
so they're not a surprise later:
- Likely a **"Connect WhatsApp"** action somewhere in settings (e.g. a
  linking code or QR shown in-app, generated by the backend, scanned/sent
  to the bot).
- If the bot can also *create* entries (e.g. she sends a WhatsApp message
  and it becomes a daily tally), the frontend doesn't need to build
  anything extra for that specific flow — it's backend writing to the same
  data the app already reads. Confirm with your teammate whether that's
  the intent, since it changes whether the frontend needs to show
  "entry added via WhatsApp" anywhere for clarity.

---

## 6. Suggested priority order

1. **Inspect the Postman collection / API docs** (section 0) — blocking,
   do this before writing any new page
2. **Core auth integration** (section 3): register, login, token refresh,
   logout — the app doesn't really work end-to-end without these
3. **Design system pass** (section 1) — touches every screen, worth doing
   once auth is wired so you're not restyling twice
4. **Landing page** (section 2)
5. **Remaining auth pages**: password reset/change, email verify/change
6. **Performance audit** (section 4)
7. **Speech-to-text entry** (section 5)
8. **WhatsApp integration touchpoints**, once the backend side is ready
   (section 5) — mostly a backend timeline dependency, not a frontend one
