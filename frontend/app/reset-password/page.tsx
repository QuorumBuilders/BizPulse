'use client';

import { Suspense } from 'react';
import ResetPasswordScreen from '@/ui/screens/ResetPasswordScreen';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="page page--auth flex items-center justify-center">
        <div className="spinner" />
      </div>
    }>
      <ResetPasswordScreen />
    </Suspense>
  );
}
