/**
 * BizPulse — useBusiness hook
 *
 * Provides the current business entity to the UI.
 * Also manages auth state (is the user logged in?).
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBusiness, createBusiness, updateBusiness } from '../data/repositories/businessRepo';
import { hasStoredToken } from '../data/sync';
import { authLogin, authLogoutWithApi, hydrateAuth, getAuthState } from '../state/authStore';
import { register } from '../api/authApi';
import type { Business } from '../domain/types';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  business: Business | null;
  error: string | null;
}

export function useBusiness() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    business: null,
    error: null,
  });

  // On mount: hydrate auth tokens from storage and load local business
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await hydrateAuth();
        const auth = getAuthState();
        const hasToken = auth.isAuthenticated || hasStoredToken();
        const biz = await getBusiness();

        if (!mounted) return;
        setState({
          isAuthenticated: hasToken,
          isLoading: false,
          business: biz ?? null,
          error: null,
        });
      } catch (err) {
        console.warn('[BizPulse] Init error:', err);
        if (!mounted) return;
        setState((s) => ({ ...s, isLoading: false }));
      }
    }

    init();

    // Failsafe timeout: never stay in loading state longer than 1.5s
    const timeout = setTimeout(() => {
      if (mounted) {
        setState((s) => (s.isLoading ? { ...s, isLoading: false } : s));
      }
    }, 1500);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  const signup = useCallback(async (payload: {
    displayName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    businessName: string;
    businessType: string;
    startingCash: number;
  }) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      // Call register — on success the user must verify email before logging in
      await register({
        email: payload.email,
        display_name: payload.displayName,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      });

      // Store business locally (offline-first); sync happens after login
      const biz = await createBusiness({
        name: payload.businessName,
        type: payload.businessType,
        starting_cash: payload.startingCash,
        language: 'en',
        voice_enabled: false,
      });

      setState({ isAuthenticated: false, isLoading: false, business: biz, error: null });
      // Caller should redirect to a "check your email" / verify-email-pending screen
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setState((s) => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      await authLogin(email, password); // sets tokens in authStore + schedules refresh
      const biz = await getBusiness();
      setState({
        isAuthenticated: true,
        isLoading: false,
        business: biz ?? null,
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Check your details.';
      setState((s) => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await authLogoutWithApi(); // blacklists refresh token on server, clears local state
    setState({ isAuthenticated: false, isLoading: false, business: null, error: null });
  }, []);

  const saveBusiness = useCallback(async (
    patch: Partial<Omit<Business, 'id' | 'client_id' | 'synced' | 'updated_at'>>
  ) => {
    if (state.business) {
      // Update existing business (settings change)
      await updateBusiness(state.business.client_id, patch);
    } else {
      // Create business during onboarding (new user OR returning user on new device)
      await createBusiness({
        name: patch.name ?? '',
        type: patch.type ?? '',
        starting_cash: patch.starting_cash ?? 0,
        language: patch.language ?? 'en',
        voice_enabled: patch.voice_enabled ?? false,
      });
    }
    const updated = await getBusiness();
    setState((s) => ({ ...s, isAuthenticated: true, business: updated ?? s.business }));
  }, [state.business]);

  return {
    ...state,
    signup,
    login,
    logout,
    saveBusiness,
  };
}
