import { Suspense } from "react";
import VerifyEmailScreen from "@/ui/screens/VerifyEmailScreen";

export const metadata = {
  title: "Verify Email — BizPulse",
};

// This route exists as a workaround: the backend's register_user service
// generates email links pointing to /auth/verify_email instead of /verify-email.
// Both routes render the exact same component until the backend is fixed.
export default function VerifyEmailLegacyPage() {
  return (
    <Suspense>
      <VerifyEmailScreen />
    </Suspense>
  );
}
