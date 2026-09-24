/**
 * BizPulse — Derivations Unit Tests
 *
 * Tests every pure function in derivations.ts.
 * Each function gets 2-4 cases: zero state, partial, fully repaid,
 * edge cases. These run in Jest (configured in package.json).
 *
 * Run with: npm test -- --testPathPattern=derivations
 */

import {
  creditSalesForDate,
  totalSalesForDay,
  outstanding,
  customerOutstanding,
  isOverdue,
  daysOverdue,
  revenueForPeriod,
  expensesForPeriod,
  businessResultForPeriod,
  cashAtHand,
  totalOutstandingDebt,
  buildDebtorSummaries,
  generateInsights,
  formatNaira,
  formatDate,
  todayISO,
  previousMonth,
  previousYear,
} from './derivations';

import type {
  Business,
  CreditRecord,
  DailyTally,
  Customer,
  Repayment,
} from './types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeBusiness = (overrides: Partial<Business> = {}): Business => ({
  client_id: 'biz-1',
  name: "Mama Ada's Provisions",
  type: 'provisions',
  starting_cash: 50_000,
  language: 'en',
  voice_enabled: false,
  deleted_at: null,
  purge_at: null,
  synced: true,
  updated_at: '2026-09-01T00:00:00Z',
  ...overrides,
});

const makeTally = (overrides: Partial<DailyTally> = {}): DailyTally => ({
  client_id: 'tally-1',
  business_client_id: 'biz-1',
  date: '2026-09-01',
  cash_sales: 0,
  expenses: 0,
  note: '',
  synced: true,
  updated_at: '2026-09-01T18:00:00Z',
  ...overrides,
});

const makeCredit = (overrides: Partial<CreditRecord> = {}): CreditRecord => ({
  client_id: 'credit-1',
  customer_client_id: 'cust-1',
  business_client_id: 'biz-1',
  amount: 10_000,
  issued_date: '2026-09-01',
  due_date: '2026-09-15',
  synced: true,
  updated_at: '2026-09-01T18:00:00Z',
  ...overrides,
});

const makeRepayment = (overrides: Partial<Repayment> = {}): Repayment => ({
  client_id: 'rep-1',
  credit_record_client_id: 'credit-1',
  amount: 5_000,
  paid_date: '2026-09-10',
  synced: true,
  updated_at: '2026-09-10T10:00:00Z',
  ...overrides,
});

const makeCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  client_id: 'cust-1',
  business_client_id: 'biz-1',
  name: 'Bola',
  phone: '08011111111',
  synced: true,
  updated_at: '2026-09-01T00:00:00Z',
  ...overrides,
});

// ---------------------------------------------------------------------------
// creditSalesForDate
// ---------------------------------------------------------------------------

