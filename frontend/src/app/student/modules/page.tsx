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
  faculty?: string | null;
  year?: number | null;
  semester?: number | null;
};

type ModuleItem = {
  _id: string;
  moduleCode: string;
  name: string;
  faculty: string;
  year: number;
  semester: number;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export default function StudentModulesPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<User | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) {
        router.push("/login");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const me = await apiFetch<{ user: User }>("/api/me", {}, token);
        if (me.user.role !== "STUDENT") {
          router.push("/login");
          return;
        }
        setUser(me.user);

        const data = await apiFetch<{ modules: ModuleItem[] }>("/api/modules", {}, token);
        setModules(data.modules);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load registered modules.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router, token]);

  return (
    <div className="min-h-screen">
      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_22px_60px_rgba(37,99,235,0.08)]">
            <div className="text-xs font-medium uppercase tracking-[0.24em] text-blue-700">Registered Modules</div>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Your Registered Modules</h1>
            <p className="mt-3 max-w-3xl text-sm text-slate-600">
              {user
                ? `${user.faculty || "Faculty"} | Year ${user.year || "-"} | Semester ${user.semester || "-"}`
                : "All modules assigned to your current academic details are listed here."}
            </p>
          </div>

          {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div> : null}

          <div className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">Module List</div>
                <p className="mt-1 text-sm text-slate-600">Modules automatically assigned to your student account.</p>
              </div>
              <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {loading ? "..." : `${modules.length} module${modules.length === 1 ? "" : "s"}`}
              </div>
            </div>

            {loading ? (
              <div className="text-sm text-slate-500">Loading modules...</div>
            ) : modules.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/40 p-5 text-sm text-slate-500">
                No registered modules found for your current faculty, year, and semester.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {modules.map((moduleItem) => (
                  <Link
                    key={moduleItem._id}
                    href={`/student/modules/${moduleItem._id}`}
                    className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)] transition hover:-translate-y-1 hover:border-blue-200"
                  >
                    <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">
                      Module
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="text-xl font-semibold text-slate-900">{moduleItem.name}</div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                        {moduleItem.moduleCode}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-blue-50/60 px-2.5 py-1">{moduleItem.faculty}</span>
                      <span className="rounded-full bg-blue-50/60 px-2.5 py-1">Year {moduleItem.year}</span>
                      <span className="rounded-full bg-blue-50/60 px-2.5 py-1">Semester {moduleItem.semester}</span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{moduleItem.description}</p>
                    <div className="mt-4 text-xs font-semibold text-blue-700">Open module workspace {"->"}</div>
                    <div className="mt-2 text-xs text-slate-500">
                      Updated: {new Date(moduleItem.updatedAt).toLocaleString()}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
