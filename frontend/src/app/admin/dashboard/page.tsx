"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import {
  Users,
  UserCheck,
  Calendar,
  BookOpen,
  Bell,
  MessageSquare,
  Briefcase,
  FileText,
  Layers,
  AlertCircle,
  ChevronRight,
  Activity,
  BookMarked,
  Map,
  Star,
  Target,
} from "lucide-react";

type User = {
  _id: string;
  fullName: string;
  role: "STUDENT" | "TUTOR" | "ADMIN";
};

type DashboardCounts = {
  pendingStudents: number;
  totalStudents: number;
  totalTutors: number;
  totalModules: number;
  totalEvents: number;
  upcomingEvents: number;
  unreadNotifications: number;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<User | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>({
    pendingStudents: 0,
    totalStudents: 0,
    totalTutors: 0,
    totalModules: 0,
    totalEvents: 0,
    upcomingEvents: 0,
    unreadNotifications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) { router.push("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role !== "ADMIN") { router.push("/login"); return; }
      setUser(me.user);

      type EventItem = { _id: string; startsAt: string };
      const [pendingRes, allStudentsRes, tutorsRes, modulesRes, eventsRes, unreadRes] =
        await Promise.all([
          apiFetch<{ students: unknown[] }>("/api/admin/students/pending", {}, token),
          apiFetch<{ students: unknown[] }>("/api/admin/students", {}, token),
          apiFetch<{ tutors: unknown[] }>("/api/admin/tutors", {}, token),
          apiFetch<{ modules: unknown[] }>("/api/modules", {}, token),
          apiFetch<{ events: EventItem[] }>("/api/events", {}, token),
          apiFetch<{ unreadCount: number }>("/api/notifications/unread-count", {}, token),
        ]);

      const now = new Date();
      const upcomingEvents = eventsRes.events.filter(
        (e) => new Date(e.startsAt) >= now
      ).length;

      setCounts({
        pendingStudents: pendingRes.students.length,
        totalStudents: allStudentsRes.students.length,
        totalTutors: tutorsRes.tutors.length,
        totalModules: modulesRes.modules.length,
        totalEvents: eventsRes.events.length,
        upcomingEvents,
        unreadNotifications: unreadRes.unreadCount,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const val = (n: number) => (loading ? "..." : String(n));

  const stats = [
    {
      label: "Pending Students",
      value: val(counts.pendingStudents),
      sub: "Awaiting approval",
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/admin/students",
      highlight: counts.pendingStudents > 0,
    },
    {
      label: "Total Students",
      value: val(counts.totalStudents),
      sub: "Registered accounts",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/admin/students/list",
    },
    {
      label: "Total Tutors",
      value: val(counts.totalTutors),
      sub: "Active staff",
      icon: UserCheck,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      href: "/admin/tutors",
    },
    {
      label: "Total Modules",
      value: val(counts.totalModules),
      sub: "All modules",
      icon: BookOpen,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/admin/modules",
    },
    {
      label: "Upcoming Events",
      value: val(counts.upcomingEvents),
      sub: `${val(counts.totalEvents)} total`,
      icon: Calendar,
      color: "text-violet-600",
      bg: "bg-violet-50",
      href: "/admin/events",
    },
    {
      label: "Unread Notifications",
      value: val(counts.unreadNotifications),
      sub: "Pending review",
      icon: Bell,
      color: "text-rose-600",
      bg: "bg-rose-50",
      href: "/admin/notifications",
      highlight: counts.unreadNotifications > 0,
    },
  ];

  const sections = [
    {
      title: "User Management",
      items: [
        {
          label: "Students",
          desc: "View, approve, and manage student accounts",
          icon: Users,
          href: "/admin/students",
          badge: counts.pendingStudents > 0 ? counts.pendingStudents : null,
          badgeColor: "bg-amber-500",
        },
        {
          label: "Tutors",
          desc: "Create tutor accounts and manage staff",
          icon: UserCheck,
          href: "/admin/tutors",
        },
      ],
    },
    {
      title: "Academic",
      items: [
        {
          label: "Modules",
          desc: "Manage and assign teaching modules",
          icon: BookOpen,
          href: "/admin/modules",
        },
        {
          label: "Books",
          desc: "Upload and manage learning resources",
          icon: BookMarked,
          href: "/admin/books",
        },
        {
          label: "Courses",
          desc: "Create and configure course content",
          icon: Layers,
          href: "/admin/courses",
        },
      ],
    },
    {
      title: "Communication",
      items: [
        {
          label: "Events",
          desc: "Create and broadcast events to students",
          icon: Calendar,
          href: "/admin/events",
        },
        {
          label: "Notifications",
          desc: "Send and manage system notifications",
          icon: Bell,
          href: "/admin/notifications",
          badge: counts.unreadNotifications > 0 ? counts.unreadNotifications : null,
          badgeColor: "bg-rose-500",
        },
        {
          label: "Live Chat",
          desc: "Chat directly with students in real time",
          icon: MessageSquare,
          href: "/admin/chat",
        },
        {
          label: "Feedback",
          desc: "Review feedback submitted by users",
          icon: Star,
          href: "/admin/feedback",
        },
      ],
    },
    {
      title: "Career Center",
      items: [
        {
          label: "CV Templates",
          desc: "Manage CV templates for students",
          icon: FileText,
          href: "/admin/career/cv-templates",
        },
        {
          label: "Career Roles",
          desc: "Define career paths and role categories",
          icon: Briefcase,
          href: "/admin/career/career-roles",
        },
        {
          label: "Job Roles",
          desc: "Manage job listings and role database",
          icon: Target,
          href: "/admin/career/job-roles",
        },
        {
          label: "Roadmaps",
          desc: "Create career progression roadmaps",
          icon: Map,
          href: "/admin/career/roadmaps",
        },
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-700">
                <Activity size={11} />
                Admin Overview
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                {greeting}{user ? `, ${user.fullName.split(" ")[0]}` : ""}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
            <Link
              href="/admin/students"
              className="inline-flex items-center gap-2 rounded-full border border-blue-600 bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              <Users size={15} />
              Manage Students
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className={`group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                s.highlight ? "border-amber-200 bg-amber-50/40" : "border-slate-100"
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

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {section.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                      {item.badge != null && (
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
