/**
 * BizPulse — Demo Data Seeder
 *
 * Populates IndexedDB with realistic Nigerian trading data:
 * - 60+ days of daily tallies with realistic cash sales and expense patterns
 * - 6 authentic market customers (retailers, provisions, fashion, artisans)
 * - Credit records (overdue, partially repaid, fully repaid, due soon)
 * - Repayments
 *
 * Designed for offline hackathon demos and judge evaluations.
 */

import { db } from './db';
import { generateClientId, nowISO } from './repositories/utils';
import type { Customer, DailyTally, CreditRecord, Repayment } from '../domain/types';

export async function seedDemoData(businessClientId: string): Promise<{
  talliesCount: number;
  customersCount: number;
  creditsCount: number;
}> {
  const now = nowISO();

  // 1. Create sample customers
  const sampleCustomers: Omit<Customer, 'client_id' | 'synced' | 'updated_at'>[] = [
    {
      business_client_id: businessClientId,
      name: 'Mama Chidi Provisions',
      phone: '08023456789',
    },
    {
      business_client_id: businessClientId,
      name: 'Alhaji Ibrahim Textiles',
      phone: '08034567890',
    },
    {
      business_client_id: businessClientId,
      name: 'Blessing Fashion & Tailoring',
      phone: '08123456781',
    },
    {
      business_client_id: businessClientId,
      name: 'Brother Emeka Electronics',
      phone: '07034567892',
    },
    {
      business_client_id: businessClientId,
      name: 'Iya Basira Eatery',
      phone: '08098765432',
    },
    {
      business_client_id: businessClientId,
      name: 'Sunday Auto Spares',
      phone: '08187654321',
    },
  ];

  const createdCustomers: Customer[] = [];
  for (const c of sampleCustomers) {
    const cust: Customer = {
      ...c,
      client_id: generateClientId(),
      synced: true,
      updated_at: now,
    };
    await db.customers.put(cust);
    createdCustomers.push(cust);
  }

  // Helper date generators
  const today = new Date();
  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

  // 2. Generate 60 days of daily tallies
  const createdTallies: DailyTally[] = [];
  for (let i = 60; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateStr(d);

    // Skip some Sundays (rest days)
    if (d.getDay() === 0 && i % 2 === 0) continue;

    // Realistic Nigerian naira amounts:
    // Sales: ₦25,000 - ₦95,000
    // Expenses: ₦3,500 - ₦22,000 (fuel/generator, transport, feeding, stock)
    const baseSales = 28000 + ((i * 137) % 65000);
    const expenses = 4000 + ((i * 73) % 18000);

    const tally: DailyTally = {
      client_id: generateClientId(),
      business_client_id: businessClientId,
      date: dateStr,
      cash_sales: baseSales,
      expenses: expenses,
      note: i === 0 ? 'Today market sales' : '',
      synced: true,
      updated_at: now,
    };

    await db.daily_tallies.put(tally);
    createdTallies.push(tally);
  }

  // 3. Generate Credit Records and Repayments
  const creditDefs = [
    // Mama Chidi: ₦30,000 credit issued 15 days ago, due 5 days ago (OVERDUE), ₦10,000 repaid
    {
      custIdx: 0,
      amount: 30000,
      daysAgoIssued: 15,
      daysAgoDue: 5,
      repaid: 10000,
    },
    // Alhaji Ibrahim: ₦55,000 credit issued 6 days ago, due in 2 days (DUE SOON), ₦0 repaid
    {
      custIdx: 1,
      amount: 55000,
      daysAgoIssued: 6,
      daysAgoDue: -2,
      repaid: 0,
    },
    // Blessing Fashion: ₦22,000 issued 20 days ago, due 10 days ago, FULLY REPAID
    {
      custIdx: 2,
      amount: 22000,
      daysAgoIssued: 20,
      daysAgoDue: 10,
      repaid: 22000,
    },
    // Brother Emeka: ₦40,000 issued 25 days ago, due 12 days ago (OVERDUE), ₦0 repaid
    {
      custIdx: 3,
      amount: 40000,
      daysAgoIssued: 25,
      daysAgoDue: 12,
      repaid: 0,
    },
    // Iya Basira: ₦15,000 issued 3 days ago, due in 4 days, ₦5,000 partial payment
    {
      custIdx: 4,
      amount: 15000,
      daysAgoIssued: 3,
      daysAgoDue: -4,
      repaid: 5000,
    },
    // Sunday Auto: ₦18,500 issued 8 days ago, no due date, ₦0 repaid
    {
      custIdx: 5,
      amount: 18500,
      daysAgoIssued: 8,
      daysAgoDue: null,
      repaid: 0,
    },
  ];

  let creditsCount = 0;
  for (const def of creditDefs) {
    const cust = createdCustomers[def.custIdx];
    const issuedDate = new Date(today);
    issuedDate.setDate(today.getDate() - def.daysAgoIssued);

    let dueDateStr: string | null = null;
    if (def.daysAgoDue !== null) {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() - def.daysAgoDue);
      dueDateStr = formatDateStr(dueDate);
    }

    const creditId = generateClientId();
    const credit: CreditRecord = {
      client_id: creditId,
      customer_client_id: cust.client_id,
      business_client_id: businessClientId,
      amount: def.amount,
      issued_date: formatDateStr(issuedDate),
      due_date: dueDateStr,
      synced: true,
      updated_at: now,
    };
    await db.credit_records.put(credit);
    creditsCount++;

    if (def.repaid > 0) {
      const repDate = new Date(issuedDate);
      repDate.setDate(issuedDate.getDate() + 3);
      const repayment: Repayment = {
        client_id: generateClientId(),
        credit_record_client_id: creditId,
        amount: def.repaid,
        paid_date: formatDateStr(repDate),
        synced: true,
        updated_at: now,
      };
      await db.repayments.put(repayment);
    }
  }

  return {
    talliesCount: createdTallies.length,
    customersCount: createdCustomers.length,
    creditsCount,
  };
}
