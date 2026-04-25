"use client";

import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { isWithinReminderWindow, playReminderAlarm } from "@/lib/reminder";
import ProfileMenu, { type ProfileUser } from "@/components/ProfileMenu";
import SystemLogo from "@/components/SystemLogo";

type RoleShellVariant = "admin" | "tutor" | "student";

type NotificationItem = {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  relatedEvent?: string | null;
};

type EventShellItem = {
  _id: string;
  startsAt: string;
};

type NavigationItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const NAVIGATION: Record<RoleShellVariant, NavigationItem[]> = {
  admin: [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v4h-7z" />
          <path d="M13 10h7v10h-7z" />
          <path d="M4 13h7v7H4z" />
        </svg>
      ),
    },
    {
      href: "/admin/students",
      label: "Students",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      href: "/admin/tutors",
      label: "Tutors",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3Z" />
          <path d="M5 12v5c0 1.8 3.1 4 7 4s7-2.2 7-4v-5" />
        </svg>
      ),
    },
    {
      href: "/admin/modules",
      label: "Modules",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H20v16.5A1.5 1.5 0 0 1 18.5 21H6a3 3 0 0 1 0-6h14" />
        </svg>
      ),
    },
    {
      href: "/admin/events",
      label: "Events",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/admin/feedback",
      label: "Feedback",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      ),
    },
    {
      href: "/admin/notifications",
      label: "Notifications",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
      ),
    },
    {
      href: "/admin/career/cv-templates",
      label: "CV Templates",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      ),
    },
    {
      href: "/admin/career/career-roles",
      label: "Career Roles",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <line x1="10" y1="14" x2="14" y2="14" />
        </svg>
      ),
    },
    {
      href: "/admin/career/job-roles",
      label: "Job Roles",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      ),
    },
    {
      href: "/admin/career/roadmaps",
      label: "Roadmaps",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 17l4-8 4 4 4-6 4 10" />
        </svg>
      ),
    },
  ],
  tutor: [
    {
      href: "/tutor/dashboard",
      label: "Dashboard",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v4h-7z" />
          <path d="M13 10h7v10h-7z" />
          <path d="M4 13h7v7H4z" />
        </svg>
      ),
    },
    {
      href: "/tutor/events",
      label: "Events",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/tutor/modules",
      label: "Modules",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H20v16.5A1.5 1.5 0 0 1 18.5 21H6a3 3 0 0 1 0-6h14" />
        </svg>
      ),
    },
    {
      href: "/tutor/support",
      label: "Support",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      href: "/tutor/feedback",
      label: "Feedback",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      ),
    },
    {
      href: "/tutor/notifications",
      label: "Notifications",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
      ),
    },
  ],
  student: [
    {
      href: "/student/dashboard",
      label: "Dashboard",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v4h-7z" />
          <path d="M13 10h7v10h-7z" />
          <path d="M4 13h7v7H4z" />
        </svg>
      ),
    },
    {
      href: "/student/events",
      label: "Events",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M3 10h18" />
        </svg>
      ),
    },
    {
      href: "/student/modules",
      label: "Modules",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3H20v16.5A1.5 1.5 0 0 1 18.5 21H6a3 3 0 0 1 0-6h14" />
        </svg>
      ),
    },
    {
      href: "/student/marks",
      label: "Marks",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 19h16" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-3" />
        </svg>
      ),
    },
    {
      href: "/student/support",
      label: "Support",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      href: "/student/feedback",
      label: "Feedback",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      ),
    },
    {
      href: "/student/notifications",
      label: "Notifications",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
          <path d="M9 17a3 3 0 0 0 6 0" />
        </svg>
      ),
    },
    {
      href: "/student/career/cv-builder",
      label: "CV Builder",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      ),
    },
    {
      href: "/student/career/skills",
      label: "My Skills",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
        </svg>
      ),
    },
    {
      href: "/student/career/roadmap",
      label: "Career Roadmap",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 17l4-8 4 4 4-6 4 10" />
        </svg>
      ),
    },
    {
      href: "/student/career/job-suggestions",
      label: "Job Matches",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </svg>
      ),
    },
    {
      href: "/student/career/resume-score",
      label: "Resume Score",
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l2 2" />
        </svg>
      ),
    },
  ],
};

