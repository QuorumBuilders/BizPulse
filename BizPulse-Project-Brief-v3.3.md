# BizPulse: Project Brief (v3.3)

*Validated with real traders. A macro financial record, built the way they already work.*

| | |
|---|---|
| **Hackathon** | Borderless Bytes Hackathon by StacStart (Stacstart Career Summit 2026) |
| **Track** | FinTech & Commerce |
| **Country focus** | Nigeria (extendable to Kenya, Uganda and Ghana) |
| **Tagline** | She keeps doing what she already does. We make sure it adds up to something she can show a lender. |
| **What changed in v3.3** | Backend moved from NestJS to Django + DRF; frontend and backend are now built in parallel by two different people; the frontend is offline-first using IndexedDB, syncing to the backend once network returns. |

---

## 1. What we learned from real traders (this drives everything below)

**Core insight:** This is not bookkeeping software. Most small traders do not record every sale by product. At the end of the day they already calculate, in their head or on paper, two numbers: how much was sold in total, and how much of that was on credit. They estimate the rest when someone asks. Our job is not to make them record more, it is to capture the totals they already calculate, conveniently, and keep them as a digital record over time.

### Three findings from the research, and what each one changed

| Finding | What it changes |
|---|---|
| Traders tally totals at closing (total sold, total on credit, expenses), not per-product or per-sale. | Daily entry becomes a short end-of-day tally, not a live transaction log. This is simpler to build and closer to how they already work. |
| Market talk about money is not private. Saying amounts and debtor names out loud can be overheard by customers or other traders. | Typing is the default for every user; voice is an optional, opt-in toggle rather than something used mid-sale in public. |
| Investors and lenders ask for macro numbers (revenue trend, margin, debt exposure), not micro sales detail. Most traders cannot answer this without estimating. | The product's real long-term value is bankability: a clean digital financial history, built for free, as a side effect of the daily tally. |

### Where the idea came from

The idea originates from a teammate with experience across the marketplace, and was checked against interviews with other small traders. Their words shaped the design, not our assumptions.

---

## 2. The product, in plain words

BizPulse turns the daily total a trader already calculates into a digital business record. No per-product tracking, no accounting knowledge, no new habits. She still just tallies her day. The app remembers it, tracks who owes her, and does the month-end and year-end maths for her, automatically.

### Example: Mama Ada, who sells provisions in Ibadan

1. At closing, she taps the app once and says or types: *"Sold 80k today. 15k of that was on credit, Bola and Ngozi."*
2. The app confirms what it understood, in text (and voice, if she chooses), before saving.
3. It quietly tracks Bola and Ngozi's balances and due dates without her needing to remember or search her notebook.
4. At month end, she sees five numbers: revenue, expenses, business result, cash, outstanding debt, compared with last month, with no calculation required.
5. A year from now, she has something she never had before: a real, dated financial history she could show a lender.

---

## 3. Problem statement

- Small business owners already calculate a daily total in their head or notebook, they don't lack the habit of tracking money.
- What they lack is a way to keep that total over time without manually re-adding, comparing months, or digging through old books.
- They cannot separate cash received from credit given without extra effort, and cannot easily see who is overdue.
- When a lender, investor or partner asks "how is the business doing," they estimate, because the real numbers were never kept anywhere durable.
- Existing apps assume she wants to switch to per-product bookkeeping and type in English. That's a bigger ask than she needs or wants.

---

## 4. Our solution

BizPulse is a **convenience-first, macro-data record**: it captures the same daily tally the owner already does, with as little friction as possible, and silently builds the credible financial history she doesn't have today. It is **not** accounting software, an ERP, or a credit-scoring system.

**Philosophy:** Capture what she already calculates → keep it safely over time → hand back the few numbers and plain-language insights that show business health.

---

## 5. Target audience

- Owner-operated small businesses in Nigeria: shops, market traders, food vendors, salons, small distributors.
- Especially traders who sell many small, similar items (provisions, foodstuff) and tally in total rather than per product.
- Businesses with only 2 to 3 distinct product lines, which some owners already track separately, are a secondary case, not the primary design target.
- Owners who are comfortable with a smartphone and a calculator but not with accounting jargon or bookkeeping apps.

---

## 6. What makes us different

Most bookkeeping and accounting apps on the market (Kippa, QuickBooks-style tools, and similar) assume the owner will log each sale, often by product, learn a chart of accounts or categories, and type comfortably in English. That is a bigger ask than most owners want to take on, and it is why so many stop using them within weeks.

