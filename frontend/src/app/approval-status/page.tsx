"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";

type ApprovalStatus = "PENDING" | "APPROVED" | "NOT_FOUND";

type ApprovalStatusResponse = {
  email: string;
  userId?: string;
  approvalStatus: ApprovalStatus;
  isApproved: boolean;
};

export default function ApprovalStatusPage() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  const [status, setStatus] = useState<ApprovalStatus>("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusSignatureRef = useRef("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email")?.trim() || "");
    setUserId(params.get("userId")?.trim() || "");
  }, []);

  async function loadStatus(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    const identifier = userId || email;
    if (!identifier) {
      setError("Email or User ID is missing. Please login again.");
      setLoading(false);
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const data = await apiFetch<ApprovalStatusResponse>(
        `/api/auth/approval-status?identifier=${encodeURIComponent(identifier)}`
      );
      setEmail(data.email || email);
      setUserId(data.userId || userId);
      const nextSignature = `${data.email}|${data.userId || ""}|${data.approvalStatus}`;
      if (nextSignature !== statusSignatureRef.current) {
        statusSignatureRef.current = nextSignature;
        setStatus(data.approvalStatus);
      }
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to check approval status.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, userId]);

  useEffect(() => {
    if ((!email && !userId) || status !== "PENDING") return;

    const id = setInterval(() => {
      void loadStatus({ silent: true });
    }, 10000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, userId, status]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-2xl border border-blue-100 bg-white p-8 shadow-[0_10px_40px_-15px_rgba(30,64,175,0.35)]">
          <h1 className="text-2xl font-semibold text-slate-900">Student Registration Status</h1>

          <p className="mt-2 text-sm text-slate-600">
            Account: <span className="font-medium">{email || "Unknown"}</span>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            User ID: <span className="font-medium">{userId || "Unknown"}</span>
          </p>

          {loading && <p className="mt-6 text-slate-700">Checking approval status...</p>}

          {!loading && error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && status === "PENDING" && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="font-medium text-amber-900">Processing...</p>
              <p className="mt-1 text-sm text-amber-800">
                Your registration is waiting for admin approval. You cannot log in until approval is completed.
              </p>
            </div>
          )}

          {!loading && !error && status === "APPROVED" && (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-medium text-emerald-900">Student registration successful.</p>
              <p className="mt-1 text-sm text-emerald-800">
                Admin approval is complete. You can now log in to your account.
              </p>
            </div>
          )}

          {!loading && !error && status === "NOT_FOUND" && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Student account not found.</p>
              <p className="mt-1 text-sm text-slate-700">
                Please register first, or check whether the email address is correct.
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              href="/login"
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
