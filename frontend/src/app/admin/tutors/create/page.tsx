"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { validateEmail, validateFullName, validatePassword, validatePhoneNumber, validateRequired } from "@/lib/formValidation";

const FACULTIES = [
  "Faculty of Computing",
  "Faculty of Engineering",
  "Faculty of Business",
  "Faculty of Humanities & Sciences",
  "Faculty of Law",
] as const;

export default function AdminCreateTutorPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [faculty, setFaculty] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function createTutor(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) {
      router.push("/login");
      return;
    }

    setCreating(true);
    setError(null);
    const nextErrors: Record<string, string> = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      phoneNumber: validatePhoneNumber(phoneNumber),
      password: validatePassword(password),
      faculty: validateRequired(faculty),
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      setCreating(false);
      return;
    }
    try {
      await apiFetch(
        "/api/admin/tutors",
        {
          method: "POST",
          body: JSON.stringify({
            fullName: fullName.trim(),
            email: email.trim(),
            phoneNumber: phoneNumber.trim(),
            password,
            faculty,
          }),
        },
        token
      );
      router.push("/admin/tutors");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create tutor.");
      setCreating(false);
    }
  }

  return (
    <div className="px-4 py-6 md:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_20px_60px_rgba(37,99,235,0.08)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                Tutor Management
              </span>
              <h1 className="mt-3 text-2xl font-semibold text-slate-900">Create New Tutor</h1>
              <p className="mt-2 text-sm text-slate-600">Add a new tutor account using the same clean admin form style.</p>
            </div>
            <button
              className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
              onClick={() => router.push("/admin/tutors")}
              type="button"
            >
              Back to Tutor List
            </button>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">{error}</div>}

        <form onSubmit={createTutor} className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <div className="mb-6 flex flex-col gap-2 border-b border-blue-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">Tutor Details</h2>
            <p className="text-sm text-slate-500">Fill in the tutor information below to create the account.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <input
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => {
                  const value = e.target.value;
                  setFullName(value);
                  setFieldErrors((current) => ({ ...current, fullName: validateFullName(value) }));
                }}
                required
              />
              {fieldErrors.fullName ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.fullName}</p> : null}
            </div>
            <div>
              <input
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => {
                  const value = e.target.value;
                  setEmail(value);
                  setFieldErrors((current) => ({ ...current, email: validateEmail(value) }));
                }}
                required
              />
              {fieldErrors.email ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.email}</p> : null}
            </div>
            <div>
              <input
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                placeholder="Phone number"
                value={phoneNumber}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhoneNumber(digitsOnly);
                  setFieldErrors((current) => ({ ...current, phoneNumber: validatePhoneNumber(digitsOnly) }));
                }}
                required
              />
              {fieldErrors.phoneNumber ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.phoneNumber}</p> : null}
            </div>
            <div>
              <input
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white"
                placeholder="Temporary password"
                type="password"
                value={password}
                onChange={(e) => {
                  const value = e.target.value;
                  setPassword(value);
                  setFieldErrors((current) => ({ ...current, password: validatePassword(value) }));
                }}
                required
              />
              {fieldErrors.password ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.password}</p> : null}
            </div>
            <div className="md:col-span-2">
              <select
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
                value={faculty}
                onChange={(e) => {
                  const value = e.target.value;
                  setFaculty(value);
                  setFieldErrors((current) => ({ ...current, faculty: validateRequired(value) }));
                }}
                required
              >
                <option value="">Select faculty</option>
                {FACULTIES.map((facultyItem) => (
                  <option key={facultyItem} value={facultyItem}>
                    {facultyItem}
                  </option>
                ))}
              </select>
              {fieldErrors.faculty ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.faculty}</p> : null}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              className="rounded-2xl border border-blue-600 bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              type="submit"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Tutor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
