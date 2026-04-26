"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
  validatePhoneNumber,
  validateRequired,
} from "@/lib/formValidation";

export type ProfileUser = {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  userId?: string;
  role: "STUDENT" | "TUTOR" | "ADMIN";
  faculty?: string | null;
  year?: number | null;
  semester?: number | null;
  dpUrl?: string | null;
  forcePasswordChange?: boolean;
};

type ProfileMenuProps = {
  user: ProfileUser | null;
  roleLabel: string;
  accent: "emerald" | "purple" | "blue";
  onUserUpdated: (user: ProfileUser) => void;
  onLogout: () => void;
};

const ACCENT_STYLES = {
  emerald: {
    ring: "border-blue-100",
    softBg: "bg-blue-50",
    text: "text-blue-700",
    solid: "bg-blue-100",
    softHover: "hover:bg-blue-100",
    modalButton: "bg-blue-600 text-white hover:bg-blue-700",
    subtleButton: "border-blue-100 bg-white text-slate-700 hover:bg-blue-50",
  },
  purple: {
    ring: "border-blue-100",
    softBg: "bg-blue-50",
    text: "text-blue-700",
    solid: "bg-blue-100",
    softHover: "hover:bg-blue-100",
    modalButton: "bg-blue-600 text-white hover:bg-blue-700",
    subtleButton: "border-blue-100 bg-white text-slate-700 hover:bg-blue-50",
  },
  blue: {
    ring: "border-transparent",
    softBg: "bg-white",
    text: "text-blue-700",
    solid: "bg-blue-100",
    softHover: "hover:bg-slate-50",
    modalButton: "bg-blue-600 text-white hover:bg-blue-700",
    subtleButton: "border-blue-100 bg-white text-slate-700 hover:bg-blue-50",
  },
} as const;

function getInitials(fullName?: string | null) {
  const words = (fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length === 0) return "?";
  return words.map((word) => word[0]?.toUpperCase() || "").join("");
}

