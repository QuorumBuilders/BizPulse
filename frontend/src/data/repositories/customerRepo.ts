/**
 * BizPulse — Customer Repository
 */

import { db } from '../db';
import { generateClientId, nowISO } from './utils';
import { enqueueOutbox } from '../outbox';
import type { Customer } from '../../domain/types';

/**
 * Find a customer by name (case-insensitive) within a business.
 * Used by the "find or create" logic during tally entry.
 */
export async function findCustomerByName(
  businessClientId: string,
  name: string
): Promise<Customer | undefined> {
  const all = await db.customers
    .where('business_client_id')
    .equals(businessClientId)
    .toArray();
  return all.find((c) => c.name.toLowerCase() === name.toLowerCase().trim());
}

/**
 * Find an existing customer by name, or create a new one.
 * Used during the coordinated tally+credit write.
 */
export async function findOrCreateCustomer(
  businessClientId: string,
  name: string,
  phone: string = ''
): Promise<Customer> {
  const existing = await findCustomerByName(businessClientId, name);
  if (existing) return existing;

  const customer: Customer = {
    client_id: generateClientId(),
    business_client_id: businessClientId,
    name: name.trim(),
    phone,
    synced: false,
    updated_at: nowISO(),
  };
  await db.customers.add(customer);
  await enqueueOutbox('customer', customer.client_id, 'create');
  return customer;
}

/**
 * Get all customers for a business.
 */
export async function getCustomers(businessClientId: string): Promise<Customer[]> {
  return db.customers
    .where('business_client_id')
    .equals(businessClientId)
    .toArray();
}

/**
 * Get a single customer by client_id.
 */
export async function getCustomerByClientId(clientId: string): Promise<Customer | undefined> {
  return db.customers.where('client_id').equals(clientId).first();
}

/**
 * Update a customer's details.
 */
export async function updateCustomer(
  clientId: string,
  patch: Partial<Pick<Customer, 'name' | 'phone'>>
): Promise<void> {
  await db.customers
    .where('client_id')
    .equals(clientId)
    .modify({ ...patch, updated_at: nowISO(), synced: false });
  await enqueueOutbox('customer', clientId, 'update');
}
