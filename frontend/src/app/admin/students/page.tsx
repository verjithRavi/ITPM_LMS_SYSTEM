"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = {
  _id: string;
  fullName: string;
  role: "STUDENT" | "TUTOR" | "ADMIN";
};

type PendingStudent = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  faculty: string | null;
  year: number | null;
  semester: number | null;
  createdAt: string;
  approvalStatus: "PENDING" | "APPROVED";
};

type PasswordResetRequestUser = {
  _id: string;
  role: "STUDENT" | "TUTOR";
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  faculty: string | null;
  year: number | null;
  semester: number | null;
  passwordResetRequestedAt: string | null;
};

export default function AdminStudentsPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [students, setStudents] = useState<PendingStudent[]>([]);
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<PasswordResetRequestUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const userSignatureRef = useRef("");
  const pendingSignatureRef = useRef("");
  const resetRequestsSignatureRef = useRef("");

  async function loadPending(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!token) {
      router.push("/login");
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }

      const nextUserSignature = JSON.stringify([me.user._id, me.user.fullName, me.user.role]);
      if (nextUserSignature !== userSignatureRef.current) {
        userSignatureRef.current = nextUserSignature;
      }

      const [pendingData, resetReqData] = await Promise.all([
        apiFetch<{ students: PendingStudent[] }>("/api/admin/students/pending", {}, token),
        apiFetch<{ users: PasswordResetRequestUser[] }>("/api/admin/students/requests", {}, token),
      ]);

      const nextPendingSignature = JSON.stringify(
        pendingData.students.map((student) => [student._id, student.approvalStatus, student.createdAt])
      );
      const nextResetReqSignature = JSON.stringify(
        resetReqData.users.map((user) => [user._id, user.passwordResetRequestedAt])
      );

      if (nextPendingSignature !== pendingSignatureRef.current) {
        pendingSignatureRef.current = nextPendingSignature;
        setStudents(pendingData.students);
      }

      if (nextResetReqSignature !== resetRequestsSignatureRef.current) {
        resetRequestsSignatureRef.current = nextResetReqSignature;
        setPasswordResetRequests(resetReqData.users);
      }
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load students.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      void loadPending({ silent: true });
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function resetPasswordForUser() {
    if (!token || !resetTarget) return;
    setResetting(true);
    setResetError(null);
    try {
      await apiFetch(`/api/admin/users/${resetTarget._id}/reset-password`, { method: "PATCH" }, token);
      setResetTarget(null);
      setResetPasswordValue("");
      await loadPending();
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Failed to reset password.");
      setResetting(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_70px_rgba(37,99,235,0.08)]">
          <h1 className="text-xl font-semibold text-slate-900">Student Management</h1>
          <p className="mt-1 text-sm text-slate-600">Review student registrations and approve access.</p>
        </div>

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            className="rounded-xl border border-blue-200 bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
            onClick={() => router.push("/admin/students/create")}
            type="button"
          >
            Add New Student
          </button>
          <button
            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            onClick={() => router.push("/admin/students/list")}
            type="button"
          >
            View Students List
          </button>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

        <div className="mt-4 rounded-[26px] border border-blue-100 bg-white p-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <div className="mb-3 font-semibold text-slate-900">Pending Approvals</div>
          {loading ? (
            <div className="text-sm text-slate-500">Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-sm text-slate-500">No pending student registrations.</div>
          ) : (
            <div className="space-y-3">
              {students.map((student) => (
                <div key={student._id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{student.fullName}</div>
                      <div className="text-sm text-slate-600">{student.email}</div>
                      <div className="text-sm font-medium text-blue-700">User ID: {student.userId}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>
                          {student.faculty} - Y{student.year} S{student.semester} - Registered{" "}
                          {new Date(student.createdAt).toLocaleString()}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            student.approvalStatus === "APPROVED"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {student.approvalStatus}
                        </span>
                      </div>
                    </div>

                    <button
                      className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                      onClick={() => router.push(`/admin/students/${student._id}`)}
                      type="button"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[26px] border border-blue-100 bg-white p-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <div className="mb-3 font-semibold text-slate-900">Password Forgot Requests (Students & Tutors)</div>
          {loading ? (
            <div className="text-sm text-slate-500">Loading requests...</div>
          ) : passwordResetRequests.length === 0 ? (
            <div className="text-sm text-slate-500">No password reset requests.</div>
          ) : (
            <div className="space-y-3">
              {passwordResetRequests.map((requestUser) => (
                <div key={requestUser._id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{requestUser.fullName}</div>
                      <div className="text-sm text-slate-600">{requestUser.email}</div>
                      <div className="text-sm font-medium text-blue-700">
                        {requestUser.role} | User ID: {requestUser.userId}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {requestUser.faculty || "-"}
                        {requestUser.role === "STUDENT" ? ` - Y${requestUser.year} S${requestUser.semester}` : ""}
                        {" - "}Requested at{" "}
                        {requestUser.passwordResetRequestedAt
                          ? new Date(requestUser.passwordResetRequestedAt).toLocaleString()
                          : "-"}
                      </div>
                    </div>

                    <button
                      className="rounded-xl border border-blue-200 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      onClick={() => {
                        setResetTarget(requestUser);
                        setResetPasswordValue(requestUser.userId);
                        setResetError(null);
                        setResetting(false);
                      }}
                      type="button"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Change the Password For {resetTarget.userId}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Admin password reset for forgot-password request.</p>
              </div>
              <button
                className="rounded-md border border-blue-200 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                type="button"
                onClick={() => setResetTarget(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 text-xs font-medium text-blue-700">Password</div>
                <input
                  className="w-full rounded-lg border border-blue-100 bg-blue-50/40 p-2.5 text-sm text-slate-900 outline-none"
                  value={resetPasswordValue}
                  readOnly
                />
              </div>

              {resetError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{resetError}</div>
              )}

              <button
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                type="button"
                disabled={resetting}
                onClick={resetPasswordForUser}
              >
                {resetting ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
