"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type JobSuggestion = {
  _id: string;
  title: string;
  matchPercentage: number;
  matchedSkills: { name: string; userLevel: string; requiredLevel: string }[];
  missingSkills: { name: string; requiredLevel: string; userLevel?: string; reason?: string }[];
};

function scoreColor(pct: number) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-500";
}

function scoreBg(pct: number) {
  if (pct >= 80) return "bg-emerald-50 border-emerald-200";
  if (pct >= 50) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

export default function JobSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await careerFetch<{ data: JobSuggestion[] }>("/jobs/suggestions");
        setSuggestions(res.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job suggestions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
          <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Job Suggestions</h1>
          <p className="mt-1 text-sm text-slate-500">Jobs matched to your current skill profile.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">Loading job suggestions...</p></div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><p className="font-medium text-red-700">{error}</p></div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-700">No suggestions yet</p>
            <p className="mt-2 text-sm text-slate-500">Add your skills first to get job match suggestions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {suggestions.slice().sort((a, b) => b.matchPercentage - a.matchPercentage).map((job) => (
              <div key={job._id} className={`rounded-2xl border p-5 shadow-sm ${scoreBg(job.matchPercentage)}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-12 w-12">
                      <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke={job.matchPercentage >= 80 ? "#059669" : job.matchPercentage >= 50 ? "#d97706" : "#ef4444"} strokeWidth="3" strokeDasharray={`${(job.matchPercentage / 100) * 94.25} 94.25`} strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${scoreColor(job.matchPercentage)}`}>{job.matchPercentage}%</p>
                      <p className="text-xs text-slate-400">match</p>
                    </div>
                  </div>
                </div>

                {job.matchedSkills.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500">Matched Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.matchedSkills.map((s) => (
                        <span key={s.name} className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          {s.name} <span className="opacity-70">({s.userLevel})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job.missingSkills.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs font-medium text-slate-500">Missing / Needs Improvement</p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.missingSkills.map((s) => (
                        <span key={s.name} className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                          {s.name} <span className="opacity-70">({s.requiredLevel}+ required)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

