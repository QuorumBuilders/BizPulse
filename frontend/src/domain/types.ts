/**
 * BizPulse — Domain Types
 *
 * These are the canonical local entity shapes stored in IndexedDB.
 * They mirror the backend's data model (Django models) field-for-field,
 * with three extra client-only fields added to every table:
 *   - client_id   : stable UUID generated locally at creation time
 *   - synced      : false until the backend has confirmed the record
 *   - updated_at  : ISO timestamp, used for last-write-wins conflict resolution
 *
 * IMPORTANT: derived values (outstanding, cash_at_hand, total_sales, etc.)
 * are NEVER stored here. They live in domain/derivations.ts as pure
 * functions and are computed on read. This keeps the offline copy and the
 * server copy reconcilable.
 */

// ---------------------------------------------------------------------------
// Business
// ---------------------------------------------------------------------------

export interface Business {
  /** Server-assigned id; absent until first sync */
  id?: number;
  client_id: string;
  /** Business name, carried from the signup form */
  name: string;
  /** Business type / category (e.g. "provisions", "food vendor") */
  type: string;
  /** Starting cash balance, set during onboarding */
  starting_cash: number;
  /** ISO language code for future i18n ("en", "yo", "ha", "ig") */
  language: string;
  /** Whether the voice toggle is enabled (off by default) */
  voice_enabled: boolean;
  deleted_at: string | null;
  purge_at: string | null;
  synced: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// User (stored locally to drive auth state; never a source of truth)
// ---------------------------------------------------------------------------

export interface LocalUser {
  /** Server-assigned id */
  id?: number;
  client_id: string;
  name: string;
  /** Either a phone number or email — the user chooses at signup */
  phone_or_email: string;
  /** JWT access token, stored for API calls */
  access_token: string | null;
  /** JWT refresh token */
  refresh_token: string | null;
  synced: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------

export interface Customer {
  id?: number;
  client_id: string;
  /** Local FK — resolved to business.id on sync */
  business_client_id: string;
  name: string;
  phone: string;
  synced: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// DailyTally
//
// ONE row per business per calendar day.
// Captures cash sales + expenses only. Credit sales live in CreditRecord.
// ---------------------------------------------------------------------------

export interface DailyTally {
  id?: number;
  client_id: string;
  business_client_id: string;
  /** YYYY-MM-DD */
  date: string;
  /**
   * Cash received on sales today (total_sold minus credit_given).
   * The UI collects "total sold" and "total on credit" from the user,
   * and derives cash_sales = total_sold - total_credit_given before storing.
   */
  cash_sales: number;
  expenses: number;
  note: string;
  synced: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// CreditRecord
//
// One row per credit sale to a named customer on a given day.
// "Total on credit" on the home screen becomes N CreditRecord rows,
// one per debtor line the user added.
// ---------------------------------------------------------------------------

export interface CreditRecord {
  id?: number;
  client_id: string;
  customer_client_id: string;
  /**
   * Denormalized for offline queries — not sent to the API.
   * Allows querying all credit for a business without joining through customers.
   */
  business_client_id: string;
  amount: number;
  /** YYYY-MM-DD: the day credit was given */
  issued_date: string;
  /** YYYY-MM-DD: when the debtor promised to pay; null = no due date set */
  due_date: string | null;
  synced: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Repayment
//
// A partial or full payment against a CreditRecord.
// Multiple repayments may exist per CreditRecord.
// ---------------------------------------------------------------------------

export interface Repayment {
  id?: number;
  client_id: string;
  credit_record_client_id: string;
  amount: number;
  /** YYYY-MM-DD: when payment was received */
  paid_date: string;
  synced: boolean;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Outbox (sync queue — client-only, never sent to the API)
// ---------------------------------------------------------------------------

export type OutboxEntity =
  | 'business'
  | 'customer'
  | 'daily_tally'
  | 'credit_record'
  | 'repayment';

export type OutboxOperation = 'create' | 'update';

export interface OutboxEntry {
  /** Autoincrement local id */
  id?: number;
  entity: OutboxEntity;
  client_id: string;
  operation: OutboxOperation;
  attempted_at: string | null;
  attempts: number;
}

// ---------------------------------------------------------------------------
// UI helpers / composite types
// ---------------------------------------------------------------------------

/**
 * A single credit line the user enters on the home screen.
 * Translated into a Customer + CreditRecord write on save.
 */
export interface CreditLine {
  customerName: string;
  amount: number;
  dueDate?: string; // YYYY-MM-DD
}

/**
 * The raw form values from the "today's tally" entry.
 * total_sold = cash_sales + credit_given (derived before storage).
 */
export interface TallyFormInput {
  totalSold: number;
  totalCreditGiven: number;
  expenses: number;
  note?: string;
  creditLines: CreditLine[];
}

/**
 * A customer with their computed outstanding balance and overdue status,
 * used by the follow-up list.
 */
export interface DebtorSummary {
  customer: Customer;
  totalOutstanding: number;
  oldestDueDate: string | null;
  isOverdue: boolean;
  creditRecords: CreditRecord[];
}

/**
 * Dashboard numbers for a given period.
 * All fields are derived — never stored.
 */
export interface DashboardMetrics {
  revenue: number;
  expenses: number;
  businessResult: number;
  cashAtHand: number;
  outstandingDebt: number;
  revenueLastPeriod: number;
  expensesLastPeriod: number;
  businessResultLastPeriod: number;
}

/**
 * Sync status, exposed by useSyncStatus hook.
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';
