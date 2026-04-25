"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = {
  _id: string;
  fullName: string;
  role: "STUDENT" | "TUTOR" | "ADMIN";
};

type DashboardCounts = {
  totalEvents: number;
  upcomingEvents: number;
  unreadNotifications: number;
};

type EventItem = {
  _id: string;
  title: string;
  startsAt: string;
  location: string;
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>({
    totalEvents: 0,
    upcomingEvents: 0,
    unreadNotifications: 0,
  });
  const [reminderWindowEvents, setReminderWindowEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role === "ADMIN") {
        router.push("/admin/dashboard");
        return;
      }
      if (me.user.role === "TUTOR") {
        router.push("/tutor/dashboard");
        return;
      }
      setUser(me.user);

      const [eventsRes, unreadRes] = await Promise.all([
        apiFetch<{ events: EventItem[] }>("/api/events", {}, token),
        apiFetch<{ unreadCount: number }>("/api/notifications/unread-count", {}, token),
      ]);

      const cutoff = new Date();
      const upcomingEvents = eventsRes.events.filter((eventItem) => new Date(eventItem.startsAt) >= cutoff).length;
      const oneHourMs = 60 * 60 * 1000;
      const now = Date.now();
      const activeReminderEvents = eventsRes.events.filter((eventItem) => {
        const t = new Date(eventItem.startsAt).getTime();
        return now >= t - oneHourMs && now <= t + oneHourMs;
      });

      setCounts({
        totalEvents: eventsRes.events.length,
        upcomingEvents,
        unreadNotifications: unreadRes.unreadCount,
      });
      setReminderWindowEvents(activeReminderEvents);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_22px_60px_rgba(37,99,235,0.08)]">
            <div className="text-xs font-medium uppercase tracking-[0.24em] text-blue-700">Student Home</div>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-slate-900">Best modules are waiting to enrich your skill.</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              {user ? `Welcome ${user.fullName}.` : "Manage your student features in one place."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                type="button"
                onClick={() => router.push("/student/events")}
              >
                Explore Events
              </button>
              <button
                className="rounded-full border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                type="button"
                onClick={() => router.push("/student/events/calendar")}
              >
                Open Calendar
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

          <div className="rounded-[26px] border border-blue-100 bg-white p-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-700">Live Reminders</div>
            {loading ? (
              <div className="text-sm text-slate-500">Checking current reminders...</div>
            ) : reminderWindowEvents.length === 0 ? (
              <div className="text-sm text-slate-500">No events in reminder window (1 hour before to 1 hour after).</div>
            ) : (
            <div className="space-y-2">
              {reminderWindowEvents.map((eventItem) => (
                <div key={eventItem._id} className="rounded-2xl border border-red-700 bg-red-600 p-3 text-white shadow-[0_24px_60px_rgba(220,38,38,0.22)]">
                  <div className="font-semibold text-white">{eventItem.title}</div>
                  <div className="text-sm text-white">{new Date(eventItem.startsAt).toLocaleString()} - {eventItem.location}</div>
                  <div className="mt-2">
                    <button
                      className="rounded-full border border-red-700 bg-red-700 px-3 py-1 text-xs font-medium text-white hover:bg-red-800"
                      onClick={() => router.push(`/student/events/calendar?eventId=${encodeURIComponent(eventItem._id)}`)}
                      type="button"
                    >
                        Open Event Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/student/events"
              className="group rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:border-blue-200"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">E</div>
              <div className="mt-3 text-xs uppercase tracking-wide text-blue-700">Events</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">Events Dashboard</div>
              <div className="mt-2 text-sm text-slate-600">View your upcoming and past events.</div>
              <div className="mt-4 text-sm font-semibold text-slate-900">Upcoming: {loading ? "..." : counts.upcomingEvents}</div>
              <div className="mt-2 text-xs font-medium text-blue-700">Open {"->"}</div>
            </Link>

            <Link
              href="/student/notifications"
              className="group rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:border-blue-200"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">N</div>
              <div className="mt-3 text-xs uppercase tracking-wide text-blue-700">Notifications</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">Notifications Center</div>
              <div className="mt-2 text-sm text-slate-600">Check reminders and event updates.</div>
              <div className="mt-4 text-sm font-semibold text-slate-900">Unread: {loading ? "..." : counts.unreadNotifications}</div>
              <div className="mt-2 text-xs font-medium text-blue-700">Open {"->"}</div>
            </Link>

            <Link
              href="/student/events/calendar"
              className="group rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:border-blue-200"
            >
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">C</div>
              <div className="mt-3 text-xs uppercase tracking-wide text-blue-700">Calendar</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">Events Calendar</div>
              <div className="mt-2 text-sm text-slate-600">Browse events by month and date.</div>
              <div className="mt-4 text-sm font-semibold text-slate-900">Total Events: {loading ? "..." : counts.totalEvents}</div>
              <div className="mt-2 text-xs font-medium text-blue-700">Open {"->"}</div>
            </Link>
          </div>
        </div>
    </div>
  );
}