- **Matches an existing habit instead of replacing it.** Captures the end-of-day tally traders already do, not per-sale, per-product bookkeeping.
- **Macro data, not micro data.** We deliberately don't track individual product sales, only the totals that show business health, which is also what most other tools get wrong by over-collecting detail nobody keeps up with.
- **Privacy-aware by design.** Typing is the default for everyone; voice is an optional toggle for those who want it. This came directly from trader feedback.
- **Builds credit-worthiness passively.** Months of consistent totals become a record a trader can eventually show a lender or investor, at no extra effort to her, which is a byproduct most bookkeeping apps never surface back to the owner.
- **Hero feature: "Who should I follow up with?"** Ranked debtors, overdue amounts, payment patterns, and a one-tap reminder message, a use of the data that a generic ledger doesn't offer.

**In one line:** other tools ask her to become a bookkeeper. BizPulse asks her to keep doing exactly what she already does.

---

## 7. Core features (MVP)

| Feature | What it does |
|---|---|
| End-of-day tally entry | One short entry per day: total sold, total expenses, and total on credit (optional, not every day has credit sales), with names if given. Not per-product. |
| Confirmation screen | Shows what the app understood in big text with Yes / Edit buttons before saving. Protects against input errors. |
| Typed entry (default) | The primary and only method shown by default. Large buttons, minimal typing, works for every user. |
| Voice entry (optional toggle) | Off by default; turned on in settings by users comfortable with tech. Never the only way in. |
| Debtor tracking | Names, amounts and due dates from credit given; record payments; balances update automatically; overdue and due-soon views. |
| Follow-up list (hero) | Ranked debtors, payment history pattern, one-tap reminder message. |
| Simple dashboard | Revenue, expenses, business result, cash, outstanding debt. Compared with last month. This Month / This Year toggle. |
| Auto insights | Plain-language observations, e.g. "Revenue went up, but expenses went up faster." |
| Digital financial history | The accumulating record itself, the long-term payoff: months of real numbers instead of estimates. |
| Installable web app (PWA) | Add to home screen; opens like an app; no app store. |

### Optional and stretch (only if time allows)

- Optional charts for users who like visuals (hidden by default).
- Per-product tracking, opt-in only for the few businesses that already separate 2 to 3 product lines.
- Text-to-speech replies, additional languages (Hausa, Igbo), lender-ready summary export.

### Explicitly out of scope

Per-sale or per-product bookkeeping, full accounting or general ledger, inventory, payroll, POS, invoicing, forecasting, AI financial advisor, credit scoring, lending or investor marketplaces, bank integrations, ERP features.

---

## 8. How entry works, day to day

**One entry, at closing, capturing totals, not a stream of per-sale entries. Typing is the primary method for everyone.**

- **Primary and only default: type.** Three fields on the home screen: total sold, total expenses, and total on credit. The credit field is optional and can be left blank or skipped, since not every day has credit sales. An optional name and due date can be added per credit amount. This is what every user sees first, with no mic button competing for attention.
- **Voice is a secondary, opt-in convenience,** off by default, turned on from settings by users who are more comfortable with tech. It is not presented as an equal alternative to everyone.
- **Why typing leads:** traders told us market conversations about money are not private, saying amounts and names aloud in public is a real risk. Typing also has less friction to set up and trust than voice for most users.
- **AI's job, when voice is on:** parse a spoken sentence into the three numbers and any names/dates. All calculations (totals, overdue, comparisons) run in normal code, not AI, either way.
- **Fallback:** typing always works, so a failed voice or AI call during a live demo never blocks saving an entry.
- **Day 1 test:** still worth validating speech-to-text for Yoruba and Pidgin in a quiet setting, but it is no longer a go or no-go for the whole product, since voice is optional.

---

## 9. Home screen: what the team is building

A rough layout to build from, agreed with the team:

- **Top:** two metric cards, revenue this month and cash position.
- **Middle:** "Today's tally" card with three fields, total sold, expenses, and on credit (optional, skip if none), and a single save button. A small "Prefer to speak this? Turn on" line sits below the fields, off by default.
- **Bottom:** "Who to follow up with", a short list of debtors ranked by how overdue they are, with a "see all" link to the full follow-up list.

### UI principles

- Typing three numbers is the core loop, everything else supports it.
- Big, readable numbers; icons and colour instead of accounting terms.
- Voice is available, never forced, and never the only way in.
- Very few screens; no per-product setup required to get started.
- Charts are optional, not default.

---

## 10. Auth and onboarding

Kept deliberately simple for a 7-day build, no OTP or SMS provider needed.

