/**
 * BizPulse — Auth Store
 *
 * Lightweight module-level store for authentication state.
 * No external state library needed — subscribers are React hooks.
 *
 * Responsibilities:
 *  - Hold access + refresh tokens in memory
 *  - Persist refresh token to localStorage (access token is kept in memory only)
 *  - Expose a proactive refresh scheduler (re-schedules every time tokens are set)
 *  - Notify React components via a simple subscriber pattern
 *
 * Token lifecycle (from API contract):
 *   access  → expires in 15 min → proactively refresh at 13 min
 *   refresh → expires in 7 days → on failure, clear and redirect to /login
 *   refresh → ROTATED on every use → always store new refresh from response
 */

import { login, refreshTokens, logout as apiLogout } from '../api/authApi';
import type { TokenPair } from '../api/authApi';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_REFRESH = 'bp_refresh_token';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** True only during the initial hydration on app boot */
  isHydrating: boolean;
}

let _state: AuthState = {
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrating: true,
};

type Listener = (state: AuthState) => void;
const _listeners = new Set<Listener>();

let _refreshTimerId: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _notify(): void {
  _listeners.forEach((fn) => fn(_state));
}

function _setState(patch: Partial<AuthState>): void {
  _state = { ..._state, ...patch };
  _notify();
}

/** Persist refresh token to localStorage. Call when tokens are set. */
function _persist(refresh: string | null): void {
  try {
    if (refresh) {
      localStorage.setItem(STORAGE_KEY_REFRESH, refresh);
    } else {
      localStorage.removeItem(STORAGE_KEY_REFRESH);
    }
  } catch {
    // localStorage may be unavailable in some environments — silent fail
  }
}

/** Load refresh token from localStorage (called on app boot). */
function _loadPersisted(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_REFRESH);
  } catch {
    return null;
  }
}

/** Cancel any pending proactive refresh timer. */
function _clearRefreshTimer(): void {
  if (_refreshTimerId !== null) {
    clearTimeout(_refreshTimerId);
    _refreshTimerId = null;
  }
}

/**
 * Schedule a silent token refresh ~13 minutes from now
 * (access token lasts 15 min; we refresh 2 min early for safety).
 */
function _scheduleRefresh(): void {
  _clearRefreshTimer();
  _refreshTimerId = setTimeout(() => {
    silentRefresh().catch(() => {
      // silentRefresh handles its own failure (clears auth on error)
    });
  }, 13 * 60 * 1000); // 13 minutes
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Hydrate auth state from localStorage on app boot.
 * Call this once in the root layout (or a top-level client component).
 * If a refresh token exists, immediately performs a silent refresh to obtain
 * a fresh access token — so the user is never bounced to /login on reload.
 */
export async function hydrateAuth(): Promise<void> {
  const storedRefresh = _loadPersisted();

  if (!storedRefresh) {
    _setState({ isHydrating: false });
    return;
  }

  try {
    const tokens = await refreshTokens(storedRefresh);
    _setTokens(tokens);
  } catch {
    // Stored refresh is expired or invalid — treat as logged out
    _persist(null);
  } finally {
    _setState({ isHydrating: false });
  }
}

/**
 * Set tokens after a successful login or refresh.
 * Schedules the next proactive refresh automatically.
 */
export function _setTokens(pair: TokenPair): void {
  _persist(pair.refresh);
  _setState({
    accessToken: pair.access,
    refreshToken: pair.refresh,
    isAuthenticated: true,
  });
  _scheduleRefresh();
}

/**
 * Log in with email + password.
 * Stores tokens and schedules proactive refresh.
 * Throws AuthApiError on failure (caller shows the error to the user).
 */
export async function authLogin(email: string, password: string): Promise<void> {
  const tokens = await login({ email, password });
  _setTokens(tokens);
}

/**
 * Silently refresh the access token using the stored refresh token.
 * Called proactively by the scheduler, and reactively on 401 from the API client.
 * Clears auth and redirects to /login if the refresh token is invalid/expired.
 */
export async function silentRefresh(): Promise<string> {
  const { refreshToken } = _state;

  if (!refreshToken) {
    authLogout();
    throw new Error('No refresh token available.');
  }

  try {
    const tokens = await refreshTokens(refreshToken);
    _setTokens(tokens);
    return tokens.access;
  } catch {
    // Refresh failed — session is dead
    authLogout();
    // Redirect to login (works in both client and server contexts)
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Session expired. Please log in again.');
  }
}

/**
 * Clear all auth state and localStorage.
 * Does NOT call the logout API — use `authLogoutWithApi` for that.
 */
export function authLogout(): void {
  _clearRefreshTimer();
  _persist(null);
  _setState({
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  });
}

/**
 * Full logout: blacklists the refresh token on the server, then clears local state.
 * Safe to call even if the API call fails.
 */
export async function authLogoutWithApi(): Promise<void> {
  const { refreshToken } = _state;
  if (refreshToken) {
    await apiLogout(refreshToken); // errors are swallowed inside apiLogout
  }
  authLogout();
}

/** Get the current access token (for use in API requests). */
export function getAccessToken(): string | null {
  return _state.accessToken;
}

/** Get a snapshot of the current auth state (for non-reactive reads). */
export function getAuthState(): Readonly<AuthState> {
  return _state;
}

// ---------------------------------------------------------------------------
// React integration — useAuthStore hook
// ---------------------------------------------------------------------------

import { useSyncExternalStore } from 'react';

function _subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _getSnapshot(): AuthState {
  return _state;
}

/**
 * React hook — subscribe to auth state changes.
 * Components using this hook re-render automatically when auth state changes.
 *
 * @example
 * const { isAuthenticated, isHydrating } = useAuthStore();
 */
export function useAuthStore(): AuthState {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
}
