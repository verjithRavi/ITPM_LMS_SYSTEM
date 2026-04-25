"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { isWithinReminderWindow, playReminderAlarm } from "@/lib/reminder";
import ProfileMenu, { type ProfileUser } from "@/components/ProfileMenu";
import SystemLogo from "@/components/SystemLogo";

type TutorTopNavProps = {
  fullName?: string;
};

type NotificationItem = {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedEvent?: string | null;
};

export default function TutorTopNav({ fullName }: TutorTopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [unread, setUnread] = useState<number>(0);
  const [reminderPopups, setReminderPopups] = useState<NotificationItem[]>([]);
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  async function loadUnread() {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<{ unreadCount: number }>("/api/notifications/unread-count", {}, token);
      setUnread(data.unreadCount);
    } catch {
      // ignore
    }
  }

  async function loadUser() {
    const token = getToken();
    if (!token) return;
    try {
      const data = await apiFetch<{ user: ProfileUser }>("/api/me", {}, token);
      setUser(data.user);
      if (data.user.role === "TUTOR" && data.user.forcePasswordChange) {
        setShowPasswordPopup(true);
      } else {
        setShowPasswordPopup(false);
      }
    } catch {
      // ignore
    }
  }

  async function loadReminderPopups() {
    const token = getToken();
    if (!token || typeof window === "undefined") return;

    try {
      const data = await apiFetch<{ notifications: NotificationItem[] }>("/api/notifications", {}, token);
      const unreadReminders = data.notifications.filter(
        (notification) => notification.type === "REMINDER" && !notification.isRead
      );

      const eventsRes = await apiFetch<{ events: Array<{ _id: string; startsAt: string }> }>(
        "/api/events",
        {},
        token
      );
      const eventsMap = new Map(eventsRes.events.map((eventItem) => [eventItem._id, eventItem.startsAt]));

      const activeWindowReminders = unreadReminders.filter((notification) => {
        if (!notification.relatedEvent) return false;
        const startsAt = eventsMap.get(notification.relatedEvent);
        return startsAt ? isWithinReminderWindow(startsAt) : false;
      });

      const alarmStorageKey = "played_event_time_alarm_ids_tutor";
      const alarmRaw = window.sessionStorage.getItem(alarmStorageKey);
      const playedAlarmIds = new Set<string>(alarmRaw ? JSON.parse(alarmRaw) : []);
      const now = Date.now();
      const eventTimeReminders = activeWindowReminders.filter((notification) => {
        if (!notification.relatedEvent) return false;
        const startsAt = eventsMap.get(notification.relatedEvent);
        if (!startsAt) return false;
        const eventTime = new Date(startsAt).getTime();
        const isAtEventTime = now >= eventTime && now <= eventTime + 60 * 1000;
        return isAtEventTime && !playedAlarmIds.has(notification.relatedEvent);
      });

      if (eventTimeReminders.length > 0) {
        void playReminderAlarm();
        eventTimeReminders.forEach((notification) => {
          if (notification.relatedEvent) playedAlarmIds.add(notification.relatedEvent);
        });
        window.sessionStorage.setItem(alarmStorageKey, JSON.stringify(Array.from(playedAlarmIds)));
      }

      const storageKey = "shown_reminder_ids_tutor";
      const shownRaw = window.sessionStorage.getItem(storageKey);
      const shownIds = new Set<string>(shownRaw ? JSON.parse(shownRaw) : []);

      const newReminderPopups = activeWindowReminders.filter(
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

  function openReminderEvent(notification: NotificationItem) {
    if (notification.relatedEvent) {
      router.push(`/tutor/events/calendar?eventId=${encodeURIComponent(notification.relatedEvent)}`);
      return;
    }
    router.push("/tutor/events/calendar");
  }

  async function changePasswordNow() {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    setPasswordError(null);
    if (!currentPassword || !newPassword) {
      setPasswordError("Current password and new password are required.");
      return;
    }

    setChangingPassword(true);
    try {
      await apiFetch(
        "/api/me/change-password",
        {
          method: "PATCH",
          body: JSON.stringify({ currentPassword, newPassword }),
        },
        token
      );
      setCurrentPassword("");
      setNewPassword("");
      setShowPasswordPopup(false);
      await loadUser();
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setChangingPassword(false);
    }
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
    `inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-medium transition ${
      pathname === href || pathname.startsWith(`${href}/`)
        ? "border-orange-300/30 bg-gradient-to-r from-orange-400 to-amber-300 text-slate-950 shadow-[0_10px_30px_rgba(251,146,60,0.24)]"
        : "border-white/10 bg-white/6 text-slate-100 hover:bg-white/12 hover:text-white"
    }`;

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <SystemLogo
                size={44}
                labelClassName="text-white"
                subtitle=""
                title="EduLearn"
              />
              <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-black/15 p-1 backdrop-blur-xl">
                <Link className={linkClass("/tutor/dashboard")} href="/tutor/dashboard">
                  Dashboard
                </Link>
                <Link className={linkClass("/tutor/events")} href="/tutor/events">
                  Events
                </Link>
                <Link className={linkClass("/tutor/assignments")} href="/tutor/assignments">
                  Assignments & Quizzes
                </Link>
                <Link className={linkClass("/tutor/support")} href="/tutor/support">
                  Support
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-slate-200 hover:bg-white/10"
                href="/tutor/notifications"
                title="Notifications"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-orange-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">
                    {unread}
                  </span>
                )}
              </Link>

              <ProfileMenu
                accent="purple"
                roleLabel="Tutor"
                user={user ? { ...user, fullName: fullName || user.fullName } : null}
                onUserUpdated={setUser}
                onLogout={logout}
              />
            </div>
          </div>
        </div>
      </div>

      {showPasswordPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(20,20,28,0.98),rgba(31,16,12,0.98))] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Change Temporary Password</h3>
            <p className="mt-1 text-sm text-slate-300">
              For security, you must change your password before using the system.
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Use your User ID ({user?.userId || "your User ID"}) as the current password.
            </p>

            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-lg border border-white/10 bg-white/6 p-2.5 text-sm text-white outline-none placeholder:text-slate-400"
                placeholder="Current password (User ID)"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-white/10 bg-white/6 p-2.5 text-sm text-white outline-none placeholder:text-slate-400"
                placeholder="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {passwordError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {passwordError}
                </div>
              )}
              <button
                className="w-full rounded-lg bg-gradient-to-r from-orange-400 to-amber-300 px-4 py-2 text-sm font-medium text-slate-950 hover:brightness-105 disabled:opacity-70"
                type="button"
                disabled={changingPassword}
                onClick={changePasswordNow}
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderPopups.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          {reminderPopups.slice(0, 3).map((popup) => (
            <div
              key={popup._id}
              className="w-full max-w-md cursor-pointer rounded-2xl border border-orange-300/25 bg-[linear-gradient(145deg,rgba(17,17,24,0.98),rgba(42,22,12,0.98))] p-4 shadow-2xl pointer-events-auto"
              onClick={() => openReminderEvent(popup)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openReminderEvent(popup);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-200">Reminder</div>
                  <div className="mt-1 text-sm text-white">{popup.message}</div>
                </div>
                <button
                  className="rounded-md border border-white/10 bg-white/10 px-2 py-0.5 text-xs text-white hover:bg-white/20"
                  onClick={(event) => {
                    event.stopPropagation();
                    closeReminderPopup(popup._id);
                  }}
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
