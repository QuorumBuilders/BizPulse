/**
 * BizPulse — Domain Derivations
 *
 * Pure functions, zero I/O, fully unit-testable.
 * These formulas are the authoritative definitions for ALL computed
 * financial values in BizPulse. They are intentionally duplicated
 * between the frontend (for instant offline display) and the Django
 * backend (as the source of truth after sync). Two implementations of
 * the same formula is deliberate — what matters is that the formula
 * never drifts between them.
 *
 * KEY FORMULAS (from the project brief / backend spec, verbatim):
 *   Revenue         = sum of total_sold across entries in the period
 *   total_sold      = cash_sales + creditSalesForDate (derived per day)
 *   Business Result = Revenue − total expenses
 *   Cash Position   = starting_cash + cash_sales_total + repayments_total − expenses_total
 *   Outstanding     = credit_given − payments_received (per credit record)
 *   Overdue         = outstanding credit past its due_date
 */

import type {
  Business,
  CreditRecord,
  DailyTally,
  DebtorSummary,
  Customer,
  Repayment,
  DashboardMetrics,
} from './types';

export type { DashboardMetrics };

// ---------------------------------------------------------------------------
// Credit sales helpers
// ---------------------------------------------------------------------------

/**
 * Sum of all credit given on a specific date.
 * Used to derive total_sold for a day.
 */
export function creditSalesForDate(
  creditRecords: CreditRecord[],
  date: string
): number {
  return creditRecords
    .filter((c) => c.issued_date === date)
    .reduce((sum, c) => sum + c.amount, 0);
}

/**
 * Total sales for a day = cash received + credit given.
 * This reconstructs the "total sold" figure the trader thinks in.
 */
export function totalSalesForDay(
  tally: DailyTally | undefined,
  creditSales: number
): number {
  return (tally?.cash_sales ?? 0) + creditSales;
}

// ---------------------------------------------------------------------------
// Outstanding / repayment helpers
// ---------------------------------------------------------------------------

/**
 * How much of a single CreditRecord is still owed.
 * Returns 0 if fully repaid; never negative.
 */
export function outstanding(
  credit: CreditRecord,
  repayments: Repayment[]
): number {
  const repaid = repayments
    .filter((r) => r.credit_record_client_id === credit.client_id)
    .reduce((sum, r) => sum + r.amount, 0);
  return Math.max(0, credit.amount - repaid);
}

/**
 * Total outstanding balance for a single customer across all their credit records.
 */
export function customerOutstanding(
  customerClientId: string,
  creditRecords: CreditRecord[],
  repayments: Repayment[]
): number {
  return creditRecords
    .filter((c) => c.customer_client_id === customerClientId)
    .reduce((sum, c) => sum + outstanding(c, repayments), 0);
}

/**
 * Whether a credit record is currently overdue:
 * has a due date that has passed and still has an outstanding balance.
 */
export function isOverdue(
  credit: CreditRecord,
  repayments: Repayment[],
  today: string
): boolean {
  return (
    credit.due_date !== null &&
    credit.due_date < today &&
    outstanding(credit, repayments) > 0
  );
}

/**
 * How many days overdue a credit record is.
 * Returns 0 if not overdue.
 */
export function daysOverdue(credit: CreditRecord, today: string): number {
  if (credit.due_date === null) return 0;
  const due = new Date(credit.due_date);
  const now = new Date(today);
  const diff = now.getTime() - due.getTime();
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
}

// ---------------------------------------------------------------------------
// Period-level aggregates
// ---------------------------------------------------------------------------

/**
 * Revenue for a set of tallies and their matching credit records.
 * Revenue = sum of (cash_sales + credit_sales) for each day in period.
 */
export function revenueForPeriod(
  tallies: DailyTally[],
  creditRecords: CreditRecord[]
): number {
  return tallies.reduce((sum, tally) => {
    const credits = creditSalesForDate(creditRecords, tally.date);
    return sum + totalSalesForDay(tally, credits);
  }, 0);
}

/**
 * Total expenses for a set of tallies.
 */
export function expensesForPeriod(tallies: DailyTally[]): number {
  return tallies.reduce((sum, t) => sum + t.expenses, 0);
}

/**
 * Business result (profit/loss) for a period.
 * Business Result = Revenue − Expenses
 */
