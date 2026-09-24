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
  users!: Table<LocalUser, number>;
  businesses!: Table<Business, number>;
  customers!: Table<Customer, number>;
  daily_tallies!: Table<DailyTally, number>;
  credit_records!: Table<CreditRecord, number>;
  repayments!: Table<Repayment, number>;
  outbox!: Table<OutboxEntry, number>;

  constructor() {
    super('BizPulseDB');

    /**
     * Schema version 1.
     * Index notation:
     *   ++id          → autoincrement primary key
     *   &client_id    → unique index (guarantees no duplicate client_ids)
     *   [a+b]         → compound index (for multi-field queries)
     *   field         → regular index
     *
     * Only indexed fields need to be listed here.
     * Dexie stores ALL object properties — only the ones you query on
     * need an explicit index.
     */
    this.version(1).stores({
      users: '++id, &client_id, phone_or_email',
      businesses: '++id, &client_id, synced',
      customers: '++id, &client_id, business_client_id, synced',
      // Compound index enforces one tally per business per day (matches backend constraint)
      daily_tallies: '++id, &client_id, [business_client_id+date], business_client_id, date, synced',
      // Credit records indexed by customer and by business+date for dashboard queries
      credit_records: '++id, &client_id, customer_client_id, [business_client_id+issued_date], business_client_id, synced',
      // Repayments indexed by parent credit record
      repayments: '++id, &client_id, credit_record_client_id, synced',
      // Outbox indexed by entity + client_id for deduplication checks
      outbox: '++id, entity, client_id, [entity+client_id]',
    });
  }
}

// Singleton — one db instance per tab / service worker context
export const db = new BizPulseDB();
