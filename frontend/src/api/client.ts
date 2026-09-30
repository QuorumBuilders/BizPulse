/**
 * Authenticated data-plane API client (business, tallies, credits, repayments).
 * Auth requests live in authApi.ts. Token refresh is handled automatically on 401.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

import { getAccessToken, getAuthState, silentRefresh } from '../state/authStore';
export { getAccessToken } from '../state/authStore';

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
  let accessToken = getAccessToken();

  // If no access token but refresh token exists, obtain access token first
  if (!accessToken) {
    const authState = getAuthState();
    if (authState.refreshToken) {
      try {
        accessToken = await silentRefresh();
      } catch {
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
    }
  }

  // If still no access token, prevent unauthenticated network request on protected endpoints
  if (!accessToken) {
    throw new ApiError(401, 'Unauthenticated. Please log in.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 — access token expired → attempt single-flight refresh once
  if (response.status === 401 && !_isRetry) {
    try {
      await silentRefresh();
    } catch {
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

  const jsonResult = await response.json();

  // Unwrap { data: T, meta: { ... } } response envelope if present
  if (jsonResult && typeof jsonResult === 'object' && 'data' in jsonResult && !('access' in jsonResult)) {
    return jsonResult.data as T;
  }

  return jsonResult as T;
}

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
export async function apiSignup(payload: SignupPayload): Promise<{ message: string }> {
  return request<{ message: string }>('POST', '/api/auth/register/', payload);
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

export interface BusinessPayload {
  name: string;
  starting_cash: number;
}

export interface BusinessResponse {
  id: number;
  name: string;
  starting_cash: number;
  deleted_at: string | null;
  purge_at: string | null;
}

export async function apiListBusinesses(): Promise<BusinessResponse[]> {
  return request<BusinessResponse[]>('GET', '/api/businesses/');
}

export async function apiCreateBusiness(payload: BusinessPayload): Promise<BusinessResponse> {
  return request<BusinessResponse>('POST', '/api/businesses/', {
    name: payload.name,
    starting_cash: payload.starting_cash,
  });
}

export async function apiUpdateBusiness(
  businessId: number,
  payload: { name: string }
): Promise<BusinessResponse> {
  return request<BusinessResponse>('PATCH', `/api/businesses/${businessId}/`, {
    name: payload.name,
  });
}

export interface CustomerPayload {
  name: string;
  phone: string;
}

export interface CustomerResponse {
  id: number;
  name: string;
  phone: string;
}

export async function apiListCustomers(businessId: number): Promise<CustomerResponse[]> {
  return request<CustomerResponse[]>('GET', `/api/businesses/${businessId}/customers/`);
}

export async function apiCreateCustomer(
  businessId: number,
  payload: CustomerPayload
): Promise<CustomerResponse> {
  return request<CustomerResponse>('POST', `/api/businesses/${businessId}/customers/`, {
    name: payload.name,
    phone: payload.phone,
  });
}

export async function apiUpdateCustomer(
  businessId: number,
  customerId: number,
  payload: Partial<CustomerPayload>
): Promise<CustomerResponse> {
  return request<CustomerResponse>('PATCH', `/api/businesses/${businessId}/customers/${customerId}/`, payload);
}

export interface DailyTallyPayload {
  date: string;
  cash_sales: number;
  expenses: number;
  note?: string;
}

export interface DailyTallyResponse {
  id: number;
  date: string;
  cash_sales: string | number;
  expenses: string | number;
  note: string;
}

export async function apiListDailyTallies(
  businessId: number,
  params?: { from_date?: string; to_date?: string }
): Promise<DailyTallyResponse[]> {
  const search = new URLSearchParams();
  if (params?.from_date) search.set('from_date', params.from_date);
  if (params?.to_date) search.set('to_date', params.to_date);
  const qs = search.toString() ? `?${search.toString()}` : '';
  return request<DailyTallyResponse[]>('GET', `/api/businesses/${businessId}/daily-tallies/${qs}`);
}

export async function apiCreateDailyTally(
  businessId: number,
  payload: DailyTallyPayload
): Promise<DailyTallyResponse> {
  return request<DailyTallyResponse>('POST', `/api/businesses/${businessId}/daily-tallies/`, {
    date: payload.date,
    cash_sales: payload.cash_sales,
    expenses: payload.expenses,
    note: payload.note ?? '',
  });
}

export async function apiUpdateDailyTally(
  businessId: number,
  tallyId: number,
  payload: Partial<DailyTallyPayload>
): Promise<DailyTallyResponse> {
  return request<DailyTallyResponse>('PATCH', `/api/businesses/${businessId}/daily-tallies/${tallyId}/`, payload);
}

export interface CreditRecordPayload {
  customer: number; // server customer id
  amount: number;
  issued_date: string;
  due_date?: string | null;
}

export interface CreditRecordResponse {
  id: number;
  customer: number;
  amount: string | number;
  issued_date: string;
  due_date: string | null;
}

export async function apiListCreditRecords(businessId: number): Promise<CreditRecordResponse[]> {
  return request<CreditRecordResponse[]>('GET', `/api/businesses/${businessId}/credits/`);
}

export async function apiCreateCreditRecord(
  businessId: number,
  payload: CreditRecordPayload
): Promise<CreditRecordResponse> {
  return request<CreditRecordResponse>('POST', `/api/businesses/${businessId}/credits/`, {
    customer: payload.customer,
    amount: payload.amount,
    issued_date: payload.issued_date,
    due_date: payload.due_date ?? null,
  });
}

export async function apiUpdateCreditRecord(
  businessId: number,
  creditId: number,
  payload: Partial<Omit<CreditRecordPayload, 'customer'>>
): Promise<CreditRecordResponse> {
  return request<CreditRecordResponse>('PATCH', `/api/businesses/${businessId}/credits/${creditId}/`, payload);
}

export interface RepaymentPayload {
  amount: number;
  paid_date: string;
}

export interface RepaymentResponse {
  id: number;
  credit_record: number;
  amount: string | number;
  paid_date: string;
}

export async function apiListRepayments(
  businessId: number,
  creditId: number
): Promise<RepaymentResponse[]> {
  return request<RepaymentResponse[]>('GET', `/api/businesses/${businessId}/credits/${creditId}/repayments/`);
}

export async function apiCreateRepayment(
  businessId: number,
  creditId: number,
  payload: RepaymentPayload
): Promise<RepaymentResponse> {
  return request<RepaymentResponse>('POST', `/api/businesses/${businessId}/credits/${creditId}/repayments/`, {
    amount: payload.amount,
    paid_date: payload.paid_date,
  });
}

export { ApiError };
