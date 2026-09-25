/**
 * BizPulse — API Client
 *
 * Authenticated data-plane requests (business, tallies, repayments, etc.).
 * Auth requests (login, register, etc.) live in src/api/authApi.ts.
 *
 * Automatically refreshes the access token on 401, then retries once.
 * Auth state is managed by src/state/authStore.ts.
 *
 * IMPORTANT: If the backend isn't ready or a network request fails,
 * the UI NEVER blocks — it always reads from IndexedDB. This file is
 * only called by the sync engine (data/sync.ts), never directly from
 * UI components or hooks.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

import { getAccessToken, silentRefresh } from '../state/authStore';
export { getAccessToken } from '../state/authStore';

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  _isRetry = false,
): Promise<T> {
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 — access token expired → silent refresh → retry once
  if (response.status === 401 && !_isRetry) {
    try {
      await silentRefresh();
    } catch {
      // silentRefresh clears auth + redirects to /login on failure
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
    return request<T>(method, path, body, true);
  }

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = await response.text();
    }
    throw new ApiError(response.status, `API ${method} ${path} failed: ${response.status}`, errorBody);
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth stubs — @deprecated
// Use src/api/authApi.ts for all new auth calls.
// These are kept only for backwards compat with the existing sync engine.
// ---------------------------------------------------------------------------

export interface SignupPayload {
  email: string;
  display_name: string;
  password: string;
  password_confirmation: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}

/** @deprecated Use authApi.register() */
export async function apiSignup(payload: SignupPayload): Promise<{ data: { message: string } }> {
  return request<{ data: { message: string } }>('POST', '/api/auth/register/', payload);
}

/** @deprecated Use authApi.login() + authStore.authLogin() */
export async function apiLogin(payload: {
  email: string;
  password: string;
}): Promise<TokenPair> {
  return request<TokenPair>('POST', '/api/auth/token/', payload);
}

/** @deprecated Use authApi.refreshTokens() + authStore.silentRefresh() */
export async function apiRefreshToken(refresh: string): Promise<TokenPair> {
  return request<TokenPair>('POST', '/api/auth/token/refresh/', { refresh });
}

// ---------------------------------------------------------------------------
// Business endpoints
// ---------------------------------------------------------------------------

export interface BusinessPayload {
  client_id: string;
  name: string;
  type: string;
  starting_cash: number;
  language: string;
  voice_enabled: boolean;
}

export interface BusinessResponse extends BusinessPayload {
  id: number;
}

/**
 * POST /business/
 * TODO: confirm path and whether it's nested under /accounts/
 */
export async function apiCreateBusiness(payload: BusinessPayload): Promise<BusinessResponse> {
  return request<BusinessResponse>('POST', '/business/', payload);
}

export async function apiUpdateBusiness(
  id: number,
  payload: Partial<BusinessPayload>
): Promise<BusinessResponse> {
  return request<BusinessResponse>('PATCH', `/business/${id}/`, payload);
}

// ---------------------------------------------------------------------------
// Customer endpoints
// ---------------------------------------------------------------------------

export interface CustomerPayload {
  client_id: string;
  name: string;
  phone: string;
}

export interface CustomerResponse extends CustomerPayload {
  id: number;
}

export async function apiCreateCustomer(payload: CustomerPayload): Promise<CustomerResponse> {
  return request<CustomerResponse>('POST', '/customers/', payload);
}

export async function apiUpdateCustomer(
  id: number,
  payload: Partial<CustomerPayload>
): Promise<CustomerResponse> {
  return request<CustomerResponse>('PATCH', `/customers/${id}/`, payload);
}

// ---------------------------------------------------------------------------
// Daily Tally endpoints
// ---------------------------------------------------------------------------

export interface DailyTallyPayload {
  client_id: string;
  date: string;
  cash_sales: number;
  expenses: number;
  note: string;
}

export interface DailyTallyResponse extends DailyTallyPayload {
  id: number;
  synced_at: string;
}

export async function apiCreateDailyTally(payload: DailyTallyPayload): Promise<DailyTallyResponse> {
  return request<DailyTallyResponse>('POST', '/entries/', payload);
}

export async function apiUpdateDailyTally(
  id: number,
  payload: Partial<DailyTallyPayload>
): Promise<DailyTallyResponse> {
  return request<DailyTallyResponse>('PATCH', `/entries/${id}/`, payload);
}

/**
 * Pull all entries from the server (full sync).
 * TODO: confirm pagination shape with backend teammate
 */
export async function apiListDailyTallies(): Promise<DailyTallyResponse[]> {
  return request<DailyTallyResponse[]>('GET', '/entries/');
}

// ---------------------------------------------------------------------------
// Credit Record endpoints
// ---------------------------------------------------------------------------

export interface CreditRecordPayload {
  client_id: string;
  customer: number; // server customer id
  amount: number;
  issued_date: string;
  due_date: string | null;
}

export interface CreditRecordResponse extends CreditRecordPayload {
  id: number;
}

export async function apiCreateCreditRecord(payload: CreditRecordPayload): Promise<CreditRecordResponse> {
  return request<CreditRecordResponse>('POST', '/credit-records/', payload);
}

export async function apiUpdateCreditRecord(
  id: number,
  payload: Partial<CreditRecordPayload>
): Promise<CreditRecordResponse> {
  return request<CreditRecordResponse>('PATCH', `/credit-records/${id}/`, payload);
}

// ---------------------------------------------------------------------------
// Repayment endpoints
// ---------------------------------------------------------------------------

export interface RepaymentPayload {
  client_id: string;
  credit_record: number; // server credit record id
  amount: number;
  paid_date: string;
}

export interface RepaymentResponse extends RepaymentPayload {
  id: number;
}

export async function apiCreateRepayment(payload: RepaymentPayload): Promise<RepaymentResponse> {
  return request<RepaymentResponse>('POST', '/repayments/', payload);
}

// ---------------------------------------------------------------------------
// Error type export
// ---------------------------------------------------------------------------

export { ApiError };
