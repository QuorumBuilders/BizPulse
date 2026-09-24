/**
 * BizPulse — useBusiness hook
 *
 * Provides the current business entity to the UI.
 * Also manages auth state (is the user logged in?).
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBusiness, createBusiness, updateBusiness } from '../data/repositories/businessRepo';
import { hasStoredToken, loadStoredTokens, storeTokens, clearTokens } from '../data/sync';
import { apiSignup, apiLogin } from '../api/client';
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

  // On mount: check for stored token and load local business
  useEffect(() => {
    let mounted = true;
    try {
      loadStoredTokens();
      const hasToken = hasStoredToken();

      getBusiness()
        .then((biz) => {
          if (!mounted) return;
          setState({
            // Authenticated if token present OR a local business already exists
            isAuthenticated: hasToken || !!biz,
            isLoading: false,
            business: biz ?? null,
            error: null,
          });
        })
        .catch((err) => {
          console.warn('[BizPulse] Could not read local business on init:', err);
          if (!mounted) return;
          setState({
            isAuthenticated: hasToken,
            isLoading: false,
            business: null,
            error: null,
          });
        });
    } catch (err) {
      console.warn('[BizPulse] Init error:', err);
      if (mounted) {
        setState((s) => ({ ...s, isLoading: false }));
      }
    }

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
    name: string;
    phoneOrEmail: string;
    password: string;
    businessName: string;
    businessType: string;
    startingCash: number;
  }) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      let accessToken = `offline_access_${Date.now()}`;
      let refreshToken = `offline_refresh_${Date.now()}`;
      try {
        const authRes = await apiSignup({
          name: payload.name,
          phone_or_email: payload.phoneOrEmail,
          password: payload.password,
        });
        accessToken = authRes.access;
        refreshToken = authRes.refresh;
      } catch (netErr) {
        console.warn('[BizPulse] Backend unreachable during signup, creating local offline account:', netErr);
      }
      storeTokens(accessToken, refreshToken);

      const biz = await createBusiness({
        name: payload.businessName,
        type: payload.businessType,
        starting_cash: payload.startingCash,
        language: 'en',
        voice_enabled: false,
      });

      setState({ isAuthenticated: true, isLoading: false, business: biz, error: null });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setState((s) => ({ ...s, isLoading: false, error: msg }));
      throw err;
    }
  }, []);

  const login = useCallback(async (phoneOrEmail: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      let accessToken = `offline_access_${Date.now()}`;
      let refreshToken = `offline_refresh_${Date.now()}`;
      try {
        const authRes = await apiLogin({ phone_or_email: phoneOrEmail, password });
        accessToken = authRes.access;
        refreshToken = authRes.refresh;
      } catch (netErr) {
        console.warn('[BizPulse] Backend unreachable during login, authenticating locally:', netErr);
      }
      storeTokens(accessToken, refreshToken);
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

  const logout = useCallback(() => {
    clearTokens();
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
