/**
 * BizPulse — Business Repository
 *
 * Reads and writes Business records in IndexedDB.
 * All writes go through here so we can consistently manage
 * client_id, updated_at, and outbox enqueuing.
 */

import { db } from '../db';
import { generateClientId, nowISO } from './utils';
import { enqueueOutbox } from '../outbox';
import type { Business, UserProfile } from '../../domain/types';
import { apiListBusinesses } from '../../api/client';

let _cachedBusiness: Business | null = null;
let _businessLoaded = false;

export function getCachedBusiness(): Business | null {
  return _cachedBusiness;
}

export function isBusinessLoaded(): boolean {
  return _businessLoaded;
}

export function setCachedBusiness(biz: Business | null): void {
  _cachedBusiness = biz;
  _businessLoaded = true;
}

/**
 * Derives a stable identity key for local caching purposes.
 * Prefers stable user ID from auth claims, falling back to normalized email.
 */
export function getUserKey(user?: UserProfile | null): string {
  if (!user) return 'anonymous';
  if (user.id !== undefined && user.id !== null) return String(user.id);
  if (user.email) return user.email.toLowerCase().trim();
  return 'anonymous';
}

const ACTIVE_BIZ_KEY_PREFIX = 'bp_active_biz_';
const BIZ_CLIENT_ID_KEY_PREFIX = 'bp_biz_cid_';

export function getStoredActiveBusinessId(userKey: string): number | null {
  try {
    if (typeof window === 'undefined') return null;
    const val = localStorage.getItem(`${ACTIVE_BIZ_KEY_PREFIX}${userKey}`);
    return val ? Number(val) : null;
  } catch {
    return null;
  }
}

