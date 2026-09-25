"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmail, AuthApiError } from "@/api/authApi";

type Status = "idle" | "verifying" | "success" | "error";

export default function VerifyEmailScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token found in the link. Please use the link from your email.");
      return;
    }

    let cancelled = false;
    setStatus("verifying");

    (async () => {
      try {
        await verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof AuthApiError) {
          const detail = typeof err.details?.detail === "string" ? err.details.detail : "";
          setErrorMessage(detail || err.message || "Verification failed. The link may have expired.");
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Could not reach the server. Check your connection.");
        }
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="verify-email-page">
      <div className="verify-email-card">
        {/* Logo / brand */}
        <div className="verify-email-brand">
          <span className="verify-email-logo">BP</span>
          <span className="verify-email-brand-name">BizPulse</span>
        </div>

        {status === "idle" || status === "verifying" ? (
          <>
            <div className="verify-email-spinner" aria-label="Verifying…" />
            <h1 className="verify-email-title">Verifying your email…</h1>
            <p className="verify-email-body">Please wait a moment.</p>
          </>
        ) : status === "success" ? (
          <>
            <div className="verify-email-icon verify-email-icon--success" aria-hidden="true">
              ✓
            </div>
            <h1 className="verify-email-title">Email verified!</h1>
            <p className="verify-email-body">
              Your email address has been confirmed. You can now log in to BizPulse.
            </p>
            <button
              className="verify-email-btn"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </button>
          </>
        ) : (
          <>
            <div className="verify-email-icon verify-email-icon--error" aria-hidden="true">
              ✕
            </div>
            <h1 className="verify-email-title">Verification failed</h1>
            <p className="verify-email-body">{errorMessage}</p>
            <button
              className="verify-email-btn verify-email-btn--secondary"
              onClick={() => router.push("/login")}
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
