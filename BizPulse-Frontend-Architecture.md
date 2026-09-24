# BizPulse — Frontend Architecture Specification

**Scope:** `/frontend` only, inside the shared monorepo. This is your build
reference. It is written to be consistent, field-for-field, with the
backend's `BizPulse — Data Model & Financial Domain Specification` (Django,
DRF). Where the two must agree — entity names, field names, derivation
formulas — they agree exactly, so nothing gets lost in translation at
integration time.

**Core principle, inherited from the backend spec, and just as true on the
client:**

> **STORE FACTS → DERIVE STATE → DERIVE METRICS**

The frontend does not store `outstanding`, `total_sales`, `cash_at_hand`, or
any other derived number as a persisted field, even locally. It stores the
same facts the backend stores, and computes everything else on read. This is
what keeps the offline copy and the server copy reconcilable: two systems
agreeing on raw facts is tractable; two systems agreeing on cached
derivations, each computed slightly differently, is how bugs happen.

---

## 1. Layered architecture

Four layers, each with one job, each only depending on the layer below it.
This is the shape a senior engineer defaults to for a local-first app: it
keeps sync, storage, and derivation independently testable, so a bug in one
never hides inside another.

```
┌─────────────────────────────────────────────┐
│  UI layer            screens, components      │  depends on domain + state
├─────────────────────────────────────────────┤
│  State layer          hooks, context           │  depends on domain + data
├─────────────────────────────────────────────┤
│  Domain layer         pure functions, types    │  depends on nothing
├─────────────────────────────────────────────┤
│  Data layer            IndexedDB, sync outbox   │  depends on domain (types only)
└─────────────────────────────────────────────┘
```

**Rule of thumb while building:** if you're tempted to compute `outstanding`
inside a component, stop — it belongs in the domain layer as a pure
function, called by a hook, rendered by the component. This is what makes
the derivation logic testable without a browser and reusable across every
screen that needs it.

---

## 2. Folder structure

```
/frontend
  /src
    /domain              # pure TS, zero dependencies, 100% unit-testable
      types.ts            # Business, Customer, DailyTally, CreditRecord, Repayment
      derivations.ts       # creditSalesForDate, totalSales, outstanding, cashAtHand...
      derivations.test.ts
    /data
      db.ts                # IndexedDB schema + open/migrate (Dexie recommended)
      repositories/
        businessRepo.ts
        customerRepo.ts
        dailyTallyRepo.ts
        creditRecordRepo.ts
        repaymentRepo.ts
      outbox.ts             # pending-sync queue, see section 5
      sync.ts               # push/pull engine, conflict resolution
    /state
      useBusiness.ts
      useDashboard.ts        # composes repos + derivations, exposes to UI
      useFollowUpList.ts
      useSyncStatus.ts
    /ui
      screens/
        SignupScreen.tsx
        LoginScreen.tsx
        OnboardingScreen.tsx
        HomeScreen.tsx        # today's tally entry
        DashboardScreen.tsx
        FollowUpScreen.tsx
        ExportScreen.tsx       # secondary feature, section 8
      components/
    /api
      client.ts              # thin fetch wrapper, one function per endpoint
      contract.ts             # TS types generated/mirrored from /API.md
    /pwa
      manifest.json
      service-worker.ts
  package.json
```

This structure is deliberately boring. Nothing clever, nothing you have to
explain to a teammate picking it up mid-hackathon. That's the point.

---

## 3. IndexedDB schema (mirrors the backend exactly)

Recommended library: **Dexie.js** — a thin, well-typed wrapper over raw
IndexedDB. Raw IndexedDB's API is callback-heavy and easy to get wrong under
time pressure; Dexie removes that risk for negligible cost.

Every table below carries three extra fields beyond the backend's own
schema. These exist only on the client, and are stripped before anything is
pushed to the API:

- `client_id` (string, UUID) — generated locally at creation time, the
  stable identity of a record across the sync boundary
- `synced` (boolean) — false until the backend has confirmed persistence
- `updated_at` (ISO timestamp) — used for last-write-wins conflict
  resolution (see section 6)

```ts
// domain/types.ts

interface Business {
  id?: number;           // server id, absent until first sync
  client_id: string;
  name: string;
  starting_cash: number;
  deleted_at: string | null;
  purge_at: string | null;
  synced: boolean;
  updated_at: string;
}

interface Customer {
  id?: number;
  client_id: string;
  business_client_id: string;   // local FK, resolved to business.id on sync
  name: string;
  phone: string;
  synced: boolean;
  updated_at: string;
}

interface DailyTally {
  id?: number;
  client_id: string;
  business_client_id: string;
  date: string;           // YYYY-MM-DD
  cash_sales: number;
  expenses: number;
  note: string;
  synced: boolean;
  updated_at: string;
}

interface CreditRecord {
  id?: number;
  client_id: string;
  customer_client_id: string;
  business_client_id: string;   // denormalized for offline queries, not sent to API
  amount: number;
  issued_date: string;
  due_date: string | null;
  synced: boolean;
  updated_at: string;
}

interface Repayment {
  id?: number;
  client_id: string;
  credit_record_client_id: string;
  amount: number;
  paid_date: string;
  synced: boolean;
  updated_at: string;
}
```

