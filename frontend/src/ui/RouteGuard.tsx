'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBusiness } from '@/state/useBusiness';

interface RouteGuardProps {
  children: React.ReactNode;
}

const PUBLIC_AUTH_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset_password',
  '/reset-password',
  '/verify_email',
  '/verify-email',
  '/auth/verify_email',
  '/verify-email-pending',
];

export default function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, business } = useBusiness();

  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}?`));
    const hasBusiness = !!business;

    if (!isAuthenticated) {
      // Unauthenticated users attempting to access protected routes go to /login
      if (!isPublic) {
        router.replace('/login');
      }
    } else if (!hasBusiness) {
      // Authenticated but no business in local IndexedDB -> must complete onboarding
      if (pathname !== '/onboarding' && !pathname.includes('verify')) {
        router.replace('/onboarding');
      }
    } else {
      // Authenticated with business -> skip auth and onboarding screens
      if (pathname === '/login' || pathname === '/signup' || pathname === '/onboarding' || pathname === '/verify-email-pending') {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, business, pathname, router]);

  // Loading / bootstrap state: resolves auth first, never flashing wrong screens
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="auth-logo__icon" style={{ width: 44, height: 44, fontSize: '1.5rem' }}>📊</div>
          <div className="spinner" />
          <p className="text-muted text-sm">Loading BizPulse…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
