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

type Student = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  faculty: string | null;
  year: number | null;
  semester: number | null;
  approvalStatus: "PENDING" | "APPROVED";
  createdAt: string;
};

export default function AdminStudentsListPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const userSignatureRef = useRef("");
  const studentsSignatureRef = useRef("");

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

      const data = await apiFetch<{ students: Student[] }>("/api/admin/students", {}, token);
      const nextStudentsSignature = JSON.stringify(
        data.students.map((student) => [
          student._id,
          student.userId,
          student.approvalStatus,
          student.createdAt,
        ])
      );
      if (nextStudentsSignature !== studentsSignatureRef.current) {
        studentsSignatureRef.current = nextStudentsSignature;
        setStudents(data.students);
      }
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load student list.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
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

  async function deleteStudent(studentId: string) {
    if (!token) return;
    setDeletingId(studentId);
    setError(null);
    try {
      await apiFetch(`/api/admin/students/${studentId}`, { method: "DELETE" }, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete student.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_70px_rgba(37,99,235,0.08)]">
            <h1 className="text-xl font-semibold text-slate-900">All Students</h1>
            <p className="mt-1 text-sm text-slate-600">
              Full student list with detail and delete actions.
            </p>
          </div>

          {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

          <div className="mt-4 rounded-[26px] border border-blue-100 bg-white p-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            {loading ? (
              <div className="text-sm text-slate-500">Loading student list...</div>
            ) : students.length === 0 ? (
              <div className="text-sm text-slate-500">No students found.</div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => (
                  <div key={student._id} className="rounded-2xl border border-blue-100 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">{student.fullName}</div>
                        <div className="text-sm text-slate-600">
                          {student.email} | {student.phoneNumber}
                        </div>
                        <div className="text-sm font-medium text-blue-700">User ID: {student.userId}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>
                            {student.faculty} - Y{student.year} S{student.semester}
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

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                          onClick={() => router.push(`/admin/students/${student._id}`)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                          onClick={() => router.push(`/admin/students/${student._id}`)}
                          type="button"
                        >
                          View Details
                        </button>
                        <button
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                          onClick={() => deleteStudent(student._id)}
                          disabled={deletingId === student._id}
                          type="button"
                        >
                          {deletingId === student._id ? "Deleting..." : "Delete"}
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
