"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { validateEmail, validatePhoneNumber, validateRequired } from "@/lib/formValidation";

type Role = "STUDENT" | "TUTOR" | "ADMIN";
type RegisterResponse = {
  token?: string;
  requiresApproval?: boolean;
  user?: {
    email?: string;
    userId?: string;
    role?: Role;
  };
};

const FACULTIES = [
  "Faculty of Computing",
  "Faculty of Engineering",
  "Faculty of Business",
  "Faculty of Humanities & Sciences",
  "Faculty of Law",
] as const;

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.76 21.76 0 0 1-5.17 5.94" />
      <path d="M6.61 6.61A21.75 21.75 0 0 0 1 12s4 7 11 7a10.94 10.94 0 0 0 4.09-.78" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [role, setRole] = useState<Role>("STUDENT");
  const [faculty, setFaculty] = useState("");
  const [year, setYear] = useState<number>(2);
  const [semester, setSemester] = useState<number>(1);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isStudent = role === "STUDENT";
  const needsFaculty = isStudent;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const nextErrors: Record<string, string> = {
      fullName: validateRequired(fullName),
      email: validateEmail(email),
      phoneNumber: validatePhoneNumber(phoneNumber),
      password: validateRequired(password),
      confirmPassword: validateRequired(confirmPassword),
      role: validateRequired(role),
      faculty: needsFaculty ? validateRequired(faculty) : "",
      year: isStudent && year < 1 ? "This field is required." : "",
      semester: isStudent && semester < 1 ? "This field is required." : "",
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }
    if (needsFaculty && !faculty) {
      setError("Please select a faculty.");
      return;
    }
    if (isStudent && (year < 1 || semester < 1)) {
      setError("Year and semester must be 1 or higher.");
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
        role,
      };

      if (isStudent) {
        payload.faculty = faculty;
        payload.year = year;
        payload.semester = semester;
      }

      const data = await apiFetch<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const registeredEmail = data.user?.email ?? email.trim();
      const registeredUserId = data.user?.userId ?? "";
      if (data.requiresApproval || data.user?.role === "STUDENT") {
        router.push(
          `/approval-status?email=${encodeURIComponent(registeredEmail)}&userId=${encodeURIComponent(registeredUserId)}`
        );
        return;
      }

      router.push(
        `/login?registered=1&email=${encodeURIComponent(registeredEmail)}&userId=${encodeURIComponent(registeredUserId)}`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-8 shadow-[0_10px_40px_-15px_rgba(30,64,175,0.35)]"
        >
          <div className="mb-6 space-y-1 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Create account</h2>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => {
                  const value = e.target.value;
                  setFullName(value);
                  setFieldErrors((current) => ({ ...current, fullName: validateRequired(value) }));
                }}
                required
              />
              {fieldErrors.fullName ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.fullName}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="you@university.edu"
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
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Phone number</span>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="+94 77 123 4567"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setPhoneNumber(digitsOnly);
                  setFieldErrors((current) => ({ ...current, phoneNumber: validatePhoneNumber(digitsOnly) }));
                }}
                required
              />
              {fieldErrors.phoneNumber ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.phoneNumber}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 pr-10 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPassword(value);
                    setFieldErrors((current) => ({ ...current, password: validateRequired(value) }));
                  }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.password ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.password}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Confirm password</span>
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 pr-10 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="Re-enter your password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setConfirmPassword(value);
                    setFieldErrors((current) => ({ ...current, confirmPassword: validateRequired(value) }));
                  }}
                  required
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.confirmPassword ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.confirmPassword}</p> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={role}
                onChange={(e) => {
                  const value = e.target.value as Role;
                  setRole(value);
                  setFieldErrors((current) => ({ ...current, role: validateRequired(value) }));
                }}
              >
                <option value="STUDENT">Student</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Student and admin self-registration are enabled. Tutor accounts are created by admins.
            </div>

            {needsFaculty && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Faculty</span>
                <select
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              </label>
            )}

            {isStudent && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Year</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    type="number"
                    min={1}
                    value={year}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setYear(value);
                      setFieldErrors((current) => ({ ...current, year: value < 1 ? "This field is required." : "" }));
                    }}
                    required
                  />
                  {fieldErrors.year ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.year}</p> : null}
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Semester</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    type="number"
                    min={1}
                    value={semester}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setSemester(value);
                      setFieldErrors((current) => ({ ...current, semester: value < 1 ? "This field is required." : "" }));
                    }}
                    required
                  />
                  {fieldErrors.semester ? <p className="mt-1 text-xs font-medium text-red-500">{fieldErrors.semester}</p> : null}
                </label>
              </div>
            )}
          </div>

          <button
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={loading}
            type="submit"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          <p className="mt-4 text-sm text-slate-600">
            Have an account?{" "}
            <Link className="font-medium text-blue-700 hover:text-blue-800 hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