**Important reconciliation with the backend spec:** the backend's
`DailyTally` has no credit field — credit sales live entirely in
`CreditRecord`, keyed to a customer and a date, not to a tally. The frontend
must mirror this exactly. A "today's tally" entry on the home screen is
therefore not one write, it's a **coordinated write**: one `DailyTally`
(cash sales + expenses), plus zero or more `CreditRecord` rows (one per
named debtor, if any credit was given that day). See section 4.

Indexes worth adding in Dexie for the queries you'll actually run:
`daily_tallies` by `[business_client_id+date]` (enforces one tally per
business per day, matches the backend's constraint), `credit_records` by
`[customer_client_id]` and by `[business_client_id+issued_date]`,
`repayments` by `[credit_record_client_id]`.

---

## 4. The entry flow, precisely

This is the one place where getting the data model wrong would quietly
break every derived number downstream, so it's worth being explicit.

**"Today's tally" screen, on save, does the following:**

1. If `cash_sales` or `expenses` was entered (or both are zero but the user
   explicitly saved), upsert one `DailyTally` for `(business, today)`. Only
   one may exist per business per day — if one already exists for today,
   this is an update, not an insert.
2. For each credit line the user added (customer name — existing or new —
   amount, optional due date), create one `CreditRecord`. If the customer
   name doesn't match an existing `Customer` for this business, create the
   `Customer` first (locally), then the `CreditRecord` referencing it.
3. The credit field is genuinely optional at the UI level: zero credit
   lines is a normal, common save, not an edge case.
4. All of this happens in a single local transaction so the UI never shows
   a half-saved state (a tally with no matching credit records if the app
   crashes mid-write, for instance).
5. Each new/updated record is also pushed onto the sync outbox (section 5).

```ts
// state/useHomeScreen.ts (sketch)

async function saveTodayTally(input: {
  cashSales: number;
  expenses: number;
  note?: string;
  creditLines: { customerName: string; amount: number; dueDate?: string }[];
}) {
  await db.transaction('rw', db.dailyTallies, db.customers, db.creditRecords, async () => {
    await dailyTallyRepo.upsertForDate(businessClientId, today, {
      cash_sales: input.cashSales,
      expenses: input.expenses,
      note: input.note ?? '',
    });

    for (const line of input.creditLines) {
      const customer = await customerRepo.findOrCreate(businessClientId, line.customerName);
      await creditRecordRepo.create({
        customer_client_id: customer.client_id,
        business_client_id: businessClientId,
        amount: line.amount,
        issued_date: today,
        due_date: line.dueDate ?? null,
      });
    }
  });

  outbox.enqueueDirtyRecordsSince(transactionStartedAt);
}
```

---

## 5. Sync engine — the outbox pattern

A senior-standard approach for local-first sync, and the right level of
complexity for a 7-day build (not over-engineered, not naive).

**Why an outbox, not "just POST on save":** posting immediately fails
silently the moment the network is down, which is the exact condition this
app is designed around. An outbox decouples "the user saved something" from
"the network happened to be up at that moment."

```ts
// data/outbox.ts

interface OutboxEntry {
  id: number;                 // autoincrement
  entity: 'business' | 'customer' | 'daily_tally' | 'credit_record' | 'repayment';
  client_id: string;
  operation: 'create' | 'update';
  attempted_at: string | null;
  attempts: number;
}
```

**Flow:**

1. Every local write (create/update) appends one `OutboxEntry`, referencing
   the record by `client_id`, never by server `id` (which may not exist
   yet).
2. A sync process runs: on app load, on the browser's `online` event, and on
   a short interval (e.g. every 30s) as a safety net for flaky connections
   that don't fire clean online/offline events.
3. For each pending entry, in creation order (parents before children —
   `Customer` before its `CreditRecord`, `CreditRecord` before its
   `Repayment`): POST/PATCH the fact to the matching API endpoint. On
   success, mark the local record `synced: true`, store the server `id`,
   remove the outbox entry.
4. On failure (network or 4xx), leave the entry queued and retry later; log
   5xx/4xx distinctly since a 4xx (e.g. validation error) will never
   succeed by retrying and should surface to the user instead of silently
   spinning forever.
5. **Only facts are pushed** — never a derived value. The request body for
   a `CreditRecord`, for instance, is exactly `{amount, issued_date,
   due_date, customer}`, nothing computed.

---

## 6. Conflict resolution

**Rule (matches the team-agreed default in the project brief):
last-write-wins, keyed by `client_id` + `updated_at`.**

- On sync pull, if the server returns a record with the same `client_id`
  but a newer `updated_at` than the local copy, the server version replaces
  the local one.
- If the local copy is newer (was edited offline after the last sync), the
  local version is what gets pushed, overwriting the server's.
- This is a known, accepted simplification for a single-user MVP. It is not
  correct for true multi-device concurrent editing, and that's fine — this
  product doesn't have that use case yet (see brief section 10, scope: one
  user per business).

