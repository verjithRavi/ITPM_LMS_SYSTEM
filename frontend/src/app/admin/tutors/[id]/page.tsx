"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { validateEmail, validateFullName, validatePhoneNumber, validateRequired } from "@/lib/formValidation";

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

export default function AdminTutorDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const tutorId = params?.id;
  const token = useMemo(() => getToken(), []);

  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [faculty, setFaculty] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function syncForm(nextTutor: Tutor) {
    setFullName(nextTutor.fullName || "");
    setEmail(nextTutor.email || "");
    setPhoneNumber(nextTutor.phoneNumber || "");
    setFaculty(nextTutor.faculty || "");
  }

  async function load() {
    if (!token) {
      router.push("/login");
      return;
    }
    if (!tutorId) return;

    setLoading(true);
    setError(null);

    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }

      const data = await apiFetch<{ tutor: Tutor }>(`/api/admin/tutors/${tutorId}`, {}, token);
      setTutor(data.tutor);
      syncForm(data.tutor);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load tutor details.");
    } finally {
      setLoading(false);
    }
  }

  async function saveTutorChanges() {
    if (!token || !tutor) return;
    const nextErrors: Record<string, string> = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      phoneNumber: validatePhoneNumber(phoneNumber),
      faculty: validateRequired(faculty),
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch(
        `/api/admin/tutors/${tutor._id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phoneNumber: phoneNumber.trim(),
            faculty: faculty.trim(),
          }),
        },
        token
      );
      setEditing(false);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update tutor.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorId]);

  async function deleteTutor() {
    if (!token || !tutor) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/tutors/${tutor._id}`, { method: "DELETE" }, token);
      router.push("/admin/tutors");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete tutor.");
      setDeleting(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4">
          <button
            className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
            onClick={() => router.push("/admin/tutors")}
            type="button"
          >
            Back to Tutors
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

        {loading ? (
          <div className="rounded-[26px] border border-blue-100 bg-white p-5 text-sm text-slate-500 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            Loading tutor details...
          </div>
        ) : !tutor ? (
          <div className="rounded-[26px] border border-blue-100 bg-white p-5 text-sm text-slate-500 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            Tutor not found.
          </div>
        ) : (
          <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_70px_rgba(37,99,235,0.08)]">
            <h1 className="text-xl font-semibold text-slate-900">Tutor Details</h1>
            <p className="mt-1 text-sm text-slate-600">View full tutor profile information.</p>

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
                      setFieldErrors((current) => ({ ...current, fullName: validateFullName(value) }));
                    }}
                  />
                ) : (
                  <div className="text-sm font-medium text-slate-900">{tutor.fullName}</div>
                )}
                {editing && fieldErrors.fullName ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.fullName}</p> : null}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <div className="text-xs text-blue-700">User ID</div>
                <div className="text-sm font-medium text-slate-900">{tutor.userId}</div>
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
                  <div className="text-sm font-medium text-slate-900">{tutor.email}</div>
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
                  <div className="text-sm font-medium text-slate-900">{tutor.phoneNumber}</div>
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
                  <div className="text-sm font-medium text-slate-900">{tutor.faculty}</div>
                )}
                {editing && fieldErrors.faculty ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.faculty}</p> : null}
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                <div className="text-xs text-blue-700">Status</div>
                <div className="text-sm font-medium text-slate-900">{tutor.approvalStatus}</div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {editing ? (
                <>
                  <button
                    className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
                    onClick={() => {
                      setEditing(false);
                      syncForm(tutor);
                    }}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-xl border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                    onClick={saveTutorChanges}
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
                  Edit Tutor
                </button>
              )}
              <button
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={deleteTutor}
                disabled={deleting}
                type="button"
              >
                {deleting ? "Deleting..." : "Delete Tutor"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