- **Sign up:** name, business name, and the user's choice of phone number or email as the sign-up identifier, plus password and confirm password.
- **Log in:** phone or email, plus password.
- **Password handling:** hashed on the backend (Django's built-in password hashing), never stored in plain text.
- **Validation:** minimum password length; a clear inline error if the confirm field doesn't match.
- **Onboarding:** business setup (business name, type, starting cash) runs right after signup, using the business name already given, no separate second form.
- **Scope:** single user per business for the MVP. Staff or multi-user access is a future direction, not part of this build.

---

## 11. Suggested tech stack

Team split: frontend (Next.js/TypeScript) and backend (Python/Django) are being built by different people, **in parallel, as two separate projects**, so neither person waits on the other. The frontend works offline-first and syncs to the backend once it's reachable, rather than depending on it being ready from day one.

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React) + TypeScript + Tailwind CSS | Fast, mobile-friendly, easy to deploy |
| PWA + offline storage | Web manifest + service worker + IndexedDB (or Dexie.js as a friendlier wrapper) | Installable, works with no or poor network, queues entries locally |
| Sync layer | Background sync on reconnect: push queued local entries to the API, pull latest server state | Frontend never blocks on the backend being available |
| Backend | Django + Django REST Framework (DRF) | Teammate's strongest stack; fast to build a clean REST API in |
| Database + ORM | PostgreSQL + Django ORM | Reliable, free tier (Supabase/Neon/Railway Postgres), built-in migrations |
| Auth | DRF + JWT (djangorestframework-simplejwt) | Keep it minimal, matches the signup/login fields in section 10 |
| API contract | A short OpenAPI/JSON spec at the repo root (e.g. /API.md), shared between frontend and backend since there are no shared TS types across languages | Keeps both sides in sync while building in parallel, in the same repo |
| Insights engine | Logic exists twice, deliberately: a small offline-safe version in the frontend (for instant local preview) and the authoritative version in Django (source of truth after sync) | Lets the frontend show numbers immediately, offline, without waiting on the server |
| Deploy | Vercel (frontend), Render or Railway (Django API) | Free tiers, live URL for submission |
| Repos and tests | One public GitHub monorepo, with /frontend and /backend folders and a shared API contract file at the root. Jest on the frontend, Django's test runner on the backend. | Matches the single-repo-link submission form; keeps the API contract visible to both sides |

### Backend modules (Django apps)

- **accounts:** signup (name, business name, phone or email, password), login, password hashing, JWT issuing
- **business:** onboarding and settings, created right after signup
- **entries:** the end-of-day tally (total sold, credit given, expenses), typed by default, plus the sync endpoint that accepts locally-queued entries
- **debtors:** customers, credit amounts, payments, overdue logic, reminder messages
- **insights:** dashboard numbers, month and year comparisons, trend rules — the authoritative calculations
- **voice (optional toggle, later):** speech-to-text and parsing for users who turn it on, with typing always available as the fallback

### Data model (simple, macro-first)

- users (id, name, phone_or_email, password_hash)
- businesses (id, user_id, name, type, starting_cash, language, voice_enabled)
- daily_entries (id, business_id, date, total_sold, total_credit_given, total_expenses, note, client_id, synced_at)
- customers (id, business_id, name, phone)
- credit_items (id, business_id, customer_id, amount, date, due_date, status)
- payments (id, credit_item_id, amount, date)

`client_id` and `synced_at` are new: the frontend generates a `client_id` when an entry is created offline, so the backend can tell a fresh sync from a duplicate resubmission.

### Key definitions (agree on these early)

- **Revenue** = sum of total_sold across entries in the period
- **Business Result (profit)** = Revenue − total expenses
- **Cash Position** = starting cash + cash received (revenue minus credit given, plus collected debts) − expenses
- **Outstanding Debt** = credit given − payments received
- **Overdue** = outstanding debt past its due date

---

## 12. Offline-first and sync

**Why:** traders often have no or poor mobile network at their stall. The frontend must never block on the backend being reachable. She can open the app and log today's tally with zero signal, full stop.

- **Local-first writes.** Every daily entry, customer and payment is written to IndexedDB on the device first. The UI reads from local storage, so it's instant regardless of network.
- **Background sync.** When the device regains network, queued local writes are pushed to the Django API in the background. The dashboard and follow-up list use local data until a sync completes, then reconcile with the server's response.
- **Conflict handling (hackathon-scope default):** last write wins, keyed by client_id and updatedAt. This is a known simplification, fine for a single-user MVP where the same entry is unlikely to be edited on two devices at once.
- **Authoritative numbers live on the backend.** The frontend can show an instant local estimate of the dashboard and insights, but Django's calculation is the source of truth once synced, this avoids two systems silently disagreeing.
- **Demo implication:** the live demo can run with network on for simplicity, but a short "look, it still works offline" moment (airplane mode, log an entry, reconnect, watch it sync) is a strong, low-cost thing to show judges.

---

## 13. Demo plan (5 minutes or less)