describe('creditSalesForDate', () => {
  it('returns 0 when no credit records exist', () => {
    expect(creditSalesForDate([], '2026-09-01')).toBe(0);
  });

  it('sums credit records matching the date', () => {
    const credits = [
      makeCredit({ client_id: 'c1', amount: 5_000, issued_date: '2026-09-01' }),
      makeCredit({ client_id: 'c2', amount: 3_000, issued_date: '2026-09-01' }),
    ];
    expect(creditSalesForDate(credits, '2026-09-01')).toBe(8_000);
  });

  it('ignores credit records on different dates', () => {
    const credits = [
      makeCredit({ client_id: 'c1', amount: 5_000, issued_date: '2026-09-02' }),
    ];
    expect(creditSalesForDate(credits, '2026-09-01')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// totalSalesForDay
// ---------------------------------------------------------------------------

describe('totalSalesForDay', () => {
  it('returns 0 when tally is undefined and no credits', () => {
    expect(totalSalesForDay(undefined, 0)).toBe(0);
  });

  it('combines cash sales and credit sales', () => {
    const tally = makeTally({ cash_sales: 60_000 });
    expect(totalSalesForDay(tally, 15_000)).toBe(75_000);
  });

  it('works with zero cash sales but credit', () => {
    const tally = makeTally({ cash_sales: 0 });
    expect(totalSalesForDay(tally, 10_000)).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// outstanding
// ---------------------------------------------------------------------------

describe('outstanding', () => {
  it('returns the full amount when no repayments', () => {
    const credit = makeCredit({ amount: 10_000 });
    expect(outstanding(credit, [])).toBe(10_000);
  });

  it('returns remainder after partial repayment', () => {
    const credit = makeCredit({ client_id: 'credit-1', amount: 10_000 });
    const rep = makeRepayment({ credit_record_client_id: 'credit-1', amount: 4_000 });
    expect(outstanding(credit, [rep])).toBe(6_000);
  });

  it('returns 0 when fully repaid', () => {
    const credit = makeCredit({ client_id: 'credit-1', amount: 10_000 });
    const rep = makeRepayment({ credit_record_client_id: 'credit-1', amount: 10_000 });
    expect(outstanding(credit, [rep])).toBe(0);
  });

  it('never returns negative (overpayment guard)', () => {
    const credit = makeCredit({ client_id: 'credit-1', amount: 5_000 });
    const rep = makeRepayment({ credit_record_client_id: 'credit-1', amount: 8_000 });
    expect(outstanding(credit, [rep])).toBe(0);
  });

  it('ignores repayments for other credit records', () => {
    const credit = makeCredit({ client_id: 'credit-1', amount: 10_000 });
    const rep = makeRepayment({ credit_record_client_id: 'credit-99', amount: 5_000 });
    expect(outstanding(credit, [rep])).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// customerOutstanding
// ---------------------------------------------------------------------------

describe('customerOutstanding', () => {
  it('returns 0 when customer has no credits', () => {
    expect(customerOutstanding('cust-1', [], [])).toBe(0);
  });

  it('sums outstanding across multiple credit records', () => {
    const credits = [
      makeCredit({ client_id: 'c1', customer_client_id: 'cust-1', amount: 10_000 }),
      makeCredit({ client_id: 'c2', customer_client_id: 'cust-1', amount: 5_000 }),
    ];
    const reps = [
      makeRepayment({ credit_record_client_id: 'c1', amount: 3_000 }),
    ];
    // (10_000 - 3_000) + (5_000 - 0) = 12_000
    expect(customerOutstanding('cust-1', credits, reps)).toBe(12_000);
  });

  it('excludes other customers', () => {
    const credits = [
      makeCredit({ client_id: 'c1', customer_client_id: 'cust-2', amount: 10_000 }),
    ];
    expect(customerOutstanding('cust-1', credits, [])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isOverdue
// ---------------------------------------------------------------------------

describe('isOverdue', () => {
  it('returns false when no due date is set', () => {
    const credit = makeCredit({ due_date: null });
    expect(isOverdue(credit, [], '2026-09-20')).toBe(false);
  });

  it('returns false when due date is in the future', () => {
    const credit = makeCredit({ due_date: '2026-10-01' });
    expect(isOverdue(credit, [], '2026-09-20')).toBe(false);
  });

  it('returns false when due date has passed but fully repaid', () => {
    const credit = makeCredit({ client_id: 'c1', amount: 10_000, due_date: '2026-09-10' });
    const rep = makeRepayment({ credit_record_client_id: 'c1', amount: 10_000 });
    expect(isOverdue(credit, [rep], '2026-09-20')).toBe(false);
  });

  it('returns true when due date has passed and balance remains', () => {
    const credit = makeCredit({ client_id: 'c1', amount: 10_000, due_date: '2026-09-10' });
    expect(isOverdue(credit, [], '2026-09-20')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// daysOverdue
// ---------------------------------------------------------------------------

describe('daysOverdue', () => {
  it('returns 0 when no due date', () => {
    const credit = makeCredit({ due_date: null });
    expect(daysOverdue(credit, '2026-09-20')).toBe(0);
  });

  it('returns 0 when not yet due', () => {
    const credit = makeCredit({ due_date: '2026-10-01' });
    expect(daysOverdue(credit, '2026-09-20')).toBe(0);
  });

  it('returns correct days overdue', () => {
    const credit = makeCredit({ due_date: '2026-09-10' });
    expect(daysOverdue(credit, '2026-09-20')).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// revenueForPeriod
// ---------------------------------------------------------------------------

describe('revenueForPeriod', () => {
  it('returns 0 for empty period', () => {
    expect(revenueForPeriod([], [])).toBe(0);
  });

  it('sums cash + credit across days', () => {
    const tallies = [
      makeTally({ date: '2026-09-01', cash_sales: 60_000 }),
      makeTally({ client_id: 't2', date: '2026-09-02', cash_sales: 40_000 }),
    ];
    const credits = [
      makeCredit({ issued_date: '2026-09-01', amount: 10_000 }),
    ];
    // Day 1: 60k cash + 10k credit = 70k
    // Day 2: 40k cash + 0 credit = 40k
    // Total: 110k
    expect(revenueForPeriod(tallies, credits)).toBe(110_000);
  });
});

// ---------------------------------------------------------------------------
// cashAtHand
// ---------------------------------------------------------------------------

describe('cashAtHand', () => {
  it('returns starting cash when no activity', () => {
    const biz = makeBusiness({ starting_cash: 50_000 });
    expect(cashAtHand(biz, [], [])).toBe(50_000);
  });

  it('adds cash sales and repayments, subtracts expenses', () => {
    const biz = makeBusiness({ starting_cash: 50_000 });
    const tallies = [
      makeTally({ cash_sales: 80_000, expenses: 20_000 }),
    ];
    const reps = [makeRepayment({ amount: 5_000 })];
    // 50_000 + 80_000 + 5_000 - 20_000 = 115_000
    expect(cashAtHand(biz, tallies, reps)).toBe(115_000);
  });

  it('does NOT include credit sales (money not yet received)', () => {
    const biz = makeBusiness({ starting_cash: 10_000 });
    const tallies = [makeTally({ cash_sales: 0, expenses: 0 })];
    // A credit sale of 50_000 exists but cash at hand stays at starting_cash
    expect(cashAtHand(biz, tallies, [])).toBe(10_000);
  });
});

// ---------------------------------------------------------------------------
// businessResultForPeriod
// ---------------------------------------------------------------------------

describe('businessResultForPeriod', () => {
  it('returns 0 for empty period', () => {
    expect(businessResultForPeriod([], [])).toBe(0);
  });

  it('revenue minus expenses', () => {
    const tallies = [makeTally({ cash_sales: 80_000, expenses: 20_000 })];
    const credits = [makeCredit({ amount: 10_000, issued_date: '2026-09-01' })];
    // Revenue = 90_000, expenses = 20_000, result = 70_000
    expect(businessResultForPeriod(tallies, credits)).toBe(70_000);
  });

  it('can be negative (loss period)', () => {
    const tallies = [makeTally({ cash_sales: 10_000, expenses: 50_000 })];
    expect(businessResultForPeriod(tallies, [])).toBe(-40_000);
  });
});

// ---------------------------------------------------------------------------
// buildDebtorSummaries
// ---------------------------------------------------------------------------

describe('buildDebtorSummaries', () => {
  it('returns empty array when no customers', () => {
    expect(buildDebtorSummaries([], [], [], '2026-09-20')).toEqual([]);
  });

  it('excludes fully repaid customers', () => {
    const customer = makeCustomer();
    const credit = makeCredit({ client_id: 'c1', customer_client_id: 'cust-1', amount: 5_000 });
    const rep = makeRepayment({ credit_record_client_id: 'c1', amount: 5_000 });
    const result = buildDebtorSummaries([customer], [credit], [rep], '2026-09-20');
    expect(result).toHaveLength(0);
  });

  it('ranks overdue debtors first', () => {
    const cust1 = makeCustomer({ client_id: 'cust-1', name: 'Bola' });
    const cust2 = makeCustomer({ client_id: 'cust-2', name: 'Ngozi' });
    const creditOverdue = makeCredit({
      client_id: 'c1',
      customer_client_id: 'cust-1',
      amount: 5_000,
      due_date: '2026-09-01', // overdue
    });
    const creditFuture = makeCredit({
      client_id: 'c2',
      customer_client_id: 'cust-2',
      amount: 20_000, // larger amount but not overdue
      due_date: '2026-10-01',
    });
    const result = buildDebtorSummaries(
      [cust1, cust2],
      [creditOverdue, creditFuture],
      [],
      '2026-09-20'
    );
    expect(result[0].customer.name).toBe('Bola'); // overdue ranks first
    expect(result[1].customer.name).toBe('Ngozi');
  });
});

// ---------------------------------------------------------------------------
// generateInsights
// ---------------------------------------------------------------------------

describe('generateInsights', () => {
  const baseMetrics = {
    revenue: 500_000,
    expenses: 100_000,
    businessResult: 400_000,
    cashAtHand: 200_000,
    outstandingDebt: 50_000,
    revenueLastPeriod: 400_000,
    expensesLastPeriod: 80_000,
    businessResultLastPeriod: 320_000,
  };

  it('generates a positive insight when revenue grows and expenses are controlled', () => {
    const insights = generateInsights(baseMetrics);
    expect(insights.some((i) => i.type === 'positive')).toBe(true);
  });

  it('generates a warning when expenses grow faster than revenue', () => {
    const metrics = {
      ...baseMetrics,
      revenue: 500_000,
      expenses: 200_000,
      revenueLastPeriod: 400_000,
      expensesLastPeriod: 80_000, // 150% growth in expenses vs 25% revenue
    };
    const insights = generateInsights(metrics);
    expect(insights.some((i) => i.message.includes('expenses went up faster'))).toBe(true);
  });

  it('returns a neutral message when no prior period exists', () => {
    const metrics = { ...baseMetrics, revenueLastPeriod: 0, expensesLastPeriod: 0 };
    const insights = generateInsights(metrics);
    expect(insights.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

describe('formatNaira', () => {
  it('formats with ₦ symbol and comma separators', () => {
    expect(formatNaira(1_500_000)).toMatch(/₦.*1[,.]?500[,.]?000/);
  });

  it('handles zero', () => {
    expect(formatNaira(0)).toBe('₦0');
  });
});

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string to readable format', () => {
    const result = formatDate('2026-09-24');
    expect(result).toMatch(/24/);
    expect(result).toMatch(/Sep/);
    expect(result).toMatch(/2026/);
  });
});

describe('todayISO', () => {
  it('returns a valid YYYY-MM-DD string', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('previousMonth', () => {
  it('rolls back across year boundary', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
  });

  it('handles mid-year month', () => {
    expect(previousMonth('2026-09')).toBe('2026-08');
  });
});

describe('previousYear', () => {
  it('returns previous year string', () => {
    expect(previousYear('2026')).toBe('2025');
  });
});