function Avatar({
  user,
  size = "md",
  accent,
}: {
  user: ProfileUser | null;
  size?: "sm" | "md" | "lg";
  accent: keyof typeof ACCENT_STYLES;
}) {
  const styles = ACCENT_STYLES[accent];
  const dimensions =
    size === "sm" ? "h-10 w-10 text-sm" : size === "lg" ? "h-24 w-24 text-2xl" : "h-11 w-11 text-sm";

  if (user?.dpUrl) {
    return (
      <div
        className={`overflow-hidden rounded-full border ${styles.ring} ${dimensions} bg-blue-50`}
        style={{
          backgroundImage: `url("${user.dpUrl}")`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full border ${styles.ring} ${styles.softBg} ${styles.text} ${dimensions} font-semibold`}
    >
      {getInitials(user?.fullName)}
    </div>
  );
}

export default function ProfileMenu({ user, roleLabel, accent, onUserUpdated, onLogout }: ProfileMenuProps) {
  const styles = ACCENT_STYLES[accent];
  const isAdminTheme = accent === "blue";
  const isTutorTheme = accent === "purple";
  const isStudentTheme = accent === "emerald";
  const canChangeRestrictedFields = user?.role === "ADMIN";
  const showPasswordSection = user?.role === "STUDENT" || user?.role === "TUTOR";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    faculty: "",
    year: "",
    semester: "",
    dpUrl: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setForm({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phoneNumber: user?.phoneNumber || "",
      faculty: user?.faculty || "",
      year: user?.year != null ? String(user.year) : "",
      semester: user?.semester != null ? String(user.semester) : "",
      dpUrl: user?.dpUrl || "",
    });
  }, [user]);

  const details = useMemo(() => {
    if (!user) return [];

    const entries = [
      { label: "User ID", value: user.userId || "-" },
      { label: "Email", value: user.email || "-" },
      { label: "Phone", value: user.phoneNumber || "-" },
    ];

    if (user.role === "STUDENT") {
      entries.push(
        { label: "Faculty", value: user.faculty || "-" },
        { label: "Year", value: user.year != null ? String(user.year) : "-" },
        { label: "Semester", value: user.semester != null ? String(user.semester) : "-" }
      );
    }

    if (user.role === "TUTOR") {
      entries.push({ label: "Faculty", value: user.faculty || "-" });
    }

    return entries;
  }, [user]);

  async function saveProfile() {
    const token = getToken();
    if (!token || !user) return;
    const nextErrors: Record<string, string> = {
      fullName: validateFullName(form.fullName),
      email: validateEmail(form.email),
      phoneNumber: validatePhoneNumber(form.phoneNumber),
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: Record<string, string | number | null> = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        dpUrl: form.dpUrl.trim() || null,
      };

      if (canChangeRestrictedFields && user.role === "STUDENT") {
        payload.faculty = form.faculty.trim();
        payload.year = form.year ? Number(form.year) : null;
        payload.semester = form.semester ? Number(form.semester) : null;
      }

      if (canChangeRestrictedFields && user.role === "TUTOR") {
        payload.faculty = form.faculty.trim();
      }

      const data = await apiFetch<{ user: ProfileUser }>(
        "/api/me/profile",
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
        token
      );

      onUserUpdated(data.user);
      setSuccess("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    const token = getToken();
    if (!token) return;

    const nextPasswordErrors: Record<string, string> = {
      currentPassword: validateRequired(passwordForm.currentPassword),
      newPassword: validatePassword(passwordForm.newPassword),
      confirmPassword: validateConfirmPassword(passwordForm.newPassword, passwordForm.confirmPassword),
    };
    setPasswordFieldErrors(nextPasswordErrors);
    if (Object.values(nextPasswordErrors).some(Boolean)) {
      return;
    }

    setChangingPassword(true);
    setError(null);
    setSuccess(null);

    try {
      await apiFetch(
        "/api/me/change-password",
        {
          method: "PATCH",
          body: JSON.stringify({
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword,
          }),
        },
        token
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setPasswordFieldErrors({});
      setSuccess("Password changed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleProfileImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("Profile image must be smaller than 3 MB.");
      event.target.value = "";
      return;
    }

    try {
      const fileDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Failed to read image."));
        reader.readAsDataURL(file);
      });

      setForm((current) => ({ ...current, dpUrl: fileDataUrl }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile image.");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          className={`flex items-center gap-3 rounded-2xl border ${styles.ring} ${styles.softBg} px-2 py-2 text-left ${styles.softHover}`}
          type="button"
          onClick={() => setOpen((current) => !current)}
        >
          <Avatar accent={accent} user={user} />
          <div className="hidden min-w-0 sm:block">
            <div className={`text-[11px] uppercase tracking-wide ${styles.text}`}>{roleLabel}</div>
            <div className={`max-w-40 truncate text-sm font-semibold ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-900" : "text-slate-900"}`}>
              {user?.fullName || roleLabel}
            </div>
          </div>
          <svg viewBox="0 0 20 20" className={`h-4 w-4 ${styles.text}`} fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.512a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && user && (
          <div
            className={`absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl p-4 shadow-2xl ${
              isAdminTheme
                ? "border border-blue-100 bg-white"
                : isTutorTheme
                  ? "border border-blue-100 bg-white"
                : isStudentTheme
                  ? "border border-blue-100 bg-white"
                  : "border border-slate-200 bg-white"
            }`}
          >
            <div className={`mb-4 flex items-center gap-3 rounded-xl p-3 ${isAdminTheme || isTutorTheme || isStudentTheme ? "bg-blue-50" : "bg-slate-50"}`}>
              <Avatar accent={accent} user={user} size="lg" />
              <div className="min-w-0">
                <div className={`truncate text-base font-semibold ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-900" : "text-slate-900"}`}>
                  {user.fullName || roleLabel}
                </div>
                <div className={`mt-1 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-500" : "text-slate-500"}`}>
                  {user.email || roleLabel}
                </div>
              </div>
            </div>

            <div className={`grid gap-2 rounded-xl p-3 ${isAdminTheme || isTutorTheme || isStudentTheme ? "bg-blue-50" : "bg-slate-50"}`}>
              {details.map((detail) => (
                <div className="flex items-start justify-between gap-3 text-sm" key={detail.label}>
                  <span className={isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-500" : "text-slate-500"}>{detail.label}</span>
                  <span className={`text-right font-medium ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-900" : "text-slate-800"}`}>{detail.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium text-white ${styles.modalButton}`}
                type="button"
                onClick={() => {
                  setShowEditModal(true);
                  setOpen(false);
                }}
              >
                Edit Profile
              </button>
              <button
                className={`rounded-xl border px-4 py-2 text-sm font-medium ${styles.subtleButton}`}
                type="button"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            </div>

            <button
              className={`mt-3 w-full rounded-xl border px-4 py-2 text-sm font-medium ${
                isAdminTheme
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : isTutorTheme
                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    : isStudentTheme
                      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              }`}
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {mounted &&
        showEditModal &&
        user &&
        createPortal(
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/45 p-4 sm:p-6">
            <div className="flex min-h-full items-start justify-center py-6 sm:py-10">
              <div
                className={`w-full max-w-2xl rounded-3xl p-5 shadow-2xl sm:p-6 ${
                  isAdminTheme
                    ? "border border-blue-100 bg-white"
                    : isTutorTheme
                      ? "border border-blue-100 bg-white"
                      : isStudentTheme
                        ? "border border-blue-100 bg-white"
                    : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`text-xl font-semibold ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-900" : "text-slate-900"}`}>Edit Profile</h3>
                    <p className={`mt-1 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-500" : "text-slate-500"}`}>
                      Update your details and profile image for your {roleLabel.toLowerCase()} account.
                    </p>
                  </div>
                  <button
                    className={`rounded-lg border px-3 py-2 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-white text-slate-700 hover:bg-blue-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setError(null);
                      setSuccess(null);
                      setPasswordPanelOpen(false);
                    }}
                  >
                    Close
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className={`sm:col-span-2 rounded-2xl border p-4 ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-blue-50/70" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <Avatar
                        accent={accent}
                        size="lg"
                        user={form.dpUrl ? { ...user, dpUrl: form.dpUrl } : user}
                      />
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-900" : "text-slate-900"}`}>Profile Picture</div>
                        <p className={`mt-1 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-500" : "text-slate-500"}`}>
                          Upload an image to show it in your profile content.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <label className={`inline-flex cursor-pointer items-center rounded-xl px-4 py-2 text-sm font-medium text-white ${styles.modalButton}`}>
                            Upload Image
                            <input
                              className="hidden"
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                              onChange={handleProfileImageUpload}
                            />
                          </label>
                          <button
                            className={`rounded-xl border px-4 py-2 text-sm font-medium ${styles.subtleButton}`}
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, dpUrl: "" }))}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                    <span>Full Name</span>
                    <input
                      className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-blue-50/60 text-slate-900" : "border-slate-200 focus:border-slate-400"}`}
                      value={form.fullName}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((current) => ({ ...current, fullName: value }));
                        setFieldErrors((current) => ({ ...current, fullName: validateFullName(value) }));
                      }}
                    />
                    {fieldErrors.fullName ? <p className="text-xs font-medium text-red-500">{fieldErrors.fullName}</p> : null}
                  </label>

                  <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                    <span>Email</span>
                    <input
                      className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-blue-50/60 text-slate-900" : "border-slate-200 focus:border-slate-400"}`}
                      type="email"
                      value={form.email}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((current) => ({ ...current, email: value }));
                        setFieldErrors((current) => ({ ...current, email: validateEmail(value) }));
                      }}
                    />
                    {fieldErrors.email ? <p className="text-xs font-medium text-red-500">{fieldErrors.email}</p> : null}
                  </label>

                  <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                    <span>Phone Number</span>
                    <input
                      className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-blue-50/60 text-slate-900" : "border-slate-200 focus:border-slate-400"}`}
                      value={form.phoneNumber}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/\D/g, "").slice(0, 10);
                        setForm((current) => ({ ...current, phoneNumber: digitsOnly }));
                        setFieldErrors((current) => ({ ...current, phoneNumber: validatePhoneNumber(digitsOnly) }));
                      }}
                    />
                    {fieldErrors.phoneNumber ? <p className="text-xs font-medium text-red-500">{fieldErrors.phoneNumber}</p> : null}
                  </label>

                  <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                    <span>User ID</span>
                    <input
                      className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-blue-50 text-slate-500" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                      value={user.userId || ""}
                      readOnly
                    />
                  </label>

                  {(user.role === "STUDENT" || user.role === "TUTOR") && (
                    <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                      <span>Faculty</span>
                      <input
                        className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-blue-50 text-slate-500" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                        value={form.faculty}
                        readOnly
                      />
                    </label>
                  )}

                  {user.role === "STUDENT" && (
                    <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                      <span>Year</span>
                      <input
                        className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-blue-50 text-slate-500" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                        type="number"
                        value={form.year}
                        readOnly
                      />
                    </label>
                  )}

                  {user.role === "STUDENT" && (
                    <label className={`grid gap-1.5 text-sm ${isAdminTheme ? "text-slate-700" : "text-slate-700"}`}>
                      <span>Semester</span>
                      <input
                        className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme ? "border-blue-100 bg-blue-50 text-slate-500" : "border-slate-200 bg-slate-100 text-slate-500"}`}
                        type="number"
                        value={form.semester}
                        readOnly
                      />
                    </label>
                  )}
                </div>

                {showPasswordSection && (
                  <div className={`mt-6 rounded-2xl border p-4 ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                    <button
                      className="flex w-full items-center justify-between gap-4 text-left"
                      type="button"
                      onClick={() => setPasswordPanelOpen((current) => !current)}
                    >
                      <div>
                        <div className={`text-base font-semibold ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-900" : "text-slate-900"}`}>Change Password</div>
                        <p className={`mt-1 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-500" : "text-slate-500"}`}>
                          Enter your old password and set a new one.
                        </p>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-xs font-medium ${styles.subtleButton}`}>
                        {passwordPanelOpen ? "Hide" : "Open"}
                      </div>
                    </button>

                    {passwordPanelOpen && (
                      <div className={`mt-4 pt-4 ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-t border-blue-100" : "border-t border-slate-200"}`}>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                            <span>Old Password</span>
                            <input
                              className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-white text-slate-900" : "border-slate-200 bg-white focus:border-slate-400"}`}
                              type="password"
                              value={passwordForm.currentPassword}
                              onChange={(event) => {
                                const value = event.target.value;
                                setPasswordForm((current) => ({ ...current, currentPassword: value }));
                                setPasswordFieldErrors((current) => ({ ...current, currentPassword: validateRequired(value) }));
                              }}
                            />
                            {passwordFieldErrors.currentPassword ? <p className="text-xs font-medium text-red-500">{passwordFieldErrors.currentPassword}</p> : null}
                          </label>

                          <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                            <span>New Password</span>
                            <input
                              className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-white text-slate-900" : "border-slate-200 bg-white focus:border-slate-400"}`}
                              type="password"
                              value={passwordForm.newPassword}
                              onChange={(event) => {
                                const value = event.target.value;
                                setPasswordForm((current) => ({ ...current, newPassword: value }));
                                setPasswordFieldErrors((current) => ({
                                  ...current,
                                  newPassword: validatePassword(value),
                                  confirmPassword: passwordForm.confirmPassword
                                    ? validateConfirmPassword(value, passwordForm.confirmPassword)
                                    : current.confirmPassword,
                                }));
                              }}
                            />
                            {passwordFieldErrors.newPassword ? <p className="text-xs font-medium text-red-500">{passwordFieldErrors.newPassword}</p> : null}
                          </label>

                          <label className={`grid gap-1.5 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "text-slate-700" : "text-slate-700"}`}>
                            <span>Confirm Password</span>
                            <input
                              className={`rounded-xl border px-3 py-2.5 outline-none ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-white text-slate-900" : "border-slate-200 bg-white focus:border-slate-400"}`}
                              type="password"
                              value={passwordForm.confirmPassword}
                              onChange={(event) => {
                                const value = event.target.value;
                                setPasswordForm((current) => ({ ...current, confirmPassword: value }));
                                setPasswordFieldErrors((current) => ({
                                  ...current,
                                  confirmPassword: validateConfirmPassword(passwordForm.newPassword, value),
                                }));
                              }}
                            />
                            {passwordFieldErrors.confirmPassword ? <p className="text-xs font-medium text-red-500">{passwordFieldErrors.confirmPassword}</p> : null}
                          </label>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white ${styles.modalButton} disabled:opacity-70`}
                            type="button"
                            disabled={changingPassword}
                            onClick={changePassword}
                          >
                            {changingPassword ? "Changing..." : "Update Password"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${isAdminTheme || isTutorTheme ? "border-red-200 bg-red-50 text-red-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                    {error}
                  </div>
                )}

                {success && (
                  <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-200 bg-blue-50 text-blue-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {success}
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium ${isAdminTheme || isTutorTheme || isStudentTheme ? "border-blue-100 bg-white text-slate-700 hover:bg-blue-50" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setError(null);
                      setSuccess(null);
                      setPasswordPanelOpen(false);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium text-white ${styles.modalButton} disabled:opacity-70`}
                    type="button"
                    disabled={saving}
                    onClick={saveProfile}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
