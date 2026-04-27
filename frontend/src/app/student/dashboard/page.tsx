"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  BookOpen,
  Calendar,
  Bell,
  Briefcase,
  FileText,
  Layers,
  Star,
  Clock,
  ChevronRight,
  Activity,
  BookMarked,
  Map,
  Target,
  Users,
  MessageSquare,
  Award,
  Search,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

type User = {
  _id: string;
  fullName: string;
  role: "STUDENT" | "TUTOR" | "ADMIN";
};

type EventItem = {
  _id: string;
  title: string;
  startsAt: string;
  location: string;
};

type DashboardCounts = {
  totalModules: number;
  totalEvents: number;
  upcomingEvents: number;
  unreadNotifications: number;
};

export default function StudentDashboardPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>({
    totalModules: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    unreadNotifications: 0,
  });
  const [reminderEvents, setReminderEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) { router.push("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role === "ADMIN") { router.push("/admin/dashboard"); return; }
      if (me.user.role === "TUTOR") { router.push("/tutor/dashboard"); return; }
      setUser(me.user);

      const [modulesRes, eventsRes, unreadRes] = await Promise.all([
        apiFetch<{ modules: unknown[] }>("/api/modules", {}, token),
        apiFetch<{ events: EventItem[] }>("/api/events", {}, token),
        apiFetch<{ unreadCount: number }>("/api/notifications/unread-count", {}, token),
      ]);

      const now = new Date();
      const oneHourMs = 60 * 60 * 1000;
      const nowMs = Date.now();
      const upcoming = eventsRes.events.filter((e) => new Date(e.startsAt) >= now);
      const reminders = eventsRes.events.filter((e) => {
        const t = new Date(e.startsAt).getTime();
        return nowMs >= t - oneHourMs && nowMs <= t + oneHourMs;
      });

      setCounts({
        totalModules: modulesRes.modules.length,
        totalEvents: eventsRes.events.length,
        upcomingEvents: upcoming.length,
        unreadNotifications: unreadRes.unreadCount,
      });
      setReminderEvents(reminders);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const val = (n: number) => (loading ? "..." : String(n));

  const stats = [
    {
      label: "Upcoming Events",
      value: val(counts.upcomingEvents),
      sub: `${val(counts.totalEvents)} total`,
      icon: Calendar,
      color: "text-violet-600",
      bg: "bg-violet-50",
      href: "/student/events",
    },
    {
      label: "Modules",
      value: val(counts.totalModules),
      sub: "Available to explore",
      icon: BookOpen,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/student/modules",
    },
    {
      label: "Unread Notifications",
      value: val(counts.unreadNotifications),
      sub: "Pending review",
      icon: Bell,
      color: "text-rose-600",
      bg: "bg-rose-50",
      href: "/student/notifications",
      highlight: counts.unreadNotifications > 0,
    },
    {
      label: "Calendar",
      value: val(counts.totalEvents),
      sub: "Events on calendar",
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/student/events/calendar",
    },
  ];

  const sections = [
    {
      title: "Learning",
      items: [
        { label: "Modules", desc: "Browse available course modules", icon: BookOpen, href: "/student/modules" },
        { label: "Books", desc: "Access digital library resources", icon: BookMarked, href: "/student/books" },
        { label: "Courses", desc: "View enrolled and available courses", icon: Layers, href: "/student/courses" },
        { label: "Assignments", desc: "View and submit your assignments", icon: FileText, href: "/student/assignments" },
        { label: "Marks", desc: "Check your grades and results", icon: Star, href: "/student/marks" },
        { label: "Weekly Scheduler", desc: "Plan your weekly study schedule", icon: Clock, href: "/student/scheduler" },
      ],
    },
    {
      title: "Events & Communication",
      items: [
        {
          label: "Events",
          desc: "Browse upcoming events",
          icon: Activity,
          href: "/student/events",
          badge: counts.upcomingEvents > 0 ? counts.upcomingEvents : null,
          badgeColor: "bg-violet-500",
        },
        { label: "Events Calendar", desc: "View events on a monthly calendar", icon: Calendar, href: "/student/events/calendar" },
        {
          label: "Notifications",
          desc: "Stay updated with alerts and messages",
          icon: Bell,
          href: "/student/notifications",
          badge: counts.unreadNotifications > 0 ? counts.unreadNotifications : null,
          badgeColor: "bg-rose-500",
        },
        { label: "Support", desc: "Raise a support request or enquiry", icon: MessageSquare, href: "/student/support" },
        { label: "Feedback", desc: "Share your feedback and suggestions", icon: Users, href: "/student/feedback" },
      ],
    },
    {
      title: "Career Center",
      items: [
        { label: "Career Finder", desc: "Discover suitable career paths", icon: Search, href: "/student/career-finder" },
        { label: "CV Builder", desc: "Build and download your resume", icon: FileText, href: "/student/career/cv-builder" },
        { label: "My Skills", desc: "Track and manage your skill profile", icon: Award, href: "/student/career/skills" },
        { label: "Career Roadmap", desc: "Follow your personalised career journey", icon: Map, href: "/student/career/roadmap" },
        { label: "Job Matches", desc: "Explore job opportunities for you", icon: Briefcase, href: "/student/career/job-suggestions" },
        { label: "Resume Score", desc: "Evaluate and improve your resume", icon: TrendingUp, href: "/student/career/resume-score" },
        { label: "Career Goals", desc: "Set and track career targets", icon: Target, href: "/student/career-finder" },
      ],
    },
  ];

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-6">

        {/* Hero */}
        <div className="rounded-[28px] border border-blue-100 bg-white p-6 shadow-[0_20px_70px_rgba(37,99,235,0.08)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-700">
                <Activity size={11} />
                Student Home
              </div>
              <h1 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-slate-900">
                {greeting}{user ? `, ${user.fullName.split(" ")[0]}` : ""}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Keep learning — your best modules are waiting for you.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <button
                type="button"
                onClick={() => router.push("/student/events")}
                className="rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 transition"
              >
                Explore Events
              </button>
              <button
                type="button"
                onClick={() => router.push("/student/events/calendar")}
                className="rounded-full border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
              >
                Open Calendar
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Live Reminders */}
        {(loading || reminderEvents.length > 0) && (
          <div className="rounded-[22px] border border-red-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle size={15} className="text-red-500" />
              <span className="text-sm font-semibold uppercase tracking-wide text-red-600">Live Reminders</span>
            </div>
            {loading ? (
              <div className="text-sm text-slate-500">Checking reminders...</div>
            ) : (
              <div className="space-y-2">
                {reminderEvents.map((e) => (
                  <div key={e._id} className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <div>
                      <div className="text-sm font-semibold text-red-800">{e.title}</div>
                      <div className="mt-0.5 text-xs text-red-600">
                        {new Date(e.startsAt).toLocaleString()} — {e.location}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/student/events/calendar?eventId=${encodeURIComponent(e._id)}`)}
                      className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition"
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className={`group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                s.highlight ? "border-rose-200 bg-rose-50/30" : "border-slate-100"
              }`}
            >
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.bg} ${s.color}`}>
                <s.icon size={18} />
              </div>
              <div className="mt-3 text-2xl font-bold text-slate-900">{s.value}</div>
              <div className="mt-0.5 text-xs font-medium text-slate-700">{s.label}</div>
              <div className="text-[11px] text-slate-400">{s.sub}</div>
            </Link>
          ))}
        </div>

        {/* Feature Sections */}
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {section.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <item.icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">{item.label}</span>
                      {"badge" in item && item.badge != null && (
                        <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                  <ChevronRight size={14} className="mt-1 shrink-0 text-slate-300 transition group-hover:text-blue-500 group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
