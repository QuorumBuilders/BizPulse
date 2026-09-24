/**
 * BizPulse — Data Export Utilities
 *
 * Implements Section 8 of the Architecture Specification:
 * - Client-side only CSV generation (no server endpoints needed).
 * - Section 1: Daily tallies (date, cash_sales, credit_sales, total_sales, expenses).
 * - Section 2: Credit records (customer, amount, issued_date, due_date, outstanding).
 * - Download trigger via Blob and ObjectURL.
 */

import type { Business, Customer, DailyTally, CreditRecord, Repayment } from './types';
import { creditSalesForDate, totalSalesForDay, outstanding } from './derivations';

export interface ExportData {
  business: Business;
  period: 'month' | 'year' | 'all';
  tallies: DailyTally[];
  creditRecords: CreditRecord[];
  repayments: Repayment[];
  customers: Customer[];
}

/**
 * Escapes a cell value for CSV output according to RFC 4180.
 */
function escapeCSV(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a RFC 4180 compliant CSV string containing:
 * 1. Business header metadata
 * 2. Daily tallies breakdown
 * 3. Credit records breakdown
 */
export function generateCSV(data: ExportData): string {
  const { business, period, tallies, creditRecords, repayments, customers } = data;

  const customerMap = new Map<string, string>();
  for (const c of customers) {
    customerMap.set(c.client_id, c.name);
  }

  // Sort tallies by date ascending
  const sortedTallies = [...tallies].sort((a, b) => a.date.localeCompare(b.date));

  // Sort credit records by issued_date ascending
  const sortedCredits = [...creditRecords].sort((a, b) => a.issued_date.localeCompare(b.issued_date));

  const lines: string[] = [];

  // Business Header
  lines.push(`"BizPulse Financial Export - ${business.name}"`);
  lines.push(`"Period","${period.toUpperCase()}"`);
  lines.push(`"Generated","${new Date().toISOString()}"`);
  lines.push('');

  // Section 1: Daily Tallies
  lines.push('"DAILY TALLIES"');
  lines.push('date,cash_sales,credit_sales,total_sales,expenses');

  for (const t of sortedTallies) {
    const cSales = creditSalesForDate(creditRecords, t.date);
    const totSales = totalSalesForDay(t, cSales);
    lines.push([
      escapeCSV(t.date),
      escapeCSV(t.cash_sales),
      escapeCSV(cSales),
      escapeCSV(totSales),
      escapeCSV(t.expenses),
    ].join(','));
  }

  lines.push('');

  // Section 2: Credit Records
  lines.push('"CREDIT RECORDS & OUTSTANDING"');
  lines.push('customer,amount,issued_date,due_date,outstanding');

  for (const cr of sortedCredits) {
    const custName = customerMap.get(cr.customer_client_id) ?? 'Unknown Customer';
    const bal = outstanding(cr, repayments);
    lines.push([
      escapeCSV(custName),
      escapeCSV(cr.amount),
      escapeCSV(cr.issued_date),
      escapeCSV(cr.due_date ?? 'No Due Date'),
      escapeCSV(bal),
    ].join(','));
  }

  return lines.join('\r\n');
}

/**
 * Triggers a browser download of the CSV content.
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
