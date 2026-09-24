/**
 * BizPulse — API Client
 *
 * Thin fetch wrapper around the Django DRF backend.
 * One function per endpoint, all typed against the API contract.
 *
 * IMPORTANT: If the backend isn't ready or a network request fails,
 * the UI NEVER blocks — it always reads from IndexedDB. This file is
 * only called by the sync engine (data/sync.ts), never directly from
 * UI components or hooks.
 *
 * TODO (API contract checklist — confirm with backend teammate):
 * [ ] Confirm base URL format and whether /api/ prefix is used
 * [ ] Confirm JWT goes in Authorization: Bearer header
 * [ ] Confirm client_id is accepted on create and echoed back in response
 * [ ] Confirm exact field names match domain/types.ts
 * [ ] Confirm error response shape for 4xx
 * [ ] Confirm pagination shape for list endpoints
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// TODO: move to environment variable (.env.local) before deploy
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

// ---------------------------------------------------------------------------
// Auth token management
// ---------------------------------------------------------------------------

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

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
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
// Auth endpoints
// ---------------------------------------------------------------------------

export interface SignupPayload {
  name: string;
  phone_or_email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    name: string;
    phone_or_email: string;
  };
}

/**
 * POST /auth/signup/
 * TODO: confirm exact path with backend teammate
 */
export async function apiSignup(payload: SignupPayload): Promise<AuthResponse> {
  return request<AuthResponse>('POST', '/auth/signup/', payload);
}

/**
 * POST /auth/login/
 */
export async function apiLogin(payload: {
  phone_or_email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('POST', '/auth/login/', payload);
}

/**
 * POST /auth/token/refresh/
 * TODO: confirm path (djangorestframework-simplejwt default is /api/token/refresh/)
 */
export async function apiRefreshToken(refresh: string): Promise<{ access: string }> {
  return request<{ access: string }>('POST', '/auth/token/refresh/', { refresh });
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
