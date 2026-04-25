"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import ProfileMenu, { type ProfileUser } from "@/components/ProfileMenu";
import SystemLogo from "@/components/SystemLogo";

type AdminTopNavProps = {
  fullName?: string;
};

type NotificationItem = {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
};

export default function AdminTopNav({ fullName }: AdminTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [unread, setUnread] = useState<number>(0);
  const [reminderPopups, setReminderPopups] = useState<NotificationItem[]>([]);

  async function loadUser() {
    const token = getToken();
    if (!token) return;

    try {
      const data = await apiFetch<{ user: ProfileUser }>("/api/me", {}, token);
      setUser(data.user);
    } catch {
      // ignore
    }
  }

  async function loadUnread() {
    const token = getToken();
    if (!token) return;

    try {
      const data = await apiFetch<{ unreadCount: number }>(
        "/api/notifications/unread-count",
        {},
        token
      );
      setUnread(data.unreadCount);
    } catch {
      // ignore
    }
  }

  async function loadReminderPopups() {
    const token = getToken();
    if (!token || typeof window === "undefined") return;

    try {
      const data = await apiFetch<{ notifications: NotificationItem[] }>(
        "/api/notifications",
        {},
        token
      );

      const unreadReminders = data.notifications.filter(
        (notification) => notification.type === "REMINDER" && !notification.isRead
      );

      const storageKey = "shown_reminder_ids_admin";
      const shownRaw = window.sessionStorage.getItem(storageKey);
      const shownIds = new Set<string>(shownRaw ? JSON.parse(shownRaw) : []);

      const newReminderPopups = unreadReminders.filter(
        (notification) => !shownIds.has(notification._id)
      );

      if (newReminderPopups.length > 0) {
        setReminderPopups((prev) => [...prev, ...newReminderPopups]);
        newReminderPopups.forEach((notification) => shownIds.add(notification._id));
        window.sessionStorage.setItem(storageKey, JSON.stringify(Array.from(shownIds)));
      }
    } catch {
      // ignore
    }
  }

  function closeReminderPopup(id: string) {
    setReminderPopups((prev) => prev.filter((popup) => popup._id !== id));
  }

  useEffect(() => {
    const initId = setTimeout(() => {
      void loadUser();
      void loadUnread();
      void loadReminderPopups();
    }, 0);
    const id = setInterval(() => {
      void loadUser();
      void loadUnread();
      void loadReminderPopups();
    }, 10000);

    return () => {
      clearTimeout(initId);
      clearInterval(id);
    };
  }, []);

  function logout() {
    clearToken();
    router.push("/login");
  }

  const linkClass = (href: string) =>
    `inline-flex rounded-full px-3 py-2 text-sm font-medium transition ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "bg-gradient-to-r from-emerald-400/80 to-cyan-300/80 text-slate-950 shadow-[0_10px_30px_rgba(45,212,191,0.18)]"
        : "text-slate-300 hover:bg-white/8 hover:text-white"
    }`;

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-white/10 bg-transparent backdrop-blur">
        <div className="border-b border-white/10 bg-slate-950/30 px-4 py-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SystemLogo
                size={44}
                labelClassName="text-white"
                subtitle=""
                title="EduLearn"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Link className={linkClass("/admin/dashboard")} href="/admin/dashboard">
                  Dashboard
                </Link>
                <Link className={linkClass("/admin/students")} href="/admin/students">
                  Students
                </Link>
                <Link className={linkClass("/admin/tutors")} href="/admin/tutors">
                  Tutors
                </Link>
                <Link className={linkClass("/admin/modules")} href="/admin/modules">
                  Modules
                </Link>
                <Link className={linkClass("/admin/events")} href="/admin/events">
                  Events
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                href="/admin/notifications"
                title="Notifications"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">
                    {unread}
                  </span>
                )}
              </Link>

              <ProfileMenu
                accent="blue"
                roleLabel="Admin"
                user={user ? { ...user, fullName: fullName || user.fullName } : null}
                onUserUpdated={setUser}
                onLogout={logout}
              />
            </div>
          </div>
        </div>
      </div>

      {reminderPopups.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          {reminderPopups.slice(0, 3).map((popup) => (
            <div
              key={popup._id}
              className="w-full max-w-md rounded-2xl border border-emerald-300/25 bg-[linear-gradient(135deg,rgba(6,78,59,0.96),rgba(8,47,73,0.96))] p-4 shadow-2xl pointer-events-auto"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Reminder</div>
                  <div className="mt-1 text-sm text-white">{popup.message}</div>
                </div>
                <button
                  className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-xs text-white hover:bg-white/20"
                  onClick={() => closeReminderPopup(popup._id)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}


