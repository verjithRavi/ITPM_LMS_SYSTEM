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
  pendingStudents: number;
  totalTutors: number;
  totalEvents: number;
  unreadNotifications: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [counts, setCounts] = useState<DashboardCounts>({
    pendingStudents: 0,
    totalTutors: 0,
    totalEvents: 0,
    unreadNotifications: 0,
  });
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
      if (me.user.role !== "ADMIN") {
        router.push("/login");
        return;
      }

      const [pendingRes, tutorsRes, eventsRes, unreadRes] = await Promise.all([
        apiFetch<{ students: unknown[] }>("/api/admin/students/pending", {}, token),
        apiFetch<{ tutors: unknown[] }>("/api/admin/tutors", {}, token),
        apiFetch<{ events: unknown[] }>("/api/events", {}, token),
        apiFetch<{ unreadCount: number }>("/api/notifications/unread-count", {}, token),
      ]);

      setCounts({
        pendingStudents: pendingRes.students.length,
        totalTutors: tutorsRes.tutors.length,
        totalEvents: eventsRes.events.length,
        unreadNotifications: unreadRes.unreadCount,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard.");
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
      <div className="mx-auto w-full max-w-7xl">
        <div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_20px_70px_rgba(37,99,235,0.08)]">
          <div className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-700">
            Overview
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900">Welcome to Admin Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage students, events, and other system features from one place.
          </p>
        </div>

        {error && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/students"
            className="group rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:border-blue-200"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">S</div>
            <div className="mt-3 text-xs uppercase tracking-[0.2em] text-blue-700">Students</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">Student Management</div>
            <div className="mt-2 text-sm text-slate-600">
              View pending registrations and approve students.
            </div>
            <div className="mt-5 text-3xl font-semibold text-slate-900">
              {loading ? "..." : counts.pendingStudents}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              Pending: {loading ? "..." : counts.pendingStudents}
            </div>
            <div className="mt-4 text-xs font-medium text-blue-700">Manage {"->"}</div>
          </Link>

          <Link
            href="/admin/tutors"
            className="group rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:border-blue-200"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">T</div>
            <div className="mt-3 text-xs uppercase tracking-[0.2em] text-blue-700">Tutors</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">Tutor Management</div>
            <div className="mt-2 text-sm text-slate-600">
              Create tutor accounts and manage tutor access.
            </div>
            <div className="mt-5 text-3xl font-semibold text-slate-900">
              {loading ? "..." : counts.totalTutors}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              Total Tutors: {loading ? "..." : counts.totalTutors}
            </div>
            <div className="mt-4 text-xs font-medium text-blue-700">Manage {"->"}</div>
          </Link>

          <Link
            href="/admin/events"
            className="group rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:border-blue-200"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">E</div>
            <div className="mt-3 text-xs uppercase tracking-[0.2em] text-blue-700">Events</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">Event Management</div>
            <div className="mt-2 text-sm text-slate-600">
              Create and view events visible to students.
            </div>
            <div className="mt-5 text-3xl font-semibold text-slate-900">
              {loading ? "..." : counts.totalEvents}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              Total Events: {loading ? "..." : counts.totalEvents}
            </div>
            <div className="mt-4 text-xs font-medium text-blue-700">Manage {"->"}</div>
          </Link>

          <Link
            href="/admin/notifications"
            className="group rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:border-blue-200"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">N</div>
            <div className="mt-3 text-xs uppercase tracking-[0.2em] text-blue-700">Notifications</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">Notifications Center</div>
            <div className="mt-2 text-sm text-slate-600">
              View and manage system notifications.
            </div>
            <div className="mt-5 text-3xl font-semibold text-slate-900">
              {loading ? "..." : counts.unreadNotifications}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
              Unread: {loading ? "..." : counts.unreadNotifications}
            </div>
            <div className="mt-4 text-xs font-medium text-blue-700">Manage {"->"}</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