1. Open the installed app with **3 to 4 months of realistic pre-loaded daily tallies** (an empty account looks weak).
2. Show one end-of-day entry: type the three numbers and save. Optionally show it working in airplane mode, then syncing on reconnect.
3. Open the dashboard: a few big numbers with the This Month / This Year toggle.
4. Open the hero feature: ranked debtors, overdue days, payment pattern, and send a one-tap reminder.
5. Show an auto insight, e.g. "Revenue up 12%, expenses up 18%."
6. Close with the real insight that shaped the product: traders already calculate this, we just make sure it's kept, so a lender doesn't have to take her word for it.

---

## 14. How this scores against the judging criteria

| Criteria | Weight | Our angle |
|---|---|---|
| Technical execution | 35% | Offline-first sync, a clean Django API, well-tested insights logic, smooth live demo with fallbacks |
| Problem fit | 25% | Grounded in direct trader research, not assumptions; matches an existing habit instead of replacing it |
| Demo / communication | 20% | Clear story (Mama Ada), real trader quotes, strong hero feature |
| Originality and innovation | 20% | Macro-data-first approach, privacy-aware voice, passive credit-worthiness building |

---

## 15. Timeline and deliverables

**Confirm the deadline:** the event page says **Sept 28, 11:59 PM**, but the flyer says Oct 1. Plan for Sept 28. To enter you need a team of 2 to 4 and a social post using #BuildWithStacStart.

Frontend and backend are built in parallel, as separate tracks, so neither person blocks the other. They sync up around the API contract early (Sept 22-23) and again once real endpoints are ready to connect to (Sept 25-26).

| Date | Frontend track | Backend track |
|---|---|---|
| Sept 21 | Research complete; idea confirmed. Join the Hub, post #BuildWithStacStart | Same |
| Sept 22 | Repo setup, PWA shell, IndexedDB schema, signup/login/entry screens built against mock data | Repo setup, Django project + DRF, models, deploy skeleton live |
| Sept 23 | Local-first daily entry and debtor screens, all working offline against local storage | Auth (accounts app), business onboarding, daily-entry and debtor endpoints |
| Sept 24 | Dashboard and follow-up list UI, still against local/mock data | Insights logic (authoritative calculations), overdue rules, unit tests |
| Sept 25 | Connect frontend to real API: auth, then entries. Build the sync layer (push queued writes, pull server state) | API polish, confirm contract matches frontend, deploy the real build |
| Sept 26 | Seed 3 to 4 months of realistic data (via API or direct DB), UI polish, test on real phones | Support integration, fix contract mismatches, seed data if needed on backend side |
| Sept 27 | Deploy, bug fixes, record video pitch (demo of the build and its features) | Final deploy, bug fixes |
| Sept 28 | Final checks and submit in the afternoon, not at 11:50 PM | Same |

**Submission checklist:** live deployed URL, public GitHub repository, video pitch, project title, target audience and tech stack.

---

## 16. Suggested team split

- **You (frontend):** PWA shell, IndexedDB local storage, all screens (entry, dashboard, follow-up list), the sync layer, offline-safe local calculations
- **Teammate (backend):** Django + DRF API, auth, data model, authoritative insights/overdue logic, deployment, tests
- **Voice and AI (later, optional):** picked up by whoever has time once the core is working, on either side
- **Pitch and demo (shared):** seed data, demo script, video demo of the build and its features

---

## 17. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Frontend and backend drift apart on data shapes since there's no shared TS types | Agree a short API contract (endpoints + JSON shapes) by Sept 22-23, before either side builds much against it |
| Offline-first sync logic (conflicts, duplicate entries) is more complex than a simple online-only app | Use the simple client_id + last-write-wins rule in section 12; don't build anything fancier for this MVP |
| We quietly slide back into per-product bookkeeping features | Re-check every feature against the daily-tally model before building it |
| Research came mostly from one teammate's network | Treat findings as strong direction, not final proof; keep listening as you build |
| Scope creep in a 7-day build | Protect: daily entry, debtors, simple dashboard, sync. Cut everything under stretch. |
| Empty-looking demo | Seed 3 to 4 months of realistic data from the first days |

---

## 18. Decisions for the team

### Confirmed

- **App name:** BizPulse.
- **Debtor names and dates:** optional per entry, the credit field can be left blank on days with no credit sales.
- **Sign-up identifier:** the user chooses phone number or email at signup, it is not fixed by us.
- **Video pitch:** a straight demo of the build and its features, as the submission checklist asks for. No filming of the trader who inspired the idea.
- **Repo structure:** one monorepo, /frontend and /backend folders, matching the single-repo-link the submission form asks for.

### Still open

- **Speech-to-text provider,** if the team reaches the voice toggle after typing is solid. My suggestion: start with a hosted API such as AssemblyAI, since it has a dedicated Yoruba model, a plain REST/TypeScript SDK, and needs no self-hosting, which fits a 7-day build. Treat an open model like NaijaVox as a fallback only if accuracy or cost rules AssemblyAI out on the Day 1 test. This is optional either way, since typing remains the default and fallback.
