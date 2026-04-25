"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { isWithinReminderWindow } from "@/lib/reminder";

type User = {
  _id: string;
  fullName: string;
  role: "STUDENT" | "TUTOR" | "ADMIN";
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
  createdBy?: string;
};

function formatAudience(eventItem: EventItem) {
  if (eventItem.targetType === "EVERYONE") return "Everyone";
  if (eventItem.targetType === "STUDENTS_ALL") return "All Students";
  if (eventItem.targetType === "STUDENTS_FACULTY") return `Students - ${eventItem.targetFaculty || "Faculty"}`;
  if (eventItem.targetType === "STUDENTS_FACULTY_YEAR") return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"}`;
  if (eventItem.targetType === "STUDENTS_FACULTY_YEAR_SEMESTER") return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  if (eventItem.targetType === "FACULTY") return `Students - ${eventItem.targetFaculty || "Faculty"}`;
  if (eventItem.targetType === "YEAR_SEM") return `Students - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  if (eventItem.targetType === "FACULTY_YEAR_SEM") return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  if (eventItem.targetType === "TUTORS_ALL") return "All Tutors";
  if (eventItem.targetType === "TUTORS_FACULTY") return `Tutors - ${eventItem.targetFaculty || "Faculty"}`;
  return eventItem.targetType;
}

function isTodayEvent(startsAt: string) {
  const d = new Date(startsAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function TutorEventsPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [userId, setUserId] = useState<string>("");

  const userSignatureRef = useRef("");
  const eventsSignatureRef = useRef("");

  const upcomingEvents = useMemo(() => {
    const cutoff = new Date();
    return events.filter((eventItem) => new Date(eventItem.startsAt) >= cutoff);
  }, [events]);
  const pastEvents = useMemo(() => {
    const cutoff = new Date();
    return events.filter((eventItem) => new Date(eventItem.startsAt) < cutoff);
  }, [events]);
  const visibleEvents = showPastEvents ? pastEvents : upcomingEvents;

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
      if (me.user.role !== "TUTOR") {
        router.push(me.user.role === "ADMIN" ? "/admin/events" : "/student/events");
        return;
      }
      const nextUserSignature = JSON.stringify([me.user._id, me.user.fullName, me.user.role]);
      if (nextUserSignature !== userSignatureRef.current) {
        userSignatureRef.current = nextUserSignature;
        setUserId(me.user._id);
      }

      const data = await apiFetch<{ events: EventItem[] }>("/api/events", {}, token);
      const nextEventsSignature = JSON.stringify(
        data.events.map((eventItem) => [eventItem._id, eventItem.title, eventItem.startsAt, eventItem.location, eventItem.targetType])
      );
      if (nextEventsSignature !== eventsSignatureRef.current) {
        eventsSignatureRef.current = nextEventsSignature;
        setEvents(data.events);
      }
    } catch (err: unknown) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load events.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
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

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="rounded-[28px] border border-blue-100 bg-white p-5 shadow-[0_20px_60px_rgba(37,99,235,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.22em] text-blue-700">Event Studio</div>
              <h1 className="mt-2 text-xl font-semibold text-slate-900">Tutor Event Management</h1>
              <p className="mt-1 text-sm text-slate-600">Create and manage events for students.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-full border border-blue-200 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                onClick={() => router.push("/tutor/events/calendar")}
                type="button"
              >
                View Calendar
              </button>
              <button
                className="rounded-full border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={() => router.push("/tutor/events/calendar?create=1")}
                type="button"
              >
                Add New Event
              </button>
            </div>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

        <div className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-900">{showPastEvents ? "Past Events" : "Upcoming Events"}</div>
            <button
              className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
              onClick={() => setShowPastEvents((prev) => !prev)}
              type="button"
            >
              {showPastEvents ? "View Upcoming Events" : "View Past Events"}
            </button>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading events...</div>
          ) : visibleEvents.length === 0 ? (
            <div className="text-sm text-slate-500">No events found.</div>
          ) : (
            <div className="space-y-3">
              {visibleEvents.map((eventItem) => (
                <div
                  key={eventItem._id}
                  onClick={() => router.push(`/tutor/events/calendar?eventId=${encodeURIComponent(eventItem._id)}`)}
                  className={`rounded-xl border p-3 shadow-sm ${
                    isWithinReminderWindow(eventItem.startsAt)
                      ? "border-red-700 bg-red-600 text-white shadow-[0_24px_60px_rgba(220,38,38,0.26)]"
                      : isTodayEvent(eventItem.startsAt)
                        ? "border-blue-200 bg-blue-50"
                      : "border-blue-100 bg-white"
                  } cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/tutor/events/calendar?eventId=${encodeURIComponent(eventItem._id)}`);
                    }
                  }}
                >
                    <div className="flex items-center justify-between gap-3">
                    <div className={`font-semibold ${isWithinReminderWindow(eventItem.startsAt) ? "text-white" : "text-slate-900"}`}>{eventItem.title}</div>
                    <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      isWithinReminderWindow(eventItem.startsAt)
                        ? "bg-red-700 !text-white"
                        : "bg-blue-50 text-blue-700"
                    }`}>{formatAudience(eventItem)}</div>
                  </div>
                  {isTodayEvent(eventItem.startsAt) && (
                    <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isWithinReminderWindow(eventItem.startsAt)
                        ? "bg-red-700 !text-white"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      Today
                    </div>
                  )}
                  <div className={`mt-1 text-sm ${isWithinReminderWindow(eventItem.startsAt) ? "!text-white" : "text-slate-600"}`}>
                    {new Date(eventItem.startsAt).toLocaleString()} - {eventItem.location}
                  </div>
                  {eventItem.description && <div className={`mt-1 text-sm ${isWithinReminderWindow(eventItem.startsAt) ? "!text-white" : "text-slate-500"}`}>{eventItem.description}</div>}
                  <div className={`mt-2 text-xs font-medium ${isWithinReminderWindow(eventItem.startsAt) ? "!text-white" : "text-slate-500"}`}>
                    {eventItem.createdBy === userId ? "Created by you" : "Shared event"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
