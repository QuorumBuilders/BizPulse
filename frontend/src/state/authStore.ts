/**
 * BizPulse — Auth Store
 *
 * Single-flight, concurrency-safe authentication store using useSyncExternalStore.
 *
 * Lifecycle:
 * 1. Initial state:
 *    - if refresh token in localStorage: isHydrating = true, isAuthenticated = false
 *    - if no refresh token: isHydrating = false, isAuthenticated = false
 * 2. hydrateAuth():
 *    - single-flight promise
 *    - performs silent refresh once if refresh token exists
 *    - on success: isAuthenticated = true, isHydrating = false
 *    - on failure: tokens cleared, isAuthenticated = false, isHydrating = false (terminal)
 * 3. silentRefresh():
 *    - concurrency-safe single-flight promise
 *    - on failure: terminal authLogout(), clears storage, sets isAuthenticated = false
 */

import { login, refreshTokens, logout as apiLogout } from '../api/authApi';
import type { TokenPair } from '../api/authApi';
import type { UserProfile } from '../domain/types';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY_REFRESH = 'bp_refresh_token';
const STORAGE_KEY_USER = 'bp_user';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
}

function _parseJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function _getInitialState(): AuthState {
  if (typeof window === 'undefined') {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
    };
  }
  try {
    const refresh = localStorage.getItem(STORAGE_KEY_REFRESH);
    const userRaw = localStorage.getItem(STORAGE_KEY_USER);
    const user: UserProfile | null = userRaw ? JSON.parse(userRaw) : null;
    return {
      accessToken: null,
      refreshToken: refresh,
      user,
      isAuthenticated: false, // Never true until access token is verified
      isHydrating: !!refresh,
    };
  } catch {
    return {
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrating: false,
    };
  }
}

let _state: AuthState = _getInitialState();

type Listener = (state: AuthState) => void;
const _listeners = new Set<Listener>();

let _refreshTimerId: ReturnType<typeof setTimeout> | null = null;
let _refreshPromise: Promise<string> | null = null;
let _hydrationPromise: Promise<boolean> | null = null;

function _notify(): void {
  _listeners.forEach((fn) => fn(_state));
}

function _setState(patch: Partial<AuthState>): void {
  _state = { ..._state, ...patch };
  _notify();
}

function _persist(refresh: string | null, user?: UserProfile | null): void {
  try {
    if (typeof window === 'undefined') return;
    if (refresh) {
      localStorage.setItem(STORAGE_KEY_REFRESH, refresh);
    } else {
      localStorage.removeItem(STORAGE_KEY_REFRESH);
    }

    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else if (user === null) {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  } catch {
    // Ignore storage errors
  }
}

function _clearRefreshTimer(): void {
  if (_refreshTimerId !== null) {
    clearTimeout(_refreshTimerId);
    _refreshTimerId = null;
  }
}

function _scheduleRefresh(): void {
  _clearRefreshTimer();
  _refreshTimerId = setTimeout(() => {
    silentRefresh().catch(() => {});
  }, 13 * 60 * 1000);
}

export function _setTokens(pair: TokenPair, userProfile?: UserProfile | null): void {
  let user = userProfile ?? _state.user;
  if (pair.access) {
    const claims = _parseJwt(pair.access);
    const claimUserId = claims?.user_id as number | string | undefined;
    const claimEmail = (claims?.email as string) || '';

    if (!user) {
      if (claimUserId || claimEmail) {
        user = {
          id: claimUserId,
          email: claimEmail,
          displayName: claimEmail ? claimEmail.split('@')[0] : 'User',
        };
      }
    } else if (claimUserId && !user.id) {
      user = { ...user, id: claimUserId };
    }
  }

  _persist(pair.refresh, user);
  _setState({
    accessToken: pair.access,
    refreshToken: pair.refresh,
    user: user ?? null,
    isAuthenticated: true,
    isHydrating: false,
  });
  _scheduleRefresh();
}

/**
 * Concurrency-safe silent refresh with single-flight deduplication.
 * Multiple simultaneous calls share the exact same refresh request.
 */
export async function silentRefresh(): Promise<string> {
  const currentRefresh = _state.refreshToken || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_REFRESH) : null);

  if (!currentRefresh) {
    authLogout();
    throw new Error('No refresh token available.');
  }

  if (_refreshPromise) {
    return _refreshPromise;
  }

  _refreshPromise = (async () => {
    try {
      const tokens = await refreshTokens(currentRefresh);
      _setTokens(tokens, _state.user);
      return tokens.access;
    } catch (err) {
      authLogout();
      throw err;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

/**
 * Idempotent, single-flight authentication hydration on app boot.
 *
 * Call this once from RouteGuard on mount. Multiple simultaneous calls
 * share the same in-flight promise. Safe to call from React StrictMode
 * double-mount because the second call joins the existing promise.
 */
export async function hydrateAuth(): Promise<boolean> {
  // Already fully authenticated with a live access token — nothing to do.
  if (_state.isAuthenticated && _state.accessToken) {
    return true;
  }

  // No stored refresh token — nothing to hydrate; ensure state is clean.
  const storedRefresh =
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_REFRESH) : null;
  if (!storedRefresh) {
    _setState({ isHydrating: false, isAuthenticated: false, accessToken: null, refreshToken: null });
    return false;
  }

  // Deduplicate: if another call is already in-flight, join it.
  if (_hydrationPromise) {
    return _hydrationPromise;
  }

  // Ensure hydrating flag is set before the async work starts so that
  // consumers reading the store synchronously see isHydrating = true.
  if (!_state.isHydrating) {
    _setState({ isHydrating: true });
  }

  _hydrationPromise = (async () => {
    try {
      await silentRefresh();
      return true;
    } catch {
      authLogout();
      return false;
    } finally {
      _setState({ isHydrating: false });
      _hydrationPromise = null;
    }
  })();

  return _hydrationPromise;
}

/**
 * Normal or Demo user login.
 */
export async function authLogin(email: string, password: string): Promise<UserProfile> {
  const tokens = await login({ email, password });
  const isDemo = email.toLowerCase().includes('demo') || email.toLowerCase() === 'addergranzl@example.com';
  const claims = _parseJwt(tokens.access);

  const user: UserProfile = {
    id: (claims?.user_id as number | string | undefined) ?? (isDemo ? 'demo-user' : undefined),
    email,
    displayName: isDemo ? 'Demo Trader' : email.split('@')[0],
    isDemo,
  };

  _setTokens(tokens, user);
  return user;
}

export function authLogout(): void {
  _clearRefreshTimer();
  _refreshPromise = null;
  _persist(null, null);
  _setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    isHydrating: false,
  });
}

export async function authLogoutWithApi(): Promise<void> {
  const currentRefresh = _state.refreshToken;
  authLogout();
  if (currentRefresh) {
    try {
      await apiLogout(currentRefresh);
    } catch {
      // API logout errors are non-blocking
    }
  }
}

export function getAccessToken(): string | null {
  return _state.accessToken;
}

export function getUser(): UserProfile | null {
  return _state.user;
}

export function getAuthState(): Readonly<AuthState> {
  return _state;
}

function _subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _getSnapshot(): AuthState {
  return _state;
}

export function useAuthStore(): AuthState {
  return useSyncExternalStore(_subscribe, _getSnapshot, _getSnapshot);
}
