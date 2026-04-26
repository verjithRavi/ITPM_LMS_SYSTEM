"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { validateEmail, validatePhoneNumber, validateRequired } from "@/lib/formValidation";

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
  updatedAt?: string;
};

export default function AdminStudentDetailsPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-sm text-slate-500">Loading...</div>}>
      <AdminStudentDetailsContent />
    </Suspense>
  );
}

function AdminStudentDetailsContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const studentId = params?.id;
  const token = useMemo(() => getToken(), []);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [faculty, setFaculty] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<"PENDING" | "APPROVED">("PENDING");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function syncForm(nextStudent: Student) {
    setFullName(nextStudent.fullName || "");
    setEmail(nextStudent.email || "");
    setPhoneNumber(nextStudent.phoneNumber || "");
    setFaculty(nextStudent.faculty || "");
    setYear(nextStudent.year != null ? String(nextStudent.year) : "");
    setSemester(nextStudent.semester != null ? String(nextStudent.semester) : "");
    setApprovalStatus(nextStudent.approvalStatus);
  }

  async function load() {
    if (!token) {
      router.push("/login");
      return;
    }
    if (!studentId) return;

    setLoading(true);
    setError(null);

    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }

      const data = await apiFetch<{ student: Student }>(`/api/admin/students/${studentId}`, {}, token);
      setStudent(data.student);
      syncForm(data.student);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load student details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    if (!student) return;
    if (searchParams.get("reset") === "1") {
      setEditing(true);
    }
  }, [searchParams, student]);

  async function approveStudent() {
    if (!token || !student) return;
    setApproving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/students/${student._id}/approve`, { method: "PATCH" }, token);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve student.");
    } finally {
      setApproving(false);
    }
  }

  async function saveStudentChanges() {
    if (!token || !student) return;
    const nextErrors: Record<string, string> = {
      fullName: validateRequired(fullName),
      email: validateEmail(email),
      phoneNumber: validatePhoneNumber(phoneNumber),
      faculty: validateRequired(faculty),
      year: validateRequired(year),
      semester: validateRequired(semester),
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(
        `/api/admin/students/${student._id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phoneNumber: phoneNumber.trim(),
            faculty: faculty.trim(),
            year: Number(year),
            semester: Number(semester),
            approvalStatus,
          }),
        },
        token
      );
      setEditing(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update student.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent() {
    if (!token || !student) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/students/${student._id}`, { method: "DELETE" }, token);
      router.push("/admin/students/list");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete student.");
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4">
          <button
            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            onClick={() => router.push("/admin/students/list")}
            type="button"
          >
            Back to Students List
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

        {loading ? (
          <div className="rounded-[26px] border border-blue-100 bg-white p-5 text-sm text-slate-500 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            Loading student details...
          </div>
        ) : !student ? (
          <div className="rounded-[26px] border border-blue-100 bg-white p-5 text-sm text-slate-500 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            Student not found.
          </div>
        ) : (
          <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_70px_rgba(37,99,235,0.08)]">
            <h1 className="text-xl font-semibold text-slate-900">Student Details</h1>
            <p className="mt-1 text-sm text-slate-600">View and update student profile information.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <div className="text-xs text-blue-700">Full Name</div>
                {editing ? (
                  <input
                    className="mt-1 w-full rounded-lg border border-blue-100 bg-white p-2 text-sm text-slate-900 outline-none"
                    value={fullName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFullName(value);
                      setFieldErrors((current) => ({ ...current, fullName: validateRequired(value) }));
                    }}
                  />
                ) : (
                  <div className="text-sm font-medium text-slate-900">{student.fullName}</div>
                )}
                {editing && fieldErrors.fullName ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.fullName}</p> : null}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <div className="text-xs text-blue-700">User ID</div>
                <div className="text-sm font-medium text-slate-900">{student.userId}</div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <div className="text-xs text-blue-700">Email</div>
                {editing ? (
                  <input
                    className="mt-1 w-full rounded-lg border border-blue-100 bg-white p-2 text-sm text-slate-900 outline-none"
                    value={email}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEmail(value);
                      setFieldErrors((current) => ({ ...current, email: validateEmail(value) }));
                    }}
                    type="email"
                  />
                ) : (
                  <div className="text-sm font-medium text-slate-900">{student.email}</div>
                )}
                {editing && fieldErrors.email ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.email}</p> : null}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <div className="text-xs text-blue-700">Phone</div>
                {editing ? (
                  <input
                    className="mt-1 w-full rounded-lg border border-blue-100 bg-white p-2 text-sm text-slate-900 outline-none"
                    value={phoneNumber}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setPhoneNumber(digitsOnly);
                      setFieldErrors((current) => ({ ...current, phoneNumber: validatePhoneNumber(digitsOnly) }));
                    }}
                  />
                ) : (
                  <div className="text-sm font-medium text-slate-900">{student.phoneNumber}</div>
                )}
                {editing && fieldErrors.phoneNumber ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.phoneNumber}</p> : null}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <div className="text-xs text-blue-700">Faculty</div>
                {editing ? (
                  <input
                    className="mt-1 w-full rounded-lg border border-blue-100 bg-white p-2 text-sm text-slate-900 outline-none"
                    value={faculty}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFaculty(value);
                      setFieldErrors((current) => ({ ...current, faculty: validateRequired(value) }));
                    }}
                  />
                ) : (
                  <div className="text-sm font-medium text-slate-900">{student.faculty}</div>
                )}
                {editing && fieldErrors.faculty ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.faculty}</p> : null}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <div className="text-xs text-blue-700">Year / Semester</div>
                {editing ? (
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <input
                      className="w-full rounded-lg border border-blue-100 bg-white p-2 text-sm text-slate-900 outline-none"
                      value={year}
                      onChange={(e) => {
                        const value = e.target.value;
                        setYear(value);
                        setFieldErrors((current) => ({ ...current, year: validateRequired(value) }));
                      }}
                      placeholder="Year"
                      type="number"
                      min={1}
                    />
                    <input
                      className="w-full rounded-lg border border-blue-100 bg-white p-2 text-sm text-slate-900 outline-none"
                      value={semester}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSemester(value);
                        setFieldErrors((current) => ({ ...current, semester: validateRequired(value) }));
                      }}
                      placeholder="Semester"
                      type="number"
                      min={1}
                    />
                  </div>
                ) : (
                  <div className="text-sm font-medium text-slate-900">Y{student.year} / S{student.semester}</div>
                )}
                {editing && (fieldErrors.year || fieldErrors.semester) ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.year || fieldErrors.semester}</p> : null}
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 sm:col-span-2">
                <div className="text-xs text-blue-700">Approval Status</div>
                {editing ? (
                  <select
                    className="mt-1 w-full rounded-lg border border-blue-100 bg-white p-2 text-sm text-slate-900 outline-none"
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value as "PENDING" | "APPROVED")}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                  </select>
                ) : (
                  <div className="text-sm font-medium text-slate-900">{student.approvalStatus}</div>
                )}
              </div>

            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {editing ? (
                <>
                  <button
                    className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                    onClick={() => {
                      setEditing(false);
                      syncForm(student);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-xl border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                    onClick={saveStudentChanges}
                    disabled={saving}
                    type="button"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              ) : (
                <button
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  Edit Student
                </button>
              )}

              {student.approvalStatus === "PENDING" && !editing && (
                <button
                  className="rounded-xl border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                  onClick={approveStudent}
                  disabled={approving}
                  type="button"
                >
                  {approving ? "Approving..." : "Approve Student"}
                </button>
              )}

              <button
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={deleteStudent}
                disabled={deleting}
                type="button"
              >
                {deleting ? "Deleting..." : "Delete Student"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
