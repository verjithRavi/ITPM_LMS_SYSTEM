"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { downloadCertificatePdf } from "@/lib/certificate";

type User = { _id: string; role: "STUDENT" | "TUTOR" | "ADMIN"; fullName: string };
type ModuleItem = { _id: string; moduleCode: string; name: string; faculty: string; year: number; semester: number };
type ModuleResultRow = {
  _id: string;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  passStatus: "PASS" | "CONDITIONAL_PASS" | "FAIL" | "ABSENT";
  publicationStatus: "DRAFT" | "PUBLISHED";
  hasPendingGrading: boolean;
  calculatedAt: string;
  publishedAt: string | null;
  breakdown: {
    assignmentObtained: number;
    assignmentTotal: number;
    quizObtained: number;
    quizTotal: number;
    combinedObtained: number;
    combinedTotal: number;
  };
};
type MarksItem = { module: ModuleItem; result: ModuleResultRow | null };

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
  return "Fail";
}

export default function StudentMarksPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-sm text-slate-500">Loading...</div>}>
      <StudentMarksContent />
    </Suspense>
  );
}

function StudentMarksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => getToken(), []);
  const highlightedModuleId = searchParams.get("moduleId");
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<MarksItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingModuleId, setGeneratingModuleId] = useState<string | null>(null);
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

        const data = await apiFetch<{ items: MarksItem[] }>("/api/modules/my-results", {}, token);
        setItems(data.items);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load marks.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router, token]);

  const sortedItems = useMemo(() => {
    if (!highlightedModuleId) return items;
    return [...items].sort((a, b) => {
      if (a.module._id === highlightedModuleId) return -1;
      if (b.module._id === highlightedModuleId) return 1;
      return a.module.name.localeCompare(b.module.name);
    });
  }, [highlightedModuleId, items]);

  function generateCertificate(item: MarksItem) {
    if (!user || !item.result) return;
    setGeneratingModuleId(item.module._id);
    try {
      downloadCertificatePdf({
        studentName: user.fullName,
        moduleCode: item.module.moduleCode,
        moduleName: item.module.name,
        faculty: item.module.faculty,
        year: item.module.year,
        semester: item.module.semester,
        obtainedMarks: item.result.obtainedMarks,
        totalMarks: item.result.totalMarks,
        percentage: item.result.percentage,
        grade: item.result.grade,
        passStatus: passLabel(item.result.passStatus),
        publishedAt: item.result.publishedAt,
      });
    } finally {
      window.setTimeout(() => setGeneratingModuleId((current) => current === item.module._id ? null : current), 600);
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <div className="rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_22px_60px_rgba(37,99,235,0.08)]">
          <div className="text-xs font-medium uppercase tracking-[0.24em] text-blue-700">Marks Center</div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Your Module Marks</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">
            {user ? `Published module results for ${user.fullName}.` : "Published marks for each registered module are shown here."}
          </p>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="rounded-[26px] border border-blue-100 bg-white p-5 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">Published Results</div>
              <p className="mt-1 text-sm text-slate-600">Only published module results are visible here.</p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {loading ? "..." : `${sortedItems.filter((item) => item.result).length} published`}
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading marks...</div>
          ) : sortedItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-100 bg-blue-50/40 p-5 text-sm text-slate-500">
              No registered modules found.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedItems.map((item) => (
                <div key={item.module._id} className={`rounded-[24px] border p-5 ${item.module._id === highlightedModuleId ? "border-emerald-300 bg-emerald-50/50" : "border-blue-100 bg-white"}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xl font-semibold text-slate-900">{item.module.moduleCode} - {item.module.name}</div>
                        {item.module._id === highlightedModuleId ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">New</span> : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1">{item.module.faculty}</span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1">Year {item.module.year}</span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1">Semester {item.module.semester}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {item.result ? (
                        <button
                          type="button"
                          onClick={() => generateCertificate(item)}
                          disabled={generatingModuleId === item.module._id}
                          className="rounded-full bg-[linear-gradient(135deg,#0f766e,#14b8a6,#99f6e4)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_16px_35px_rgba(20,184,166,0.28)] transition hover:-translate-y-0.5 disabled:opacity-60"
                        >
                          {generatingModuleId === item.module._id ? "Generating PDF..." : "Generate Certificate"}
                        </button>
                      ) : null}
                      <button type="button" onClick={() => router.push(`/student/modules/${item.module._id}`)} className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">
                        Open Module
                      </button>
                    </div>
                  </div>

                  {item.result ? (
                    <div className="mt-5 overflow-x-auto">
                      <table className="min-w-full text-sm text-slate-700">
                        <thead className="bg-blue-50 text-xs uppercase tracking-[0.18em] text-blue-700">
                          <tr>
                            <th className="px-4 py-3 text-left">Assignment Marks</th>
                            <th className="px-4 py-3 text-left">Quiz Marks</th>
                            <th className="px-4 py-3 text-left">Final Mark</th>
                            <th className="px-4 py-3 text-left">Percentage</th>
                            <th className="px-4 py-3 text-left">Grade</th>
                            <th className="px-4 py-3 text-left">Pass Status</th>
                            <th className="px-4 py-3 text-left">Published</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-blue-100">
                            <td className="px-4 py-3">{item.result.breakdown.assignmentTotal > 0 ? `${item.result.breakdown.assignmentObtained} / ${item.result.breakdown.assignmentTotal}` : "--"}</td>
                            <td className="px-4 py-3">{item.result.breakdown.quizTotal > 0 ? `${item.result.breakdown.quizObtained} / ${item.result.breakdown.quizTotal}` : "--"}</td>
                            <td className="px-4 py-3">{item.result.obtainedMarks} / {item.result.totalMarks}</td>
                            <td className="px-4 py-3">{item.result.percentage}%</td>
                            <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.result.grade === "AB" ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"}`}>{item.result.grade}</span></td>
                            <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${passBadge(item.result.passStatus)}`}>{passLabel(item.result.passStatus)}</span></td>
                            <td className="px-4 py-3">{item.result.publishedAt ? new Date(item.result.publishedAt).toLocaleString() : "Published"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-blue-100 bg-blue-50/40 p-4 text-sm text-slate-500">
                      Results are not published for this module yet.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
