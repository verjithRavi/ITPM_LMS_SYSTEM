"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Role = "ADMIN" | "STUDENT" | "TUTOR";
type PageRole = "admin" | "student" | "tutor";

type User = {
  _id: string;
  role: Role;
  fullName?: string;
};

type FeedbackItem = {
  _id: string;
  role: "STUDENT" | "TUTOR";
  subject: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  user: {
    _id: string;
    userId: string;
    fullName: string;
    email: string;
    faculty: string | null;
  } | null;
};

type FeedbackForm = {
  subject: string;
  message: string;
};

type FormErrors = Partial<Record<keyof FeedbackForm, string>>;

const emptyForm: FeedbackForm = {
  subject: "",
  message: "",
};

function badgeClass(role: FeedbackItem["role"]) {
  return role === "STUDENT" ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700";
}

export default function FeedbackCenter({ role }: { role: PageRole }) {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<FeedbackForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [roleFilter, setRoleFilter] = useState<"ALL" | "STUDENT" | "TUTOR">("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);

  const expectedRole: Role = role === "admin" ? "ADMIN" : role === "student" ? "STUDENT" : "TUTOR";

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (role === "admin" && roleFilter !== "ALL" && item.role !== roleFilter) return false;
      return true;
    });
  }, [items, role, roleFilter]);

  const summary = useMemo(() => {
    return {
      total: items.length,
      student: items.filter((item) => item.role === "STUDENT").length,
      tutor: items.filter((item) => item.role === "TUTOR").length,
    };
  }, [items]);

  function validateForm(values: FeedbackForm) {
    const errors: FormErrors = {};
    if (!values.subject.trim()) errors.subject = "Subject is required.";
    if (!values.message.trim()) errors.message = "Message is required.";
    return errors;
  }

  async function load() {
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role !== expectedRole) {
        router.push("/login");
        return;
      }
      setUser(me.user);

      const data = await apiFetch<{ feedbacks: FeedbackItem[] }>("/api/feedbacks", {}, token);
      setItems(data.feedbacks);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load feedbacks.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitFeedback() {
    if (!token) return;

    const validation = validateForm(form);
    setFormErrors(validation);
    setSuccess(null);
    setError(null);
    if (Object.keys(validation).length > 0) return;

    setSaving(true);
    try {
      const isEditing = Boolean(editingId);
      const data = await apiFetch<{ feedback: FeedbackItem; message: string }>(
        isEditing ? `/api/feedbacks/${editingId}` : "/api/feedbacks",
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify({
            subject: form.subject.trim(),
            message: form.message.trim(),
          }),
        },
        token
      );
      setItems((current) =>
        isEditing
          ? current.map((item) => (item._id === data.feedback._id ? data.feedback : item))
          : [data.feedback, ...current]
      );
      setForm(emptyForm);
      setEditingId(null);
      setFormErrors({});
      setSuccess(data.message || (isEditing ? "Feedback updated successfully." : "Feedback submitted successfully."));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${editingId ? "update" : "submit"} feedback.`);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item: FeedbackItem) {
    setEditingId(item._id);
    setForm({ subject: item.subject, message: item.message });
    setFormErrors({});
    setSuccess(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormErrors({});
  }

  async function removeFeedback(id: string) {
    if (!token) return;

    setDeletingId(id);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<{ message: string }>(`/api/feedbacks/${id}`, { method: "DELETE" }, token);
      setItems((current) => current.filter((item) => item._id !== id));
      if (editingId === id) {
        cancelEdit();
      }
      setSuccess(data.message || "Feedback deleted successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete feedback.");
    } finally {
      setDeletingId(null);
    }
  }

  const introTitle =
    role === "admin" ? "Feedback Management" : role === "student" ? "Share Student Feedback" : "Share Tutor Feedback";
  const introText =
    role === "admin"
      ? "Review all feedback submitted by students and tutors from one place."
      : "Share your system feedback with the admin team.";

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_70px_rgba(37,99,235,0.08)]">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-blue-700">
            {role === "admin" ? "Feedback Center" : "Feedback"}
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{introTitle}</h1>
          <p className="mt-1 text-sm text-slate-600">{introText}</p>
        </div>

        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div> : null}
        {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">{success}</div> : null}

        {role === "admin" ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-blue-700">Total</div>
                <div className="mt-3 text-3xl font-semibold text-slate-900">{summary.total}</div>
              </div>
              <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-blue-700">Students</div>
                <div className="mt-3 text-3xl font-semibold text-slate-900">{summary.student}</div>
              </div>
              <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-blue-700">Tutors</div>
                <div className="mt-3 text-3xl font-semibold text-slate-900">{summary.tutor}</div>
              </div>
            </div>

            <div className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">All Feedback</div>
                  <p className="mt-1 text-sm text-slate-600">Review submitted feedback from the system.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select
                    className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as "ALL" | "STUDENT" | "TUTOR")}
                  >
                    <option value="ALL">All roles</option>
                    <option value="STUDENT">Students</option>
                    <option value="TUTOR">Tutors</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="text-sm text-slate-500">Loading feedbacks...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/40 p-5 text-sm text-slate-500">
                    No feedbacks found for the selected filters.
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div key={item._id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-semibold text-slate-900">{item.subject}</div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(item.role)}`}>
                              {item.role}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">{item.message}</div>
                          <div className="text-xs text-slate-500">
                            {item.user?.fullName || "Unknown"} {item.user?.userId ? `(${item.user.userId})` : ""}
                            {item.user?.email ? ` | ${item.user.email}` : ""}
                            {item.user?.faculty ? ` | ${item.user.faculty}` : ""}
                          </div>
                        </div>
                        <div className="text-sm text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1.1fr)]">
            <div className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
              <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">Send Feedback</div>
              <p className="mt-1 text-sm text-slate-600">
                {editingId
                  ? "Edit your selected feedback entry."
                  : user?.fullName
                    ? `Signed in as ${user.fullName}.`
                    : "Send your feedback to admin."}
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Subject</label>
                  <input
                    className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                    value={form.subject}
                    onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))}
                    placeholder="Brief title for your feedback"
                  />
                  {formErrors.subject ? <p className="mt-1 text-xs font-medium text-red-500">{formErrors.subject}</p> : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Message</label>
                  <textarea
                    className="min-h-[160px] w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400"
                    value={form.message}
                    onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                    placeholder="Tell admin what should be improved or what issue you found."
                  />
                  {formErrors.message ? <p className="mt-1 text-xs font-medium text-red-500">{formErrors.message}</p> : null}
                </div>

                <button
                  type="button"
                  onClick={() => void submitFeedback()}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {saving ? (editingId ? "Updating..." : "Submitting...") : editingId ? "Update Feedback" : "Submit Feedback"}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="ml-3 rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-blue-50"
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </div>

            <div className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">Your Feedback History</div>
                  <p className="mt-1 text-sm text-slate-600">Previously submitted feedback entries.</p>
                </div>
                <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {loading ? "..." : `${items.length} item${items.length === 1 ? "" : "s"}`}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="text-sm text-slate-500">Loading feedback history...</div>
                ) : items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/40 p-5 text-sm text-slate-500">
                    No feedback submitted yet.
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item._id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                      <div className="font-semibold text-slate-900">{item.subject}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="rounded-lg border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeFeedback(item._id)}
                            disabled={deletingId === item._id}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletingId === item._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
