import { generateCSV } from './export';
import type { Business, Customer, DailyTally, CreditRecord, Repayment } from './types';

describe('generateCSV', () => {
  const mockBusiness: Business = {
    client_id: 'b_1',
    name: 'Alaba Electricals',
    type: 'Retail',
    starting_cash: 50000,
    language: 'en',
    voice_enabled: false,
    synced: false,
    updated_at: '2026-09-01T00:00:00Z',
    deleted_at: null,
    purge_at: null,
  };

  const mockCustomer: Customer = {
    client_id: 'c_1',
    business_client_id: 'b_1',
    name: 'Emeka Uche',
    phone: '08012345678',
    synced: false,
    updated_at: '2026-09-01T00:00:00Z',
  };

  const mockTally: DailyTally = {
    client_id: 't_1',
    business_client_id: 'b_1',
    date: '2026-09-20',
    cash_sales: 12000,
    expenses: 3000,
    note: '',
    synced: false,
    updated_at: '2026-09-20T18:00:00Z',
  };

  const mockCredit: CreditRecord = {
    client_id: 'cr_1',
    customer_client_id: 'c_1',
    business_client_id: 'b_1',
    amount: 5000,
    issued_date: '2026-09-20',
    due_date: '2026-09-27',
    synced: false,
    updated_at: '2026-09-20T18:00:00Z',
  };

  const mockRepayment: Repayment = {
    client_id: 'rep_1',
    credit_record_client_id: 'cr_1',
    amount: 2000,
    paid_date: '2026-09-22',
    synced: false,
    updated_at: '2026-09-22T12:00:00Z',
  };

  it('generates well-formed CSV with headers and sections', () => {
    const csv = generateCSV({
      business: mockBusiness,
      period: 'month',
      tallies: [mockTally],
      creditRecords: [mockCredit],
      repayments: [mockRepayment],
      customers: [mockCustomer],
    });

    expect(csv).toContain('BizPulse Financial Export - Alaba Electricals');
    expect(csv).toContain('"DAILY TALLIES"');
    expect(csv).toContain('date,cash_sales,credit_sales,total_sales,expenses');
    // Cash 12000, credit 5000, total 17000, expenses 3000
    expect(csv).toContain('2026-09-20,12000,5000,17000,3000');

    expect(csv).toContain('"CREDIT RECORDS & OUTSTANDING"');
    expect(csv).toContain('customer,amount,issued_date,due_date,outstanding');
    // 5000 credit minus 2000 repayment = 3000 outstanding
    expect(csv).toContain('Emeka Uche,5000,2026-09-20,2026-09-27,3000');
  });

  it('handles empty tallies and credits gracefully', () => {
    const csv = generateCSV({
      business: mockBusiness,
      period: 'year',
      tallies: [],
      creditRecords: [],
      repayments: [],
      customers: [],
    });

    expect(csv).toContain('BizPulse Financial Export - Alaba Electricals');
    expect(csv).toContain('"DAILY TALLIES"');
    expect(csv).toContain('"CREDIT RECORDS & OUTSTANDING"');
  });

  it('escapes commas and special characters in business and customer names', () => {
    const commaBusiness = { ...mockBusiness, name: 'Alaba, Boys & Co.' };
    const commaCustomer = { ...mockCustomer, name: 'Okonkwo, Jude "Junior"' };

    const csv = generateCSV({
      business: commaBusiness,
      period: 'month',
      tallies: [],
      creditRecords: [{ ...mockCredit, customer_client_id: commaCustomer.client_id }],
      repayments: [],
      customers: [commaCustomer],
    });

    expect(csv).toContain('BizPulse Financial Export - Alaba, Boys & Co.');
    expect(csv).toContain('"Okonkwo, Jude ""Junior"""');
  });
});
