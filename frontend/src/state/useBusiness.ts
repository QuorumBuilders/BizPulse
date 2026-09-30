/**
 * BizPulse — useBusiness hook
 *
 * Provides the current business entity to the UI.
 * Syncs with the atomic authStore and ensures cross-device onboarding state
 * is retrieved from the backend without redundant unauthenticated requests.
 *
 * BOOT STATUS tri-state:
 *   'pending'  — from hook mount until init() fully resolves (no routing decisions should be made)
 *   'resolved' — init() completed successfully (business may be null if user has no business)
 *   'error'    — init() failed; treat as resolved but with null business
 *
 * This prevents RouteGuard from acting on the transient isLoading=false + business=null
 * gap that existed with the old boolean flag.
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  getBusiness,
  getCachedBusiness,
  isBusinessLoaded,
  setCachedBusiness,
  createBusiness,
  updateBusiness,
  syncBusinessFromBackend,
  clearLocalBusiness,
} from '../data/repositories/businessRepo';
import { runSync, pullServerData } from '../data/sync';
import {
  authLogin,
  authLogoutWithApi,
  useAuthStore,
} from '../state/authStore';
import { register } from '../api/authApi';
import type { Business, UserProfile } from '../domain/types';

export type BootStatus = 'pending' | 'resolved' | 'error';

export interface BusinessState {
  isAuthenticated: boolean;
  /** @deprecated Use bootStatus instead for routing decisions */
  isLoading: boolean;
  /** Tri-state boot status. RouteGuard must not redirect while 'pending'. */
  bootStatus: BootStatus;
  user: UserProfile | null;
  business: Business | null;
  error: string | null;
}

/**
 * Session-level guard: once pullServerData runs for a given user+business,
 * don't run it again until the user logs out or the page is refreshed.
 */
let _syncedSessionKey: string | null = null;

function _sessionKey(userId: string | number | undefined, bizClientId: string): string {
  return `${userId ?? 'anon'}::${bizClientId}`;
}

export function clearSessionSyncGuard(): void {
  _syncedSessionKey = null;
}