const ROLE_META: Record<RoleShellVariant, { label: string }> = {
  admin: { label: "Admin" },
  tutor: { label: "Tutor" },
  student: { label: "Student" },
};

export default function RoleSidebarShell({
  role,
  children,
}: {
  role: RoleShellVariant;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [unread, setUnread] = useState(0);
  const [eventAlertCount, setEventAlertCount] = useState(0);
  const [reminderPopups, setReminderPopups] = useState<NotificationItem[]>([]);
  const [showPasswordPopup, setShowPasswordPopup] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(() => NAVIGATION[role], [role]);
  const roleMeta = ROLE_META[role];

  async function loadUser() {
    const token = getToken();
    if (!token) return;

    try {
      const data = await apiFetch<{ user: ProfileUser }>("/api/me", {}, token);
      setUser(data.user);
      if ((role === "student" || role === "tutor") && data.user.forcePasswordChange) {
        setShowPasswordPopup(true);
      } else {
        setShowPasswordPopup(false);
      }
    } catch {
      // ignore
    }
  }

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

  async function loadReminderPopups() {
    const token = getToken();
    if (!token || typeof window === "undefined") return;

    try {
      const data = await apiFetch<{ notifications: NotificationItem[] }>("/api/notifications", {}, token);
      const unreadReminders = data.notifications.filter(
        (notification) => notification.type === "REMINDER" && !notification.isRead
      );

      let nextReminderPopups = unreadReminders;

      if (role === "student" || role === "tutor") {
        const eventsRes = await apiFetch<{ events: Array<{ _id: string; startsAt: string }> }>(
          "/api/events",
          {},
          token
        );
        const eventsMap = new Map(eventsRes.events.map((eventItem) => [eventItem._id, eventItem.startsAt]));

        nextReminderPopups = unreadReminders.filter((notification) => {
          if (!notification.relatedEvent) return false;
          const startsAt = eventsMap.get(notification.relatedEvent);
          return startsAt ? isWithinReminderWindow(startsAt) : false;
        });

        const alarmStorageKey = `played_event_time_alarm_ids_${role}`;
        const alarmRaw = window.sessionStorage.getItem(alarmStorageKey);
        const playedAlarmIds = new Set<string>(alarmRaw ? JSON.parse(alarmRaw) : []);
        const now = Date.now();
        const eventTimeReminders = nextReminderPopups.filter((notification) => {
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
      }

      const storageKey = `shown_reminder_ids_${role}`;
      const shownRaw = window.sessionStorage.getItem(storageKey);
      const shownIds = new Set<string>(shownRaw ? JSON.parse(shownRaw) : []);
      const unseenPopups = nextReminderPopups.filter((notification) => !shownIds.has(notification._id));

      if (unseenPopups.length > 0) {
        setReminderPopups((prev) => [...prev, ...unseenPopups]);
        unseenPopups.forEach((notification) => shownIds.add(notification._id));
        window.sessionStorage.setItem(storageKey, JSON.stringify(Array.from(shownIds)));
      }
    } catch {
      // ignore
    }
  }

  async function loadEventAlertCount() {
    const token = getToken();
    if (!token) return;

    try {
      const data = await apiFetch<{ events: EventShellItem[] }>("/api/events", {}, token);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const count = data.events.filter((eventItem) => {
        const startsAt = new Date(eventItem.startsAt).getTime();
        return !Number.isNaN(startsAt) && startsAt >= now - oneHour && startsAt <= now + oneHour;
      }).length;
      setEventAlertCount(count);
    } catch {
      // ignore
    }
  }

  const refreshShell = useEffectEvent(() => {
    void loadUser();
    void loadUnread();
    void loadEventAlertCount();
    void loadReminderPopups();
  });

  useEffect(() => {
    const initId = setTimeout(() => {
      refreshShell();
    }, 0);
    const id = setInterval(() => {
      refreshShell();
    }, 10000);

    return () => {
      clearTimeout(initId);
      clearInterval(id);
    };
  }, [role]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function logout() {
    clearToken();
    router.push("/login");
  }

  function closeReminderPopup(id: string) {
    setReminderPopups((prev) => prev.filter((popup) => popup._id !== id));
  }

  function openReminderEvent(notification: NotificationItem) {
    if (role === "admin") {
      router.push("/admin/notifications");
      return;
    }

    if (notification.relatedEvent) {
      router.push(`/${role}/events/calendar?eventId=${encodeURIComponent(notification.relatedEvent)}`);
      return;
    }

    router.push(`/${role}/events/calendar`);
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

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef5ff_0%,#f8fbff_42%,#ffffff_100%)]">
      <div className="lg:hidden">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-blue-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
          <SystemLogo size={36} labelClassName="text-slate-900" subtitle="" title="EDUPulse" />
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700"
            type="button"
            onClick={() => setMobileOpen(true)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex min-h-screen">
        {mobileOpen && (
          <button
            className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col bg-[linear-gradient(180deg,#071224_0%,#09172d_100%)] text-white shadow-[22px_0_60px_rgba(7,18,36,0.18)] transition-transform duration-200 lg:translate-x-0 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-[72px] items-center justify-between border-b border-white/8 px-5 lg:justify-start">
            <SystemLogo size={38} labelClassName="text-white" subtitle="" title="EDUPulse" />
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-slate-200 lg:hidden"
              type="button"
              onClick={() => setMobileOpen(false)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12" />
                <path d="M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav className="mt-5 flex-1 space-y-1 px-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isActive(item.href)
                    ? "bg-blue-500/16 text-white shadow-[0_12px_24px_rgba(37,99,235,0.16)]"
                    : "text-slate-200 hover:bg-white/6 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className={isActive(item.href) ? "text-blue-300" : "text-slate-300"}>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                {item.href.includes("/events") && eventAlertCount > 0 ? (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {eventAlertCount}
                  </span>
                ) : item.href.includes("notifications") && unread > 0 ? (
                  <span className="rounded-full bg-blue-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

        </aside>

        <main className="min-w-0 flex-1 lg:pl-[280px]">
          <div className="sticky top-0 z-20 hidden border-b border-slate-100 bg-white lg:block">
            <div className="flex h-[72px] items-center justify-end px-8">
              <div className="flex items-center gap-8">
                <button
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                  type="button"
                  onClick={() => router.push(`/${role}/notifications`)}
                  aria-label="Open notifications"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                    <path d="M9 17a3 3 0 0 0 6 0" />
                  </svg>
                  {unread > 0 ? (
                    <span className="absolute right-0 top-0 min-w-5 rounded-full bg-sky-400 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      {unread}
                    </span>
                  ) : null}
                </button>

                <ProfileMenu
                  accent="blue"
                  roleLabel={roleMeta.label}
                  user={user}
                  onUserUpdated={setUser}
                  onLogout={logout}
                />
              </div>
            </div>
          </div>
          <div className={`edu-shell ${role}-shell min-h-screen px-4 py-3 sm:px-6 lg:px-8 lg:py-5`}>{children}</div>
        </main>
      </div>

      {showPasswordPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_30px_80px_rgba(37,99,235,0.18)]">
            <h3 className="text-lg font-semibold text-slate-900">Change Temporary Password</h3>
            <p className="mt-1 text-sm text-slate-500">
              For security, you must change your password before using the system.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Use your User ID ({user?.userId || "your User ID"}) as the current password.
            </p>

            <div className="mt-5 space-y-3">
              <input
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Current password (User ID)"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <input
                className="w-full rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="New password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              {passwordError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {passwordError}
                </div>
              )}
              <button
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
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
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
          {reminderPopups.slice(0, 3).map((popup) => (
            <div
              key={popup._id}
              className="pointer-events-auto w-full max-w-md cursor-pointer rounded-[28px] border border-red-700 bg-red-600 p-5 text-white shadow-[0_28px_70px_rgba(220,38,38,0.34)]"
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white">Reminder</div>
                  <div className="mt-2 text-sm text-white">{popup.message}</div>
                </div>
                <button
                  className="rounded-xl border border-red-700 bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800"
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
    </div>
  );
}