export function businessResultForPeriod(
  tallies: DailyTally[],
  creditRecords: CreditRecord[]
): number {
  return (
    revenueForPeriod(tallies, creditRecords) - expensesForPeriod(tallies)
  );
}

/**
 * Cash at hand — the actual physical/digital cash the business has.
 *
 * Cash Position = starting_cash
 *               + sum of cash_sales (cash received from sales)
 *               + sum of repayments received
 *               − sum of expenses paid
 *
 * Note: credit sales are NOT included because that money hasn't been
 * received yet. Repayments are included when customers pay back debt.
 */
export function cashAtHand(
  business: Business,
  tallies: DailyTally[],
  repayments: Repayment[]
): number {
  const cashSalesTotal = tallies.reduce((sum, t) => sum + t.cash_sales, 0);
  const repaymentsTotal = repayments.reduce((sum, r) => sum + r.amount, 0);
  const expensesTotal = tallies.reduce((sum, t) => sum + t.expenses, 0);
  return business.starting_cash + cashSalesTotal + repaymentsTotal - expensesTotal;
}

/**
 * Total outstanding debt across all credit records for a business.
 * Outstanding Debt = credit_given − payments_received
 */
export function totalOutstandingDebt(
  creditRecords: CreditRecord[],
  repayments: Repayment[]
): number {
  return creditRecords.reduce((sum, c) => sum + outstanding(c, repayments), 0);
}

// ---------------------------------------------------------------------------
// Follow-up list
// ---------------------------------------------------------------------------

/**
 * Build the ranked follow-up list: customers ordered by how overdue they are,
 * then by total outstanding balance (highest first) for tied overdue status.
 */
export function buildDebtorSummaries(
  customers: Customer[],
  creditRecords: CreditRecord[],
  repayments: Repayment[],
  today: string
): DebtorSummary[] {
  const summaries: DebtorSummary[] = customers
    .map((customer) => {
      const customerCredits = creditRecords.filter(
        (c) => c.customer_client_id === customer.client_id
      );
      const totalOutstanding = customerOutstanding(
        customer.client_id,
        creditRecords,
        repayments
      );

      // Only include customers who actually owe something
      if (totalOutstanding <= 0) return null;

      const overdueCredits = customerCredits.filter((c) =>
        isOverdue(c, repayments, today)
      );
      const isAnyOverdue = overdueCredits.length > 0;

      // Find the oldest due date for sorting
      const dueDates = customerCredits
        .map((c) => c.due_date)
        .filter((d): d is string => d !== null);
      const oldestDueDate = dueDates.length > 0 ? dueDates.sort()[0] : null;

      return {
        customer,
        totalOutstanding,
        oldestDueDate,
        isOverdue: isAnyOverdue,
        creditRecords: customerCredits,
      } satisfies DebtorSummary;
    })
    .filter((s): s is DebtorSummary => s !== null);

  // Sort: overdue first, then by oldest due date ascending, then by balance descending
  return summaries.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    if (a.oldestDueDate && b.oldestDueDate) {
      return a.oldestDueDate.localeCompare(b.oldestDueDate);
    }
    if (a.oldestDueDate) return -1;
    if (b.oldestDueDate) return 1;
    return b.totalOutstanding - a.totalOutstanding;
  });
}

// ---------------------------------------------------------------------------
// Dashboard metrics builder
// ---------------------------------------------------------------------------

/**
 * Computes all dashboard numbers for a current period and a comparison period.
 * The "comparison period" is the equivalent previous period
 * (e.g., last month if showing This Month, or last year if showing This Year).
 */
export function buildDashboardMetrics(params: {
  business: Business;
  currentTallies: DailyTally[];
  currentCreditRecords: CreditRecord[];
  previousTallies: DailyTally[];
  previousCreditRecords: CreditRecord[];
  allTallies: DailyTally[];
  allRepayments: Repayment[];
  allCreditRecords: CreditRecord[];
}): DashboardMetrics {
  const {
    business,
    currentTallies,
    currentCreditRecords,
    previousTallies,
    previousCreditRecords,
    allTallies,
    allRepayments,
    allCreditRecords,
  } = params;

  return {
    revenue: revenueForPeriod(currentTallies, currentCreditRecords),
    expenses: expensesForPeriod(currentTallies),
    businessResult: businessResultForPeriod(currentTallies, currentCreditRecords),
    cashAtHand: cashAtHand(business, allTallies, allRepayments),
    outstandingDebt: totalOutstandingDebt(allCreditRecords, allRepayments),
    revenueLastPeriod: revenueForPeriod(previousTallies, previousCreditRecords),
    expensesLastPeriod: expensesForPeriod(previousTallies),
    businessResultLastPeriod: businessResultForPeriod(
      previousTallies,
      previousCreditRecords
    ),
  };
}

