/**
 * BizPulse — useBusiness hook
 *
 * Provides the current business entity to the UI.
 * Syncs with the atomic authStore and ensures cross-device onboarding state
 * is retrieved from the backend without redundant unauthenticated requests.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
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

export interface BusinessState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  business: Business | null;
  error: string | null;
}

export function useBusiness() {
  const router = useRouter();
  const auth = useAuthStore();
  const [business, setBusiness] = useState<Business | null>(getCachedBusiness());
  // isLoading starts true when auth is hydrating OR when we haven't yet
  // loaded the business for an authenticated session.
  const [isLoading, setIsLoading] = useState<boolean>(auth.isHydrating || (!isBusinessLoaded() && auth.isAuthenticated));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. If auth is still hydrating, keep showing the spinner and wait for
      //    the next effect invocation (after hydrateAuth resolves).
      if (auth.isHydrating) {
        if (mounted) setIsLoading(true);
        return;
      }

      // 2. If unauthenticated, do NOT call backend — clear and stop loading.
      if (!auth.isAuthenticated || !auth.accessToken) {
        if (mounted) {
          setBusiness(null);
          setIsLoading(false);
        }
        return;
      }

      // 3. Authenticated: show spinner while we resolve the business.
      if (mounted) setIsLoading(true);

      try {
        // 3a. Check local cache first (fastest path — avoids IndexedDB round-trip).
        let biz = getCachedBusiness();

        // 3b. If cache is cold, check IndexedDB by (user identity + active server business ID).
        if (!biz) {
          biz = (await getBusiness(auth.user)) ?? null;
        }

        // 3c. Always sync authoritative business state from backend.
        if (auth.user) {
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

        if (biz) {
          await pullServerData(biz);
        }

        if (mounted) {
          setBusiness(biz ?? null);
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('[BizPulse] Business init error:', err);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [auth.isHydrating, auth.isAuthenticated, auth.accessToken, auth.user]);

  const signup = useCallback(async (payload: {
    displayName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    businessName: string;
    businessType: string;
    startingCash: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      await register({
        email: payload.email,
        display_name: payload.displayName,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      });

      const biz = await createBusiness({
        name: payload.businessName,
        type: payload.businessType,
        starting_cash: payload.startingCash,
        language: 'en',
        voice_enabled: false,
      }, auth.user);

      setCachedBusiness(biz);
      setBusiness(biz);
      setIsLoading(false);
      return biz;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setError(msg);
      setIsLoading(false);
      throw err;
    }
  }, [auth.user]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
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
        await pullServerData(biz);
        setCachedBusiness(biz);
      }
      setBusiness(biz ?? null);
      setIsLoading(false);
      return { user, business: biz ?? null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Check your details.';
      setError(msg);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await authLogoutWithApi();
    clearLocalBusiness();
    setBusiness(null);
    setError(null);
    setIsLoading(false);
    if (typeof window !== 'undefined') {
      router.replace('/login');
    }
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
    isLoading: auth.isHydrating || isLoading,
    user: auth.user,
    business,
    error,
    signup,
    login,
    logout,
    saveBusiness,
  };
}
