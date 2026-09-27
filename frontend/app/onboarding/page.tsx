'use client';

import { Suspense } from 'react';
import OnboardingScreen from '@/ui/screens/OnboardingScreen';
import { useBusiness } from '@/state/useBusiness';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const { business, saveBusiness } = useBusiness();
  const router = useRouter();

  const handleComplete = async (patch: any) => {
    await saveBusiness(patch);
    router.replace('/dashboard');
  };

  return (
    <Suspense>
      <OnboardingScreen onComplete={handleComplete} />
    </Suspense>
  );
}
