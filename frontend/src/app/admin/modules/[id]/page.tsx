"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { validateModuleDescription, validateModuleName, validateRequired } from "@/lib/formValidation";

type User = { _id: string; role: "STUDENT" | "TUTOR" | "ADMIN" };
type ModuleItem = {
  _id: string;
  moduleCode: string;
  name: string;
  faculty: string;
  year: number;
  semester: number;
  description: string;
  assignedTutor: {
    _id: string;
    fullName: string;
    email: string;
    userId: string;
    faculty: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type TutorOption = {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
  faculty: string | null;
};

type EditableModule = {
  name: string;
  faculty: string;
  year: string;
  semester: string;
  description: string;
  assignedTutor: string;
};

type EditableModuleErrors = EditableModule;
type EditableModuleTouched = Record<keyof EditableModule, boolean>;

const FACULTIES = [
  "Faculty of Computing",
  "Faculty of Engineering",
  "Faculty of Business",
  "Faculty of Humanities & Sciences",
  "Faculty of Law",
] as const;

const YEARS = [1, 2, 3, 4] as const;
const SEMESTERS = [1, 2] as const;

const input = "w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500";
const emptyTouched: EditableModuleTouched = { name: false, faculty: false, year: false, semester: false, description: false, assignedTutor: false };

export default function AdminModuleDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const token = useMemo(() => getToken(), []);
  const [moduleItem, setModuleItem] = useState<ModuleItem | null>(null);
  const [tutors, setTutors] = useState<TutorOption[]>([]);
  const [form, setForm] = useState<EditableModule | null>(null);
  const [touched, setTouched] = useState<EditableModuleTouched>(emptyTouched);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadModule() {
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }

      const data = await apiFetch<{ module: ModuleItem }>(`/api/modules/${params.id}`, {}, token);
      setModuleItem(data.module);
      setForm({
        name: data.module.name,
        faculty: data.module.faculty,
        year: String(data.module.year),
        semester: String(data.module.semester),
        description: data.module.description,
        assignedTutor: data.module.assignedTutor?._id || "",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load module.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadModule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    async function loadTutors() {
      if (!token) return;

      try {
        const data = await apiFetch<{ tutors: Array<{ _id: string; userId: string; fullName: string; email: string; faculty: string | null }> }>(
          "/api/admin/tutors",
          {},
          token
        );
        setTutors(
          data.tutors.map((tutor) => ({
            _id: tutor._id,
            userId: tutor.userId,
            fullName: tutor.fullName,
            email: tutor.email,
            faculty: tutor.faculty,
          }))
        );
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load tutors.");
      }
    }

    void loadTutors();
  }, [token]);

  const tutorsForFaculty = form ? tutors.filter((tutor) => tutor.faculty === form.faculty) : [];

  function validateModuleForm(values: EditableModule) {
    return {
      name: validateModuleName(values.name),
      faculty: validateRequired(values.faculty),
      year: validateRequired(values.year),
      semester: validateRequired(values.semester),
      description: validateModuleDescription(values.description),
      assignedTutor: validateRequired(values.assignedTutor),
    };
  }

  const fieldErrors: EditableModuleErrors = form ? validateModuleForm(form) : { name: "", faculty: "", year: "", semester: "", description: "", assignedTutor: "" };
  const shouldShowError = (field: keyof EditableModule) => touched[field] && Boolean(fieldErrors[field]);

  async function saveModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !form) return;

    setTouched({ name: true, faculty: true, year: true, semester: true, description: true, assignedTutor: true });
    if (Object.values(fieldErrors).some(Boolean)) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<{ module: ModuleItem; message: string }>(
        `/api/modules/${params.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...form,
            year: Number(form.year),
            semester: Number(form.semester),
            assignedTutor: form.assignedTutor,
          }),
        },
        token
      );
      setModuleItem(data.module);
      setForm({
        name: data.module.name,
        faculty: data.module.faculty,
        year: String(data.module.year),
        semester: String(data.module.semester),
        description: data.module.description,
        assignedTutor: data.module.assignedTutor?._id || "",
      });
      setTouched(emptyTouched);
      setEditing(false);
      setSuccess(data.message || "Module updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update module.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteModule() {
    if (!token) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/modules/${params.id}`, { method: "DELETE" }, token);
      router.push("/admin/modules");
    } catch (err: unknown) {
      setDeleting(false);
      setError(err instanceof Error ? err.message : "Failed to delete module.");
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-white">Module Details</h1>
              <p className="mt-1 text-sm text-slate-300">View, edit, or delete this module.</p>
            </div>
            <button
              className="rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/12"
              onClick={() => router.push("/admin/modules")}
              type="button"
            >
              Back to Modules
            </button>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}
        {success && <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-700">{success}</div>}

        {loading || !moduleItem || !form ? (
          <div className="rounded-[26px] border border-white/10 bg-white/6 p-5 text-sm text-slate-300 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            Loading module...
          </div>
        ) : (
          <div className="rounded-[26px] border border-white/10 bg-white/6 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="mb-4 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                onClick={() => {
                  setEditing((current) => {
                    const nextEditing = !current;
                    if (!nextEditing && moduleItem) {
                      setForm({
                        name: moduleItem.name,
                        faculty: moduleItem.faculty,
                        year: String(moduleItem.year),
                        semester: String(moduleItem.semester),
                        description: moduleItem.description,
                        assignedTutor: moduleItem.assignedTutor?._id || "",
                      });
                    }
                    return nextEditing;
                  });
                  setTouched(emptyTouched);
                  setSuccess(null);
                  setError(null);
                }}
                type="button"
              >
                {editing ? "Cancel Edit" : "Edit Module"}
              </button>
              <button
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={deleting}
                onClick={() => void deleteModule()}
                type="button"
              >
                {deleting ? "Deleting..." : "Delete Module"}
              </button>
            </div>

            {editing ? (
              <form className="grid gap-4 md:grid-cols-2" onSubmit={saveModule}>
                <div className="md:col-span-2">
                  <input
                    className={`${input} ${shouldShowError("name") ? "border-red-400 focus:border-red-500" : ""} md:col-span-2`}
                    placeholder="Module Name"
                    value={form.name}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, name: value });
                      setTouched((current) => ({ ...current, name: true }));
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, name: true }))}
                    required
                  />
                  {shouldShowError("name") ? <p className="mt-1 text-sm text-red-300">{fieldErrors.name}</p> : null}
                </div>
                <div>
                  <select
                    className={`${input} ${shouldShowError("faculty") ? "border-red-400 focus:border-red-500" : ""}`}
                    value={form.faculty}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, faculty: value, assignedTutor: "" });
                      setTouched((current) => ({ ...current, faculty: true, assignedTutor: true }));
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, faculty: true }))}
                    required
                  >
                    <option value="">Select faculty</option>
                    {FACULTIES.map((facultyItem) => (
                      <option key={facultyItem} value={facultyItem}>
                        {facultyItem}
                      </option>
                    ))}
                  </select>
                  {shouldShowError("faculty") ? <p className="mt-1 text-sm text-red-300">{fieldErrors.faculty}</p> : null}
                </div>
                <div>
                  <select
                    className={`${input} ${shouldShowError("year") ? "border-red-400 focus:border-red-500" : ""}`}
                    value={form.year}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, year: value });
                      setTouched((current) => ({ ...current, year: true }));
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, year: true }))}
                    required
                  >
                    <option value="">Select year</option>
                    {YEARS.map((yearItem) => (
                      <option key={yearItem} value={yearItem}>
                        Year {yearItem}
                      </option>
                    ))}
                  </select>
                  {shouldShowError("year") ? <p className="mt-1 text-sm text-red-300">{fieldErrors.year}</p> : null}
                </div>
                <div>
                  <select
                    className={`${input} ${shouldShowError("semester") ? "border-red-400 focus:border-red-500" : ""}`}
                    value={form.semester}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, semester: value });
                      setTouched((current) => ({ ...current, semester: true }));
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, semester: true }))}
                    required
                  >
                    <option value="">Select semester</option>
                    {SEMESTERS.map((semesterItem) => (
                      <option key={semesterItem} value={semesterItem}>
                        Semester {semesterItem}
                      </option>
                    ))}
                  </select>
                  {shouldShowError("semester") ? <p className="mt-1 text-sm text-red-300">{fieldErrors.semester}</p> : null}
                </div>
                <div>
                  <select
                    className={`${input} ${shouldShowError("assignedTutor") ? "border-red-400 focus:border-red-500" : ""}`}
                    value={form.assignedTutor}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, assignedTutor: value });
                      setTouched((current) => ({ ...current, assignedTutor: true }));
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, assignedTutor: true }))}
                    required
                    disabled={!form.faculty}
                  >
                    <option value="">{form.faculty ? (tutorsForFaculty.length > 0 ? "Select tutor" : "No tutors available for this faculty") : "Select faculty first"}</option>
                    {tutorsForFaculty.map((tutor) => (
                      <option key={tutor._id} value={tutor._id}>
                        {tutor.fullName} ({tutor.userId})
                      </option>
                    ))}
                  </select>
                  {shouldShowError("assignedTutor") ? <p className="mt-1 text-sm text-red-300">{fieldErrors.assignedTutor}</p> : null}
                </div>
                <div className="md:col-span-2">
                  <textarea
                    className={`${input} ${shouldShowError("description") ? "border-red-400 focus:border-red-500" : ""} md:col-span-2`}
                    rows={5}
                    maxLength={200}
                    placeholder="Module Description"
                    value={form.description}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm({ ...form, description: value });
                      setTouched((current) => ({ ...current, description: true }));
                    }}
                    onBlur={() => setTouched((current) => ({ ...current, description: true }))}
                    required
                  />
                  <div className="mt-1 flex items-center justify-between gap-3">
                    {shouldShowError("description") ? <p className="text-sm text-red-300">{fieldErrors.description}</p> : null}
                    <p className="text-xs text-slate-300">{form.description.length}/200</p>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <button
                    className="rounded-xl border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
                    disabled={saving}
                    type="submit"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-2xl font-semibold text-white">{moduleItem.name}</div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      {moduleItem.moduleCode}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full bg-white/8 px-2.5 py-1">{moduleItem.faculty}</span>
                    <span className="rounded-full bg-white/8 px-2.5 py-1">Year {moduleItem.year}</span>
                    <span className="rounded-full bg-white/8 px-2.5 py-1">Semester {moduleItem.semester}</span>
                    {moduleItem.assignedTutor ? <span className="rounded-full bg-white/8 px-2.5 py-1">Tutor: {moduleItem.assignedTutor.fullName}</span> : null}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 text-sm font-semibold text-blue-700">Description</div>
                  <div className="text-sm leading-6 text-slate-300">{moduleItem.description}</div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 text-sm text-slate-300">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Created: {new Date(moduleItem.createdAt).toLocaleString()}</div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">Updated: {new Date(moduleItem.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
