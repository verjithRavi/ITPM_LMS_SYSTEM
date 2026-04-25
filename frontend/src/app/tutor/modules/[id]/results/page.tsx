"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = { _id: string; role: "STUDENT" | "TUTOR" | "ADMIN" };
type ModuleItem = { _id: string; moduleCode: string; name: string; faculty: string; year: number; semester: number };
type ModuleResultRow = {
  _id: string;
  student: { _id: string; fullName: string; email: string; userId: string };
  obtainedMarks: number | null;
  totalMarks: number;
  percentage: number | null;
  grade: string | null;
  passStatus: "PASS" | "CONDITIONAL_PASS" | "FAIL" | "ABSENT" | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  hasPendingGrading: boolean;
  calculatedAt: string | null;
  publishedAt: string | null;
  isCalculated: boolean;
  breakdown: {
    assignmentObtained: number;
    assignmentTotal: number;
    quizObtained: number;
    quizTotal: number;
    combinedObtained: number;
    combinedTotal: number;
  };
};
type ModuleResultsOverview = {
  module: ModuleItem;
  summary: {
    totalStudents: number;
    calculatedCount: number;
    passCount: number;
    conditionalPassCount: number;
    failCount: number;
    absentCount: number;
    pendingGradingCount: number;
  };
  readiness: {
    hasPublishedAssessments: boolean;
    deadlinesClosed: boolean;
    canPublish: boolean;
    message: string;
  } | null;
  results: ModuleResultRow[];
  message?: string;
};

const shell = "rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_rgba(37,99,235,0.08)]";

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.08)]"><div className="text-xs uppercase tracking-[0.22em] text-blue-700">{label}</div><div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div><p className="mt-2 text-sm text-slate-500">{note}</p></div>;
}

function passBadge(passStatus: ModuleResultRow["passStatus"]) {
  if (passStatus === "PASS") return "bg-emerald-100 text-emerald-700";
  if (passStatus === "CONDITIONAL_PASS") return "bg-amber-100 text-amber-700";
  if (passStatus === "ABSENT") return "bg-slate-200 text-slate-700";
  return "bg-red-100 text-red-700";
}

function passLabel(passStatus: ModuleResultRow["passStatus"]) {
  if (passStatus === "PASS") return "Pass";
  if (passStatus === "CONDITIONAL_PASS") return "Conditional Pass";
  if (passStatus === "ABSENT") return "Absent";
  if (passStatus === "FAIL") return "Fail";
  return "--";
}

