"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type SavedCV = { _id: string; data?: { personal?: { fullName?: string } }; templateId?: unknown };
type CareerRole = { _id: string; title: string };
type ScoreHistory = {
  _id: string;
  cvId: string | { _id: string; data?: { personal?: { fullName?: string } } };
  targetRoleId: string | { _id: string; title?: string };
  score: number;
  missingKeywords: string[];
  suggestions: string[];
  createdAt: string;
};

function scoreColor(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 75) return "bg-emerald-50 border-emerald-200";
  if (score >= 50) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

export default function ResumeScorePage() {
  const [cvList, setCvList] = useState<SavedCV[]>([]);
  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [history, setHistory] = useState<ScoreHistory[]>([]);
  const [selectedCv, setSelectedCv] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [scoring, setScoring] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [cvsRes, rolesRes, histRes] = await Promise.all([
          careerFetch<{ data: SavedCV[] }>("/cv"),
          careerFetch<{ data: CareerRole[] }>("/careers"),
          careerFetch<{ data: ScoreHistory[] }>("/resume/scores/history"),
        ]);
        setCvList(cvsRes.data || []);
        setRoles(rolesRes.data || []);
        setHistory(histRes.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const scoreResume = async () => {
    if (!selectedCv || !selectedRole) { setError("Please select both a CV and a target role."); return; }
    setScoring(true);
    setError("");
    try {
      const res = await careerFetch<{ data: ScoreHistory }>("/resume/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId: selectedCv, targetRoleId: selectedRole }),
      });
      setHistory((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to score resume");
    } finally {
      setScoring(false);
    }
  };

  const deleteScore = async (id: string) => {
    if (!confirm("Delete this score?")) return;
    try {
      await careerFetch(`/resume/scores/${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete score");
    }
  };

  const getCvName = (cvId: unknown) => {
    if (typeof cvId === "object" && cvId && "data" in (cvId as object)) {
      return (cvId as SavedCV).data?.personal?.fullName || "Untitled CV";
    }
    const found = cvList.find((c) => c._id === cvId);
    return found?.data?.personal?.fullName || "Untitled CV";
  };

  const getRoleName = (roleId: unknown) => {
    if (typeof roleId === "object" && roleId && "title" in (roleId as object)) {
      return (roleId as { title?: string }).title || "Unknown Role";
    }
    const found = roles.find((r) => r._id === roleId);
    return found?.title || "Unknown Role";
  };

  return (
          <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Resume Score</h1>
          <p className="mt-1 text-sm text-slate-500">Analyze how well your CV matches a target career role.</p>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}</div>}

        <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Score Your Resume</h2>
          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              <select value={selectedCv} onChange={(e) => setSelectedCv(e.target.value)} className="flex-1 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="">— Select a CV —</option>
                {cvList.map((cv) => (
                  <option key={cv._id} value={cv._id}>{cv.data?.personal?.fullName || "Untitled CV"}</option>
                ))}
              </select>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="flex-1 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="">— Select Target Role —</option>
                {roles.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}
              </select>
              <button type="button" onClick={scoreResume} disabled={scoring} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                {scoring ? "Scoring..." : "Analyze"}
              </button>
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-base font-semibold text-slate-900">Score History</h2>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
              <p className="text-slate-500">No scores yet. Analyze your resume above to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((score) => (
                <div key={score._id} className={`rounded-2xl border p-5 shadow-sm ${scoreBg(score.score)}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{getCvName(score.cvId)}</p>
                      <p className="mt-0.5 text-sm text-slate-500">Target: {getRoleName(score.targetRoleId)}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{new Date(score.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`text-3xl font-bold ${scoreColor(score.score)}`}>{score.score}<span className="text-base font-normal text-slate-400">/100</span></p>
                      <button type="button" onClick={() => deleteScore(score._id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  </div>

                  {score.missingKeywords.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-slate-500">Missing Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {score.missingKeywords.map((kw, i) => (
                          <span key={i} className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-600">{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {score.suggestions.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-medium text-slate-500">Suggestions</p>
                      <ul className="space-y-1">
                        {score.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                            <span className="mt-0.5 flex-shrink-0 text-blue-500">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
  );
}

