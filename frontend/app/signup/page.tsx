'use client';

import { Suspense } from 'react';
import SignupScreen from '@/ui/screens/SignupScreen';

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupScreen />
    </Suspense>
  );
}
