/**
 * BizPulse — IndexedDB Schema (Dexie.js)
 *
 * Dexie is a thin, well-typed wrapper over raw IndexedDB.
 * This file opens (and migrates) the database.
 *
 * Table → Entity mapping:
 *   users          ← LocalUser
 *   businesses     ← Business
 *   customers      ← Customer
 *   daily_tallies  ← DailyTally
 *   credit_records ← CreditRecord
 *   repayments     ← Repayment
 *   outbox         ← OutboxEntry (client-only, never sent to API)
 */

import Dexie, { type Table } from 'dexie';
import type {
  LocalUser,
  Business,
  Customer,
  DailyTally,
  CreditRecord,
  Repayment,
  OutboxEntry,
} from '../domain/types';

export class BizPulseDB extends Dexie {
  users!: Table<LocalUser, string>;
  businesses!: Table<Business, string>;
  customers!: Table<Customer, string>;
  daily_tallies!: Table<DailyTally, string>;
  credit_records!: Table<CreditRecord, string>;
  repayments!: Table<Repayment, string>;
  outbox!: Table<OutboxEntry, number>;

  constructor() {
    super('BizPulseDB_v2');

    /**
     * Schema version 1 (BizPulseDB_v2).
     * Index notation:
     *   client_id     → primary key (UUID guaranteed unique per entity)
     *   id            → server ID index (non-unique, nullable before sync)
     *   [a+b]         → compound index (for multi-field queries)
     *   field         → regular index
     */
    this.version(1).stores({
      users: 'client_id, id, phone_or_email',
      businesses: 'client_id, id, user_id, synced',
      customers: 'client_id, id, business_client_id, synced',
      // Compound index enforces one tally per business per day
      daily_tallies: 'client_id, id, [business_client_id+date], business_client_id, date, synced',
      // Credit records indexed by customer and by business+date for dashboard queries
      credit_records: 'client_id, id, customer_client_id, [business_client_id+issued_date], business_client_id, synced',
      // Repayments indexed by parent credit record
      repayments: 'client_id, id, credit_record_client_id, synced',
      // Outbox indexed by entity + client_id for deduplication checks
      outbox: '++id, entity, client_id, user_id, business_client_id, [entity+client_id]',
    });
  }
}

// Clean up legacy database if present
if (typeof window !== 'undefined' && window.indexedDB) {
  try {
    window.indexedDB.deleteDatabase('BizPulseDB');
  } catch {
    // Ignore legacy cleanup error
  }
}

// Singleton — one db instance per tab / service worker context
export const db = new BizPulseDB();