// ---------------------------------------------------------------------------
// Auto-insight generation
// ---------------------------------------------------------------------------

export interface Insight {
  type: 'positive' | 'warning' | 'neutral';
  message: string;
}

/**
 * Generate plain-language insights from dashboard metrics.
 * Rules are deterministic and run offline — no AI needed.
 */
export function generateInsights(metrics: DashboardMetrics): Insight[] {
  const insights: Insight[] = [];

  const revenueChange = metrics.revenueLastPeriod > 0
    ? ((metrics.revenue - metrics.revenueLastPeriod) / metrics.revenueLastPeriod) * 100
    : null;
  const expenseChange = metrics.expensesLastPeriod > 0
    ? ((metrics.expenses - metrics.expensesLastPeriod) / metrics.expensesLastPeriod) * 100
    : null;

  // Revenue vs expenses growth comparison
  if (revenueChange !== null && expenseChange !== null) {
    if (revenueChange > 0 && expenseChange > revenueChange) {
      insights.push({
        type: 'warning',
        message: `Revenue went up ${Math.round(revenueChange)}%, but expenses went up faster at ${Math.round(expenseChange)}%.`,
      });
    } else if (revenueChange > 0 && expenseChange <= revenueChange) {
      insights.push({
        type: 'positive',
        message: `Revenue is up ${Math.round(revenueChange)}% and you're keeping expenses in check. Good trend.`,
      });
    } else if (revenueChange < 0) {
      insights.push({
        type: 'warning',
        message: `Revenue is down ${Math.abs(Math.round(revenueChange))}% compared to last period.`,
      });
    }
  } else if (revenueChange !== null && revenueChange > 0) {
    insights.push({
      type: 'positive',
      message: `Revenue is up ${Math.round(revenueChange)}% this period.`,
    });
  }

  // Cash vs outstanding debt
  if (metrics.outstandingDebt > metrics.cashAtHand * 0.5) {
    insights.push({
      type: 'warning',
      message: `Outstanding debt (₦${formatAmount(metrics.outstandingDebt)}) is high relative to your cash position. Consider following up with debtors.`,
    });
  }

  // Profitable business result
  if (metrics.businessResult > 0) {
    insights.push({
      type: 'positive',
      message: `Business is profitable this period — ₦${formatAmount(metrics.businessResult)} above expenses.`,
    });
  } else if (metrics.businessResult < 0) {
    insights.push({
      type: 'warning',
      message: `Expenses exceeded revenue by ₦${formatAmount(Math.abs(metrics.businessResult))} this period.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      type: 'neutral',
      message: 'Keep logging your daily tallies to start seeing trends here.',
    });
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Formatting helpers (UI-facing, but pure — no I/O)
// ---------------------------------------------------------------------------

/**
 * Format a naira amount for display, e.g. 1500000 → "1,500,000"
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-NG').format(Math.round(amount));
}

/**
 * Format a naira amount with the ₦ symbol, e.g. "₦1,500,000"
 */
export function formatNaira(amount: number): string {
  return `₦${formatAmount(amount)}`;
}

/**
 * Format a YYYY-MM-DD date string for display, e.g. "24 Sep 2026"
 */
export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Return today's date as YYYY-MM-DD in local time.
 * Used everywhere a "today" string is needed.
 */
export function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Given a YYYY-MM-DD date, return the YYYY-MM range it belongs to.
 */
export function yearMonthOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Return the YYYY range for a date.
 */
export function yearOf(dateStr: string): string {
  return dateStr.slice(0, 4);
}

/**
 * Return "YYYY-MM" string for the previous month relative to a given month.
 */
export function previousMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

/**
 * Return the previous year as a string.
 */
export function previousYear(year: string): string {
  return String(Number(year) - 1);
}
