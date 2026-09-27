import { Suspense } from 'react';
import VerifyEmailPendingScreen from '@/ui/screens/VerifyEmailPendingScreen';

export const metadata = {
  title: 'Check Your Email — BizPulse',
};

export default function VerifyEmailPendingPage() {
  return (
    <Suspense>
      <VerifyEmailPendingScreen />
    </Suspense>
  );
}
