/**
 * BizPulse — Auth API
 *
 * All functions that talk to /api/auth/* endpoints.
 * Types are derived directly from the confirmed API contract.
 *
 * Responses use the backend's envelope:
 *   success → { data: {...}, meta: {} }
 *   error   → { error: { code, message, details } }
 *
 * Exception: POST /api/auth/token/ returns { access, refresh } at the
 * top level (simplejwt default — no envelope wrapper).
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface TokenPair {
  access: string;
  refresh: string;
}

/** The shape of every error response from the backend. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details: Record<string, string[] | string>;
  };
}

/** Thrown by every function in this file on a non-2xx response. */
export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details: Record<string, string[] | string>,
    message: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function authPost<T>(
  path: string,
  body: unknown,
  accessToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // Parse body regardless of status — errors always have JSON bodies
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new AuthApiError(res.status, 'PARSE_ERROR', {}, 'Unexpected non-JSON response from server.');
  }

  if (!res.ok) {
    const errBody = json as ApiErrorBody;
    const code = errBody?.error?.code ?? 'API_ERROR';
    const message = errBody?.error?.message ?? 'An unexpected error occurred.';
    const details = errBody?.error?.details ?? {};
    throw new AuthApiError(res.status, code, details, message);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Endpoint functions
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/register/
 * No auth required.
 *
 * On success: `201 { data: { message: "Account created. Please verify your email." } }`
 * On error:   throws AuthApiError with `details` containing field-level messages.
 */
export async function register(payload: {
  email: string;
  display_name: string;
  password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  const res = await authPost<{ data: { message: string }; meta: object }>(
    '/api/auth/register/',
    payload,
  );
  return res.data;
}

/**
 * POST /api/auth/token/
 * No auth required.
 *
 * Returns { access, refresh } at the TOP LEVEL (no envelope wrapper).
 * On error: throws AuthApiError — check `details.detail` for:
 *   - "No active account found with the given credentials." → wrong password
 *   - "Please verify your email before logging in."        → unverified email
 */
export async function login(payload: {
  email: string;
  password: string;
}): Promise<TokenPair> {
  // login response is NOT wrapped in { data, meta } — simplejwt returns tokens directly
  return authPost<TokenPair>('/api/auth/token/', payload);
}

/**
 * POST /api/auth/token/refresh/
 * No auth required (uses refresh token).
 *
 * ⚠️ ROTATE: both access AND refresh are returned — always save the new refresh.
 * On error (expired/blacklisted): throws AuthApiError → caller should clear auth and redirect to login.
 */
export async function refreshTokens(refresh: string): Promise<TokenPair> {
  return authPost<TokenPair>('/api/auth/token/refresh/', { refresh });
}

/**
 * POST /api/auth/logout/
 * No auth required (uses refresh token in body).
 *
 * Always clears local auth state after calling this, regardless of response.
 */
export async function logout(refresh: string): Promise<void> {
  try {
    await authPost<unknown>('/api/auth/logout/', { refresh });
  } catch {
    // Logout errors are swallowed — local state is always cleared regardless.
  }
}

/**
 * POST /api/auth/verify-email/
 * No auth required.
 *
 * token: UUID from the ?token= query param in the verification email link.
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  const res = await authPost<{ data: { message: string }; meta: object }>(
    '/api/auth/verify-email/',
    { token },
  );
  return res.data;
}

/**
 * POST /api/auth/verify-email/resend/
 * No auth required.
 *
 * Always returns 200 (intentionally vague — prevents user enumeration).
 */
export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const res = await authPost<{ data: { message: string }; meta: object }>(
    '/api/auth/verify-email/resend/',
    { email },
  );
  return res.data;
}

/**
 * POST /api/auth/password/change/
 * Requires auth (pass accessToken).
 *
 * ⚠️ On success: backend blacklists ALL tokens → caller must redirect to /login.
 */
export async function changePassword(
  payload: {
    current_password: string;
    new_password: string;
    password_confirmation: string;
  },
  accessToken: string,
): Promise<{ message: string }> {
  const res = await authPost<{ data: { message: string }; meta: object }>(
    '/api/auth/password/change/',
    payload,
    accessToken,
  );
  return res.data;
}

/**
 * POST /api/auth/password/reset/
 * No auth required.
 *
 * Always returns 200 (intentionally vague — prevents user enumeration).
 * Reset link expires in 1 hour.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await authPost<{ data: { message: string }; meta: object }>(
    '/api/auth/password/reset/',
    { email },
  );
  return res.data;
}

/**
 * POST /api/auth/password/reset/confirm/
 * No auth required.
 *
 * token: UUID from the ?token= query param in the reset email link.
 * ⚠️ On success: backend blacklists ALL tokens.
 */
export async function confirmPasswordReset(payload: {
  token: string;
  new_password: string;
  password_confirmation: string;
}): Promise<{ message: string }> {
  const res = await authPost<{ data: { message: string }; meta: object }>(
    '/api/auth/password/reset/confirm/',
    payload,
  );
  return res.data;
}

/**
 * POST /api/auth/email/change/
 * Requires auth (pass accessToken).
 *
 * On success: verification email sent to new_email address.
 */
export async function changeEmail(
  payload: {
    current_password: string;
    new_email: string;
  },
  accessToken: string,
): Promise<{ message: string }> {
  const res = await authPost<{ data: { message: string }; meta: object }>(
    '/api/auth/email/change/',
    payload,
    accessToken,
  );
  return res.data;
}
