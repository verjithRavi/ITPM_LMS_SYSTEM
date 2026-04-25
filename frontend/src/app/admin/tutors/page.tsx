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

type Tutor = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  faculty: string | null;
  approvalStatus: "PENDING" | "APPROVED";
  createdAt: string;
  updatedAt?: string;
};

export default function AdminTutorsPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userSignatureRef = useRef("");
  const tutorsSignatureRef = useRef("");

  async function load(options?: { silent?: boolean }) {
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

      const data = await apiFetch<{ tutors: Tutor[] }>("/api/admin/tutors", {}, token);
      const nextTutorsSignature = JSON.stringify(
        data.tutors.map((tutor) => [tutor._id, tutor.userId, tutor.fullName, tutor.updatedAt])
      );
      if (nextTutorsSignature !== tutorsSignatureRef.current) {
        tutorsSignatureRef.current = nextTutorsSignature;
        setTutors(data.tutors);
      }
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load tutors.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      void load({ silent: true });
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function deleteTutor(tutorId: string) {
    if (!token) return;
    setDeletingId(tutorId);
    setError(null);
    try {
      await apiFetch(`/api/admin/tutors/${tutorId}`, { method: "DELETE" }, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete tutor.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_70px_rgba(37,99,235,0.08)]">
          <h1 className="text-xl font-semibold text-slate-900">Tutor Management</h1>
          <p className="mt-1 text-sm text-slate-600">Only admins can create tutor accounts.</p>
        </div>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

        <div className="flex justify-start">
          <button
            className="rounded-xl border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => router.push("/admin/tutors/create")}
            type="button"
          >
            Create New Tutor
          </button>
        </div>

        <div className="rounded-[26px] border border-blue-100 bg-white p-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <div className="mb-3 font-semibold text-slate-900">Tutors List</div>
          {loading ? (
            <div className="text-sm text-slate-500">Loading tutors...</div>
          ) : tutors.length === 0 ? (
            <div className="text-sm text-slate-500">No tutors found.</div>
          ) : (
            <div className="space-y-3">
              {tutors.map((tutor) => (
                <div key={tutor._id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{tutor.fullName}</div>
                      <div className="text-sm text-slate-600">{tutor.email}</div>
                      <div className="text-sm text-slate-600">{tutor.faculty}</div>
                      <div className="text-sm font-medium text-blue-700">User ID: {tutor.userId}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                        onClick={() => router.push(`/admin/tutors/${tutor._id}`)}
                        type="button"
                      >
                        View Details
                      </button>
                      <button
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                        onClick={() => deleteTutor(tutor._id)}
                        disabled={deletingId === tutor._id}
                        type="button"
                      >
                        {deletingId === tutor._id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
