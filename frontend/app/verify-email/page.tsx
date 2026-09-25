import { Suspense } from "react";
import VerifyEmailScreen from "@/ui/screens/VerifyEmailScreen";

export const metadata = {
  title: "Verify Email — BizPulse",
};

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailScreen />
    </Suspense>
  );
}
