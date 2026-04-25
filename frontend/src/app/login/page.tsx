"use client";

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { saveToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import Link from "next/link";
import SystemLogo from "@/components/SystemLogo";
import { validateIdentifier, validateRequired } from "@/lib/formValidation";

type AuthResponse = {
  token: string;
  user: {
    role?: "STUDENT" | "TUTOR" | "ADMIN";
  };
};

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [registeredMessage, setRegisteredMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotSolvedMode, setForgotSolvedMode] = useState(false);
  const [forgotPendingMode, setForgotPendingMode] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string; forgotIdentifier?: string }>({});
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isRegistered = params.get("registered") === "1";
    const userId = params.get("userId")?.trim() || "";
    const email = params.get("email")?.trim() || "";

    if (isRegistered) {
      if (userId) {
        setRegisteredMessage(`Registration successful. Your User ID is ${userId}.`);
        setIdentifier(userId);
      } else if (email) {
        setRegisteredMessage("Registration successful. You can now sign in.");
        setIdentifier(email);
      }
    }
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const nextErrors = {
      identifier: validateIdentifier(identifier),
      password: validateRequired(password),
    };
    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    if (nextErrors.identifier || nextErrors.password) return;
    setLoading(true);
    try {
      const data = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      saveToken(data.token);
      if (data.user?.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else if (data.user?.role === "TUTOR") {
        router.push("/tutor/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === "APPROVAL_PENDING") {
        const responseEmail =
          err.data && typeof err.data === "object" && "email" in err.data
            ? String((err.data as { email?: unknown }).email || "")
            : "";
        const responseUserId =
          err.data && typeof err.data === "object" && "userId" in err.data
            ? String((err.data as { userId?: unknown }).userId || "")
            : "";
        const pendingEmail = responseEmail || identifier.trim();

        router.push(
          `/approval-status?email=${encodeURIComponent(pendingEmail)}&userId=${encodeURIComponent(responseUserId)}`
        );
        return;
      }
      if (err instanceof ApiError && err.code === "PASSWORD_RESET_PENDING") {
        const responseUserId =
          err.data && typeof err.data === "object" && "userId" in err.data
            ? String((err.data as { userId?: unknown }).userId || "")
            : "";
        setError(
          responseUserId
            ? `Your password reset request is pending admin approval. User ID: ${responseUserId}`
            : "Your password reset request is pending admin approval."
        );
        return;
      }
      if (err instanceof ApiError && err.code === "PASSWORD_RESET_APPROVED") {
        const responseUserId =
          err.data && typeof err.data === "object" && "userId" in err.data
            ? String((err.data as { userId?: unknown }).userId || "")
            : "";
        setError(
          responseUserId
            ? `Your password change request is approved. Login using User ID as password: ${responseUserId}`
            : "Your password change request is approved. Login using your User ID as password."
        );
        return;
      }

      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitForgotPasswordRequest() {
    setForgotError(null);
    setForgotSuccess(null);
    setForgotSolvedMode(false);
    setForgotPendingMode(false);

    if (!forgotIdentifier.trim()) {
      setFieldErrors((current) => ({ ...current, forgotIdentifier: validateIdentifier(forgotIdentifier) }));
      return;
    }

    const forgotIdentifierError = validateIdentifier(forgotIdentifier);
    setFieldErrors((current) => ({ ...current, forgotIdentifier: forgotIdentifierError }));
    if (forgotIdentifierError) return;

    setForgotLoading(true);
    try {
      const res = await apiFetch<{ message?: string; code?: string; status?: string }>(
        "/api/auth/forgot-password-request",
        {
        method: "POST",
        body: JSON.stringify({ identifier: forgotIdentifier.trim() }),
      });
      const message = res.message || "Request sent to admin.";
      setForgotSuccess(message);
      if (res.status === "APPROVED" || res.code === "PASSWORD_RESET_APPROVED") {
        setForgotSolvedMode(true);
      } else if (res.status === "PENDING") {
        setForgotPendingMode(true);
      }
      setForgotIdentifier("");
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Failed to send request.");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef5ff_0%,#f8fbff_45%,#ffffff_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <div className="grid w-full items-center gap-8">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md justify-self-center rounded-[32px] border border-blue-100 bg-white p-8 shadow-[0_24px_70px_rgba(37,99,235,0.14)]"
        >
          <div className="mb-6 space-y-3 text-center">
            <SystemLogo
              className="justify-center"
              size={88}
              labelClassName="text-slate-900"
              subtitle=""
              title="EDUPulse"
            />
            <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {registeredMessage && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              {registeredMessage}
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email or User ID</span>
              <input
                suppressHydrationWarning
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter Email or User ID"
                value={identifier}
                onChange={(e) => {
                  const value = e.target.value;
                  setIdentifier(value);
                  setFieldErrors((current) => ({ ...current, identifier: validateIdentifier(value) }));
                }}
              />
              {fieldErrors.identifier ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.identifier}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <input
                suppressHydrationWarning
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter your password"
                type="password"
                value={password}
                onChange={(e) => {
                  const value = e.target.value;
                  setPassword(value);
                  setFieldErrors((current) => ({ ...current, password: validateRequired(value) }));
                }}
              />
              {fieldErrors.password ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.password}</p> : null}
            </label>
          </div>

          <button
            suppressHydrationWarning
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <button
            className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
            type="button"
            onClick={() => {
              setForgotOpen(true);
              setForgotError(null);
              setForgotSuccess(null);
              setForgotSolvedMode(false);
              setForgotPendingMode(false);
              setForgotIdentifier(identifier.trim());
            }}
          >
            Forgot Password?
          </button>

          <p className="mt-4 text-sm text-slate-600">
            No account?{" "}
            <Link className="font-medium text-blue-700 hover:text-blue-800 hover:underline" href="/register">
              Register
            </Link>
          </p>
        </form>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_24px_70px_rgba(37,99,235,0.18)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Forgot Password Request</h3>
                {!forgotSolvedMode && !forgotPendingMode && (
                  <p className="mt-1 text-sm text-slate-500">
                    Enter your Email or User ID. This will send a reset request to admin.
                  </p>
                )}
              </div>
              <button
                className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                type="button"
                onClick={() => setForgotOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {!forgotSolvedMode && !forgotPendingMode && (
                <input
                  className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter Email or User ID"
                  value={forgotIdentifier}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForgotIdentifier(value);
                    setFieldErrors((current) => ({ ...current, forgotIdentifier: validateIdentifier(value) }));
                  }}
                />
              )}
              {!forgotSolvedMode && !forgotPendingMode && fieldErrors.forgotIdentifier ? <p className="text-xs font-medium text-red-500">{fieldErrors.forgotIdentifier}</p> : null}

              {forgotError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {forgotError}
                </div>
              )}
              {forgotSuccess && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  {forgotSuccess}
                </div>
              )}

              {forgotSolvedMode || forgotPendingMode ? (
                <button
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
                  type="button"
                  onClick={() => {
                    setForgotOpen(false);
                    setForgotSolvedMode(false);
                    setForgotPendingMode(false);
                    setForgotError(null);
                    setForgotSuccess(null);
                  }}
                >
                  Navigate to Login
                </button>
              ) : (
                <button
                  className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                  type="button"
                  disabled={forgotLoading}
                  onClick={submitForgotPasswordRequest}
                >
                  {forgotLoading ? "Sending..." : "Send Request to Admin"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