export function useBusiness() {
  const router = useRouter();
  const auth = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(getCachedBusiness(auth.user));
  const [bootStatus, setBootStatus] = useState<BootStatus>(
    // Start pending if auth is hydrating OR if we're authenticated but haven't loaded the business
    auth.isHydrating || (!isBusinessLoaded(auth.user) && auth.isAuthenticated) ? 'pending' : 'resolved'
  );
  const [error, setError] = useState<string | null>(null);
  // Track whether the last init was for a real login transition (false→true)
  const prevIsAuthRef = useRef<boolean>(auth.isAuthenticated);

  // Derived loading flag for backward compat
  const isLoading = bootStatus === 'pending';

  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. If auth is still hydrating, stay pending and wait for the next effect.
      if (auth.isHydrating) {
        if (mounted) setBootStatus('pending');
        return;
      }

      // 2. Unauthenticated — resolve immediately with no business.
      if (!auth.isAuthenticated || !auth.accessToken || !auth.user) {
        if (mounted) {
          setBusiness(null);
          setBootStatus('resolved');
        }
        return;
      }

      // 3. Authenticated — mark as pending while we resolve the business.
      if (mounted) setBootStatus('pending');

      try {
        // 3a. Check local cache first (fastest path — avoids IndexedDB round-trip).
        let biz = getCachedBusiness(auth.user);

        // 3b. If cache is cold, check IndexedDB.
        if (!biz) {
          biz = (await getBusiness(auth.user)) ?? null;
        }

        // 3c. Sync authoritative business state from backend on first session load
        const currentBizClientId = biz?.client_id;
        const sk = currentBizClientId ? _sessionKey(auth.user?.id, currentBizClientId) : null;
        const alreadySyncedThisSession = sk !== null && _syncedSessionKey === sk;

        if (auth.user && (!biz || !alreadySyncedThisSession)) {
          const backendBiz = await syncBusinessFromBackend(auth.user);
          if (backendBiz) {
            biz = backendBiz;
          }
        }

        // 3d. Demo user fallback only if backend genuinely has no business
        if (!biz && auth.user?.isDemo) {
          biz = await createBusiness({
            name: 'Demo Business',
            type: 'Provisions / Grocery',
            starting_cash: 100000,
            language: 'en',
            voice_enabled: false,
          }, auth.user);
        }

        // 3e. Pull full server data (customers, tallies, credits) — once per session
        if (biz) {
          const resolvedSk = _sessionKey(auth.user?.id, biz.client_id);
          if (_syncedSessionKey !== resolvedSk) {
            _syncedSessionKey = resolvedSk;
            await pullServerData(biz);
          }
          setCachedBusiness(biz);
        }

        if (mounted) {
          setBusiness(biz ?? null);
          setBootStatus('resolved');
        }
      } catch (err) {
        console.warn('[BizPulse] Business init error:', err);
        if (mounted) {
          setBootStatus('error');
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
    // NOTE: auth.accessToken intentionally NOT in deps — token refresh should not
    // re-trigger the full init waterfall. Only genuine auth state transitions matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isHydrating, auth.isAuthenticated, auth.user]);

  const signup = useCallback(async (payload: {
    displayName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    businessName: string;
    businessType: string;
    startingCash: number;
  }) => {
    setBootStatus('pending');
    setError(null);
    try {
      await register({
        email: payload.email,
        display_name: payload.displayName,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      });
      // Note: signup does NOT log the user in — they must verify email first.
      setBootStatus('resolved');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(msg);
      setBootStatus('error');
      throw err;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setBootStatus('pending');
    setError(null);
    try {
      const user = await authLogin(email, password);

      let biz = await syncBusinessFromBackend(user);

      if (!biz) {
        biz = (await getBusiness(user)) ?? null;
      }

      if (!biz && user.isDemo) {
        biz = await createBusiness({
          name: 'Demo Business',
          type: 'Provisions / Grocery',
          starting_cash: 100000,
          language: 'en',
          voice_enabled: false,
        }, user);
      }

      if (biz) {
        // Always pull fresh server data on explicit login (bypass session guard)
        const sk = _sessionKey(user.id, biz.client_id);
        _syncedSessionKey = sk;
        await pullServerData(biz);
        setCachedBusiness(biz);
      }
      setBusiness(biz ?? null);
      setBootStatus('resolved');
      return { user, business: biz ?? null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Check your details.';
      setError(msg);
      setBootStatus('error');
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    // 1. Mark as pending FIRST — this suppresses any RouteGuard redirect logic
    //    while we are in the middle of cleaning up and navigating.
    setBootStatus('pending');
    // 2. Navigate first, THEN clear state. This prevents RouteGuard from
    //    firing a competing redirect before we get there.
    router.replace('/login');
    // 3. Clear session sync guard so next login pulls fresh data.
    clearSessionSyncGuard();
    // 4. Clear local business cache.
    clearLocalBusiness();
    setBusiness(null);
    setError(null);
    // 5. Call API logout (fires-and-forgets the server blacklist call).
    //    authLogout() inside this clears tokens and flips isAuthenticated=false.
    await authLogoutWithApi();
    // 6. Resolve to 'resolved' so RouteGuard can now act on isAuthenticated=false
    //    and confirm the /login redirect is correct.
    setBootStatus('resolved');
  }, [router]);

  const saveBusiness = useCallback(async (
    patch: Partial<Omit<Business, 'id' | 'client_id' | 'synced' | 'updated_at'>>
  ) => {
    let result: Business;
    if (business) {
      await updateBusiness(business.client_id, patch);
      result = (await getBusiness(auth.user)) ?? { ...business, ...patch } as Business;
    } else {
      result = await createBusiness({
        name: patch.name ?? '',
        type: patch.type ?? '',
        starting_cash: patch.starting_cash ?? 0,
        language: patch.language ?? 'en',
        voice_enabled: patch.voice_enabled ?? false,
      }, auth.user);
    }

    setCachedBusiness(result);
    setBusiness(result);
    runSync().catch(() => {});
  }, [business, auth.user]);

  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading,
    bootStatus,
    user: auth.user,
    business,
    error,
    login,
    logout,
    signup,
    saveBusiness,
  };
}