Do not build anything fancier than this (no CRDTs, no operational
transforms) for the hackathon. It would be solving a problem the product
doesn't have yet, at the cost of time it can't spare.

---

## 7. Derivations (domain layer — pure, and this is where they must live)

These mirror the backend spec's formulas exactly. The frontend computes
these locally for instant offline display; the backend computes the same
formulas server-side as the authoritative source once synced. Two
implementations of the same formula is intentional (see the brief's
"offline-first and sync" section) — what matters is that the formula itself
never drifts between them. Copy these definitions verbatim into both
codebases; don't let either side improvise.

```ts
// domain/derivations.ts — pure functions, fully unit-testable, no I/O

function creditSalesForDate(creditRecords: CreditRecord[], date: string): number {
  return creditRecords
    .filter(c => c.issued_date === date)
    .reduce((sum, c) => sum + c.amount, 0);
}

function totalSales(tally: DailyTally | undefined, creditSales: number): number {
  return (tally?.cash_sales ?? 0) + creditSales;
}

function outstanding(credit: CreditRecord, repayments: Repayment[]): number {
  const repaid = repayments
    .filter(r => r.credit_record_client_id === credit.client_id)
    .reduce((sum, r) => sum + r.amount, 0);
  return credit.amount - repaid;
}

function customerOutstanding(
  customerClientId: string,
  creditRecords: CreditRecord[],
  repayments: Repayment[]
): number {
  return creditRecords
    .filter(c => c.customer_client_id === customerClientId)
    .reduce((sum, c) => sum + outstanding(c, repayments), 0);
}

function cashAtHand(
  business: Business,
  cashSalesTotal: number,
  repaymentsTotal: number,
  expensesTotal: number
): number {
  return business.starting_cash + cashSalesTotal + repaymentsTotal - expensesTotal;
}

function isOverdue(credit: CreditRecord, repayments: Repayment[], today: string): boolean {
  return credit.due_date !== null
    && credit.due_date < today
    && outstanding(credit, repayments) > 0;
}
```

**Test file expectation (`derivations.test.ts`):** every function above
gets a direct unit test with 2-3 cases each (zero state, partial repayment,
fully repaid, overdue vs. not). This is cheap to write, catches real bugs,
and is exactly the kind of test coverage that reads as competent
engineering to a judge skimming the repo.

---

## 8. Export to file (secondary feature — noted, not forgotten)

Per your teammate's message: this was in scope conceptually but kept
slipping through. It's correctly a **secondary/stretch feature** — add it
only once sections 1–7 are solid.

**Recommended shape, kept intentionally simple:**

- **Client-side only, no new backend endpoint needed for v1.** All the data
  needed already lives in IndexedDB. Generate a CSV client-side (a `date,
  cash_sales, credit_sales, total_sales, expenses` row per day, plus a
  second sheet/section for credit records) and trigger a browser download.
- Library: none required — a CSV is just a joined string and a `Blob`; no
  need to pull in a dependency for this.
- **Placement:** a single "Export" button on the dashboard, exporting the
  currently selected date range (reuse the This Month / This Year toggle
  already on that screen, don't build a separate range picker).
- **If time allows beyond CSV:** a simple PDF export (a static HTML-to-PDF
  render of the dashboard numbers) reads well in a demo as "lender-ready
  summary," which ties directly into the brief's core pitch. Treat this as
  a stretch-on-the-stretch, only after CSV export works.
- Explicitly **not** in scope for the hackathon: scheduled/automatic
  exports, emailing the export, or a backend export endpoint. All of that
  is a fine "future direction" line in the pitch, not a build task.

---

## 9. API contract checklist (coordinate with backend before building against it)

The frontend and backend are being built in parallel by different people in
different languages, so this file (or its equivalent, `/API.md` at the repo
root per the project brief) is the seam where mismatches will happen if
it's skipped. Confirm each of these explicitly with your teammate, don't
assume:

- [ ] Exact endpoint paths and HTTP verbs for each entity (create, update,
      list) — Django REST Framework's default router naming may not match
      what's assumed above
- [ ] Auth: does the API expect the JWT in an `Authorization: Bearer`
      header? Confirm the exact login/refresh response shape
- [ ] Does the backend accept `client_id` on create, and echo it back in
      the response, so the frontend can reconcile the local record with the
      server-assigned `id`? (This is required for the sync design above to
      work — flag it early if it's not already planned server-side.)
- [ ] Field naming: confirm `cash_sales` / `expenses` / `issued_date` /
      `due_date` etc. are the literal JSON keys the API sends and expects,
      matching the backend spec above exactly
- [ ] Error response shape (for surfacing validation errors from the
      outbox's retry logic, e.g. a 400 on an invalid `CreditRecord`)
- [ ] Pagination shape, if any, for list endpoints used during a full pull

---

## 10. What this document deliberately leaves out

Consistent with the team brief (v3.3): no voice input, no AI/LLM calls in
this build, no per-product tracking, no multi-user access, no CRDT-based
conflict resolution. If any of these get picked up later, they're
additions to this architecture, not replacements for it — the domain layer
and sync engine above don't need to change to accommodate them.