export default function TutorModuleResultsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const token = useMemo(() => getToken(), []);
  const moduleId = params.id;
  const [overview, setOverview] = useState<ModuleResultsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadResults(authToken = token) {
    if (!authToken) return;
    const data = await apiFetch<ModuleResultsOverview>(`/api/modules/${moduleId}/final-results`, {}, authToken);
    setOverview(data);
  }

  useEffect(() => {
    async function boot() {
      if (!token) {
        router.push("/login");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const me = await apiFetch<{ user: User }>("/api/me", {}, token);
        if (me.user.role !== "TUTOR") {
          router.push("/login");
          return;
        }
        await loadResults(token);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load module results.");
      } finally {
        setLoading(false);
      }
    }

    void boot();
  }, [moduleId, router, token]);

  async function calculateResults() {
    if (!token) return;
    setCalculating(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<ModuleResultsOverview>(`/api/modules/${moduleId}/final-results/calculate`, { method: "POST" }, token);
      setOverview(data);
      setSuccess(data.message || "Grades calculated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to calculate grades.");
    } finally {
      setCalculating(false);
    }
  }

  async function publishResults() {
    if (!token) return;
    setPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<ModuleResultsOverview>(`/api/modules/${moduleId}/final-results/publish`, { method: "PATCH" }, token);
      setOverview(data);
      setSuccess(data.message || "Results published successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish results.");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <div className={`${shell} p-6`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700">Module Results</div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">
                {overview ? `${overview.module.moduleCode} - ${overview.module.name}` : "Module Results"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">Review every student mark in one table, calculate grades when you are ready, and publish the final result set to students.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => router.push(`/tutor/assignments?tab=assignments&moduleId=${moduleId}`)} className="rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50">
                Back to Assessments
              </button>
              <button type="button" onClick={() => void loadResults()} className="rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        {success ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div> : null}

        {loading ? (
          <div className={`${shell} p-6 text-sm text-slate-500`}>Loading results...</div>
        ) : !overview ? (
          <div className={`${shell} p-6 text-sm text-slate-500`}>Result data is unavailable.</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <StatCard label="Students" value={String(overview.summary.totalStudents).padStart(2, "0")} note="Students registered to this module." />
              <StatCard label="Calculated" value={String(overview.summary.calculatedCount).padStart(2, "0")} note="Rows with a final grade already calculated." />
              <StatCard label="Pass" value={String(overview.summary.passCount).padStart(2, "0")} note="Students who passed the module." />
              <StatCard label="Cond. Pass" value={String(overview.summary.conditionalPassCount).padStart(2, "0")} note="Students with a conditional pass." />
              <StatCard label="Fail" value={String(overview.summary.failCount).padStart(2, "0")} note="Students who failed the module." />
              <StatCard label="Absent" value={String(overview.summary.absentCount).padStart(2, "0")} note="Students with no on-time work submitted." />
            </div>

            <div className={`${shell} p-5`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Publication Status</div>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">{overview.readiness?.message || "Publishing becomes available after every published assignment and quiz deadline has passed, and after the tutor evaluates all assignment and quiz marks."}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => void publishResults()} disabled={publishing || !overview.readiness?.canPublish} className="rounded-full bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">
                    {publishing ? "Publishing..." : "Publish Results"}
                  </button>
                </div>
              </div>
            </div>

            <div className={`${shell} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-slate-700">
                  <thead className="bg-blue-50 text-xs uppercase tracking-[0.18em] text-blue-700">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Assignment Marks</th>
                      <th className="px-4 py-3 text-left">Quiz Marks</th>
                      <th className="px-4 py-3 text-left">Final Mark</th>
                      <th className="px-4 py-3 text-left">Percentage</th>
                      <th className="px-4 py-3 text-left">Grade</th>
                      <th className="px-4 py-3 text-left">Pass Status</th>
                      <th className="px-4 py-3 text-left">Publication</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.results.map((row) => (
                      <tr key={row._id} className="border-t border-blue-100">
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-slate-900">{row.student.fullName}</div>
                          <div className="text-xs text-slate-500">{row.student.userId}</div>
                          <div className="text-xs text-slate-500">{row.student.email}</div>
                        </td>
                        <td className="px-4 py-3 align-top">{row.breakdown.assignmentTotal > 0 ? `${row.breakdown.assignmentObtained} / ${row.breakdown.assignmentTotal}` : "--"}</td>
                        <td className="px-4 py-3 align-top">{row.breakdown.quizTotal > 0 ? `${row.breakdown.quizObtained} / ${row.breakdown.quizTotal}` : "--"}</td>
                        <td className="px-4 py-3 align-top">{row.isCalculated && row.obtainedMarks != null ? `${row.obtainedMarks} / ${row.totalMarks}` : "--"}</td>
                        <td className="px-4 py-3 align-top">{row.isCalculated && row.percentage != null ? `${row.percentage}%` : "--"}</td>
                        <td className="px-4 py-3 align-top">
                          {row.isCalculated && row.grade ? <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.grade === "AB" ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"}`}>{row.grade}</span> : "--"}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {row.isCalculated && row.passStatus ? (
                            <>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${passBadge(row.passStatus)}`}>{passLabel(row.passStatus)}</span>
                              {row.hasPendingGrading ? <div className="mt-2 text-xs text-amber-600">Pending grading review</div> : null}
                            </>
                          ) : "--"}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {row.publicationStatus === "PUBLISHED" ? `Published${row.publishedAt ? ` on ${new Date(row.publishedAt).toLocaleString()}` : ""}` : "Draft"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-blue-100 bg-slate-50 px-5 py-4">
                <button type="button" onClick={() => void calculateResults()} disabled={calculating || !overview.readiness?.hasPublishedAssessments} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {calculating ? "Calculating..." : "Calculate Grade"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