export function storeActiveBusinessId(userKey: string, serverId: number): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${ACTIVE_BIZ_KEY_PREFIX}${userKey}`, String(serverId));
  } catch {
    // silent storage fail
  }
}

export function getStoredClientId(userKey: string, serverId: number): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`${BIZ_CLIENT_ID_KEY_PREFIX}${userKey}_${serverId}`);
  } catch {
    return null;
  }
}

export function storeClientId(userKey: string, serverId: number, clientId: string): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`${BIZ_CLIENT_ID_KEY_PREFIX}${userKey}_${serverId}`, clientId);
  } catch {
    // silent storage fail
  }
}

/**
 * Get the current business for the authenticated user.
 * Scoped by both user identity and server business ID (conceptually user_id + server_id)
 * to prevent stale local businesses from becoming active.
 */
export async function getBusiness(
  user?: UserProfile | null,
  serverId?: number
): Promise<Business | undefined> {
  const userKey = getUserKey(user);
  if (userKey === 'anonymous') {
    _cachedBusiness = null;
    _businessLoaded = true;
    return undefined;
  }

  const targetServerId = serverId ?? getStoredActiveBusinessId(userKey);

  // If memory cache matches both user_id AND targetServerId (if specified)
  if (
    _cachedBusiness &&
    String(_cachedBusiness.user_id) === userKey &&
    (!targetServerId || _cachedBusiness.id === targetServerId)
  ) {
    _businessLoaded = true;
    return _cachedBusiness;
  }

  const all = await db.businesses.toArray();
  const userBusinesses = all.filter((b) => String(b.user_id) === userKey && !b.deleted_at);

  let biz: Business | undefined;
  if (targetServerId) {
    biz = userBusinesses.find((b) => b.id === targetServerId);
  }
  if (!biz && targetServerId) {
    const storedCid = getStoredClientId(userKey, targetServerId);
    if (storedCid) {
      biz = userBusinesses.find((b) => b.client_id === storedCid);
    }
  }
  if (!biz && !serverId) {
    // Fallback: unsynced local business created offline
    biz = userBusinesses.find((b) => !b.id);
  }

  _cachedBusiness = biz ?? null;
  _businessLoaded = true;
  return biz;
}

/**
 * Sync business from the backend for the specific authenticated user.
 * Verifies backend business selection against user ownership and reuses
 * stable local client_id scoped by (user_id + server_id).
 */
export async function syncBusinessFromBackend(user: UserProfile): Promise<Business | null> {
  try {
    const userKey = getUserKey(user);
    const list = await apiListBusinesses();
    if (!list || list.length === 0) return null;

    const activeBusinesses = list.filter((b) => !b.deleted_at);
    if (activeBusinesses.length === 0) return null;

    // Verify / select the business:
    // 1. Check if user already had a previously active server ID in activeBusinesses
    const lastActiveServerId = getStoredActiveBusinessId(userKey);
    let selected = lastActiveServerId
      ? activeBusinesses.find((b) => b.id === lastActiveServerId)
      : undefined;

    // 2. If no last active or not found, check if any business has a stored client_id for this user
    if (!selected) {
      selected = activeBusinesses.find((b) => !!getStoredClientId(userKey, b.id));
    }

    // 3. If still none, check local IndexedDB for an existing business for this user
    if (!selected) {
      const allLocal = await db.businesses.toArray();
      const localMatch = allLocal.find(
        (b) => String(b.user_id) === userKey && activeBusinesses.some((ab) => ab.id === b.id)
      );
      if (localMatch && localMatch.id) {
        selected = activeBusinesses.find((b) => b.id === localMatch.id);
      }
    }

    // 4. Fallback selection:
    // For demo user, if Demo Business (id: 1) is present, prioritize it. Otherwise pick the newest business (highest ID).
    if (!selected) {
      if (user.isDemo) {
        selected = activeBusinesses.find((b) => b.id === 1 || b.name.toLowerCase().includes('demo')) ?? activeBusinesses[0];
      } else {
        selected = [...activeBusinesses].sort((a, b) => b.id - a.id)[0];
      }
    }

    if (!selected) return null;

    // Remember this server business ID as active for the user
    storeActiveBusinessId(userKey, selected.id);

    // Look up local business by (userKey + serverId)
    const allLocal = await db.businesses.toArray();
    let existing = allLocal.find((b) => b.id === selected.id && String(b.user_id) === userKey);

    const storedCid = getStoredClientId(userKey, selected.id);
    if (!existing && storedCid) {
      existing = allLocal.find((b) => b.client_id === storedCid);
    }

    if (existing) {
      storeClientId(userKey, selected.id, existing.client_id);
      await db.businesses.where('client_id').equals(existing.client_id).modify({
        id: selected.id,
        name: selected.name,
        starting_cash: selected.starting_cash ?? 0,
        user_id: user.id ?? user.email,
        synced: true,
      });
      const updated: Business = {
        ...existing,
        id: selected.id,
        name: selected.name,
        starting_cash: selected.starting_cash ?? 0,
        user_id: user.id ?? user.email,
        synced: true,
      };
      setCachedBusiness(updated);
      return updated;
    }

    // New local business record for this server business
    let clientId = storedCid;
    if (!clientId) {
      clientId = generateClientId();
    }
    storeClientId(userKey, selected.id, clientId);

    const now = nowISO();
    const newBiz: Business = {
      id: selected.id,
      client_id: clientId,
      name: selected.name,
      type: 'Provisions / Grocery',
      starting_cash: selected.starting_cash ?? 0,
      language: 'en',
      voice_enabled: false,
      deleted_at: selected.deleted_at ?? null,
      purge_at: selected.purge_at ?? null,
      synced: true,
      updated_at: now,
      user_id: user.id ?? user.email,
    };
    await db.businesses.put(newBiz);
    setCachedBusiness(newBiz);
    return newBiz;
  } catch (err) {
    console.warn('[BizPulse] syncBusinessFromBackend error:', err);
    return null;
  }
}

/** Clear active in-memory business cache on logout. */
export function clearLocalBusiness(): void {
  _cachedBusiness = null;
  _businessLoaded = false;
}

export async function createBusiness(
  data: Omit<Business, 'id' | 'client_id' | 'synced' | 'updated_at' | 'deleted_at' | 'purge_at'>,
  user?: UserProfile | null
): Promise<Business> {
  const now = nowISO();
  const business: Business = {
    ...data,
    client_id: generateClientId(),
    deleted_at: null,
    purge_at: null,
    synced: false,
    updated_at: now,
    user_id: user?.id ?? user?.email,
  };
  await db.businesses.put(business);
  await enqueueOutbox('business', business.client_id, 'create', business.client_id, user?.id ?? user?.email);
  return business;
}

/**
 * Update business settings (name, type, voice_enabled, etc.)
 */
export async function updateBusiness(
  clientId: string,
  patch: Partial<Omit<Business, 'id' | 'client_id' | 'synced' | 'updated_at'>>
): Promise<void> {
  const now = nowISO();
  await db.businesses
    .where('client_id')
    .equals(clientId)
    .modify({ ...patch, updated_at: now, synced: false });
  await enqueueOutbox('business', clientId, 'update', clientId);
}
