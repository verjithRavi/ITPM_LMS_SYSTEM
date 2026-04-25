"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import AdminTopNav from "@/components/AdminTopNav";
import TutorTopNav from "@/components/TutorTopNav";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = {
  _id: string;
  fullName: string;
  role: "STUDENT" | "TUTOR" | "ADMIN";
};

type NotificationItem = {
  _id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedEvent?: string | null;
  meta?: {
    redirectPath?: string | null;
  };
};

type EventTargetType =
  | "EVERYONE"
  | "STUDENTS_ALL"
  | "STUDENTS_FACULTY"
  | "STUDENTS_FACULTY_YEAR"
  | "STUDENTS_FACULTY_YEAR_SEMESTER"
  | "TUTORS_ALL"
  | "TUTORS_FACULTY"
  | "FACULTY"
  | "YEAR_SEM"
  | "FACULTY_YEAR_SEM";

type EventItem = {
  _id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  targetType: EventTargetType;
  targetFaculty?: string | null;
  targetYear?: number | null;
  targetSemester?: number | null;
  isCancelled?: boolean;
};

function formatAudience(eventItem: EventItem) {
  if (eventItem.targetType === "EVERYONE") return "Everyone";
  if (eventItem.targetType === "STUDENTS_ALL") return "All Students";
  if (eventItem.targetType === "STUDENTS_FACULTY") return `Students - ${eventItem.targetFaculty || "Faculty"}`;
  if (eventItem.targetType === "STUDENTS_FACULTY_YEAR") {
    return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"}`;
  }
  if (eventItem.targetType === "STUDENTS_FACULTY_YEAR_SEMESTER") {
    return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  }
  if (eventItem.targetType === "TUTORS_ALL") return "All Tutors";
  if (eventItem.targetType === "TUTORS_FACULTY") return `Tutors - ${eventItem.targetFaculty || "Faculty"}`;
  if (eventItem.targetType === "FACULTY") return `Students - ${eventItem.targetFaculty || "Faculty"}`;
  if (eventItem.targetType === "YEAR_SEM") {
    return `Students - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  }
  if (eventItem.targetType === "FACULTY_YEAR_SEM") {
    return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  }
  return eventItem.targetType;
}

function formatNotificationType(type: string) {
  const labels: Record<string, string> = {
    STUDENT_REGISTRATION_REQUEST: "Student Registration Request",
    REMINDER: "Reminder",
    EVENT_CREATED: "New Event",
    EVENT_UPDATED: "Event Updated",
    EVENT_CANCELLED: "Event Cancelled",
    PASSWORD_RESET_REQUEST: "Password Reset Request",
    MODULE_RESULTS_PUBLISHED: "Module Results Published",
  };

  if (labels[type]) return labels[type];

  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function NotificationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<User | null>(null);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsSignatureRef = useRef("");
  const inferredRole: User["role"] | null = pathname.startsWith("/tutor/")
    ? "TUTOR"
    : pathname.startsWith("/admin/")
      ? "ADMIN"
      : pathname === "/notifications" || pathname.startsWith("/student/")
        ? "STUDENT"
        : null;
  const role = user?.role ?? inferredRole;
  const isAdmin = role === "ADMIN";
  const isNestedRolePage = pathname.startsWith("/admin/") || pathname.startsWith("/tutor/");

  const theme = {
    pageBg: "bg-transparent",
    cardBorder: "border-blue-100",
    cardBg: "bg-white",
    softCardBg: "bg-blue-50/40",
    actionBtn: "border-blue-200 bg-white text-blue-700 hover:bg-blue-50",
    listWrap: "border-blue-100 bg-white",
    listCard: "border-blue-100 bg-white hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md",
    badge: "bg-blue-50 text-blue-700",
  };
  const detailTheme = { box: "border-blue-100 bg-blue-50/40", label: "text-blue-700" };

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
    if (!token) {
      router.push("/login");
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      setUser(me.user);

      const data = await apiFetch<{ notifications: NotificationItem[] }>(
        "/api/notifications",
        {},
        token
      );
      const nextSignature = JSON.stringify(
        data.notifications.map((notification) => [
          notification._id,
          notification.isRead,
          notification.createdAt,
          notification.message,
        ])
      );

      if (nextSignature !== itemsSignatureRef.current) {
        itemsSignatureRef.current = nextSignature;
        setItems(data.notifications);
      }
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load notifications");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      void load({ silent: true });
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function markRead(id: string) {
    if (!token) return;

    await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" }, token);
    setItems((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
  }

  async function onNotificationClick(notification: NotificationItem) {
    if (!token) return;

    if (!notification.isRead) {
      await markRead(notification._id);
    }

    if (notification.type === "STUDENT_REGISTRATION_REQUEST") {
      router.push("/admin/students");
      return;
    }

    if (notification.meta?.redirectPath) {
      router.push(notification.meta.redirectPath);
      return;
    }

    if (notification.relatedEvent) {
      try {
        const data = await apiFetch<{ event: EventItem | null; message?: string }>(
          `/api/notifications/${notification._id}/event`,
          {},
          token
        );
        if (data.event && !data.event.isCancelled && role !== "ADMIN") {
          if (role === "TUTOR") {
            router.push(`/tutor/events/calendar?eventId=${encodeURIComponent(data.event._id)}`);
          } else {
            router.push(`/student/events/calendar?eventId=${encodeURIComponent(data.event._id)}`);
          }
          return;
        }
        setSelectedNotification(notification);
        setSelectedEvent(data.event);
        setDetailsError(data.event ? null : data.message || "Event details are unavailable.");
      } catch (err: unknown) {
        setSelectedNotification(notification);
        setSelectedEvent(null);
        setDetailsError(err instanceof Error ? err.message : "Failed to load event details.");
      }
    }
  }

  async function markAllRead() {
    if (!token) return;

    await apiFetch(`/api/notifications/read-all`, { method: "PATCH" }, token);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className={`min-h-screen ${theme.pageBg}`}>
      {!isNestedRolePage &&
        (role === "ADMIN" ? (
          <AdminTopNav fullName={user?.fullName} />
        ) : role === "TUTOR" ? (
          <TutorTopNav fullName={user?.fullName} />
        ) : (
          <TopBar />
        ))}

      <div className="p-6 space-y-4">
        <div className="mx-auto w-full max-w-6xl">
          <div className={`rounded-2xl border p-5 shadow-sm ${theme.cardBorder} ${theme.cardBg}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
                <p className="mt-1 text-sm text-slate-600">
                  Stay updated with events, approvals, reminders, and system alerts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-70 ${theme.actionBtn}`}
                  onClick={markAllRead}
                  disabled={loading || items.length === 0}
                >
                  Mark all read
                </button>
              </div>
            </div>
          </div>

          {error && (
              <div className={`mt-4 rounded-xl border p-3 ${isAdmin ? "border-red-200 bg-red-50 text-red-700" : "border-red-200 bg-red-50 text-red-700"}`}>
              Error: {error}
            </div>
          )}

          <div className={`mt-4 rounded-2xl border p-4 shadow-sm ${theme.listWrap}`}>
            {loading ? (
              <div className={`rounded-xl border p-4 text-sm shadow-sm ${theme.cardBorder} ${theme.softCardBg} text-slate-600`}>
                Loading notifications...
              </div>
            ) : items.length === 0 ? (
              <div className={`rounded-xl border p-4 text-sm shadow-sm ${theme.cardBorder} ${theme.softCardBg} text-slate-600`}>
                No notifications.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((n) => (
                  <div
                    key={n._id}
                    className={`cursor-pointer rounded-xl border p-4 shadow-sm transition ${theme.listCard}`}
                    onClick={() => void onNotificationClick(n)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void onNotificationClick(n);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`rounded-md px-2 py-1 text-xs font-medium ${theme.badge}`}>
                        {formatNotificationType(n.type)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div
                      className={`mt-2 ${
                        n.isRead ? "text-slate-600" : "font-semibold text-slate-900"
                      }`}
                    >
                      {n.message}
                    </div>

                    {!n.isRead && (
                      <button
                        className={`mt-2 rounded-lg border px-3 py-1 text-sm ${theme.actionBtn}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          void markRead(n._id);
                        }}
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedNotification && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-blue-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedEvent?.isCancelled ? "Deleted Event Details" : "Event Details"}
                </h2>
                <p className="mt-1 text-sm text-slate-600">From selected notification</p>
              </div>
              <button
                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                onClick={() => {
                  setSelectedNotification(null);
                  setSelectedEvent(null);
                  setDetailsError(null);
                }}
                type="button"
              >
                Close
              </button>
            </div>

            <div className={`mt-4 rounded-lg border p-3 ${detailTheme.box}`}>
              <div className={`text-xs ${detailTheme.label}`}>Notification</div>
              <div className="text-sm font-medium text-slate-900">{selectedNotification.message}</div>
            </div>

            {detailsError ? (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">{detailsError}</div>
            ) : selectedEvent ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className={`rounded-lg border p-3 sm:col-span-2 ${detailTheme.box}`}>
                  <div className={`text-xs ${detailTheme.label}`}>Title</div>
                  <div className="text-sm font-medium text-slate-900">{selectedEvent.title}</div>
                </div>
                <div className={`rounded-lg border p-3 ${detailTheme.box}`}>
                  <div className={`text-xs ${detailTheme.label}`}>Date & Time</div>
                  <div className="text-sm font-medium text-slate-900">{new Date(selectedEvent.startsAt).toLocaleString()}</div>
                </div>
                <div className={`rounded-lg border p-3 ${detailTheme.box}`}>
                  <div className={`text-xs ${detailTheme.label}`}>Location</div>
                  <div className="text-sm font-medium text-slate-900">{selectedEvent.location}</div>
                </div>
                <div className={`rounded-lg border p-3 sm:col-span-2 ${detailTheme.box}`}>
                  <div className={`text-xs ${detailTheme.label}`}>Audience</div>
                  <div className="text-sm font-medium text-slate-900">{formatAudience(selectedEvent)}</div>
                </div>
                {selectedEvent.isCancelled && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 sm:col-span-2">
                    This event was deleted/cancelled by admin.
                  </div>
                )}
                <div className={`rounded-lg border p-3 sm:col-span-2 ${detailTheme.box}`}>
                  <div className={`text-xs ${detailTheme.label}`}>Description</div>
                  <div className="text-sm font-medium text-slate-900">{selectedEvent.description || "No description."}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

