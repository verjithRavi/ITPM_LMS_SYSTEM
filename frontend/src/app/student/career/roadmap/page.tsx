"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type CareerRole = { _id: string; title: string; description: string };
type RoadmapStep = { title: string; skills: string[]; certifications: string[]; projects: string[]; resources: string[] };
type Roadmap = { _id: string; careerRoleId: string; steps: RoadmapStep[] };

export default function RoadmapPage() {
  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<CareerRole | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [progress, setProgress] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await careerFetch<{ data: CareerRole[] }>("/careers");
        setRoles(res.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load career roles");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectRole = async (role: CareerRole) => {
    setSelectedRole(role);
    setRoadmap(null);
    setProgress([]);
    setRoadmapLoading(true);
    try {
      const [rmRes, progRes] = await Promise.all([
        careerFetch<{ data: Roadmap }>(`/careers/${role._id}/roadmap`),
        careerFetch<{ data: { completedStepIndexes: number[] } }>(`/careers/${role._id}/progress`),
      ]);
      setRoadmap(rmRes.data);
      setProgress(progRes.data?.completedStepIndexes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roadmap");
    } finally {
      setRoadmapLoading(false);
    }
  };

  const toggleStep = async (index: number) => {
    if (!selectedRole) return;
    const newProgress = progress.includes(index)
      ? progress.filter((i) => i !== index)
      : [...progress, index];
    setProgress(newProgress);
    setSaving(true);
    try {
      await careerFetch(`/careers/${selectedRole._id}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedStepIndexes: newProgress }),
      });
    } catch {
      setProgress(progress);
    } finally {
      setSaving(false);
    }
  };

  const completionPct = roadmap ? Math.round((progress.length / roadmap.steps.length) * 100) : 0;

  return (
          <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Career Roadmap</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a career path and track your learning journey.</p>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">Loading career roles...</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
            <div>
              <p className="mb-3 text-sm font-medium text-slate-500">Select a Career Path</p>
              <div className="space-y-2">
                {roles.map((role) => (
                  <button
                    key={role._id}
                    type="button"
                    onClick={() => selectRole(role)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${selectedRole?._id === role._id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-blue-100 bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    <span className="block font-semibold">{role.title}</span>
                    {role.description && <span className="mt-0.5 block text-xs text-slate-400">{role.description}</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              {!selectedRole ? (
                <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
                  <p className="text-slate-500">Select a career path to view the roadmap.</p>
                </div>
              ) : roadmapLoading ? (
                <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">Loading roadmap...</p></div>
              ) : !roadmap ? (
                <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">No roadmap available for this career path.</p></div>
              ) : (
                <div>
                  <div className="mb-5 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">Progress</span>
                      <span className="text-sm font-semibold text-blue-600">{progress.length}/{roadmap.steps.length} steps {saving ? "(saving...)" : ""}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${completionPct}%` }} />
                    </div>
                    <p className="mt-1 text-right text-xs text-slate-400">{completionPct}% complete</p>
                  </div>

                  <div className="space-y-4">
                    {roadmap.steps.map((step, index) => {
                      const done = progress.includes(index);
                      return (
                        <div key={index} className={`rounded-2xl border p-5 shadow-sm transition ${done ? "border-emerald-200 bg-emerald-50" : "border-blue-100 bg-white"}`}>
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => toggleStep(index)}
                              className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition ${done ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-blue-400"}`}
                            >
                              {done && <svg viewBox="0 0 24 24" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
                            </button>
                            <div className="flex-1">
                              <h3 className={`font-semibold ${done ? "text-emerald-700 line-through" : "text-slate-900"}`}>
                                Step {index + 1}: {step.title}
                              </h3>

                              {step.skills.length > 0 && (
                                <div className="mt-3">
                                  <p className="mb-1.5 text-xs font-medium text-slate-500">Skills to Learn</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {step.skills.map((s, i) => (
                                      <span key={i} className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700">{s}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {step.certifications.length > 0 && (
                                <div className="mt-3">
                                  <p className="mb-1.5 text-xs font-medium text-slate-500">Certifications</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {step.certifications.map((c, i) => (
                                      <span key={i} className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700">{c}</span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {step.projects.length > 0 && (
                                <div className="mt-3">
                                  <p className="mb-1.5 text-xs font-medium text-slate-500">Practice Projects</p>
                                  <ul className="list-inside list-disc space-y-0.5">
                                    {step.projects.map((p, i) => (
                                      <li key={i} className="text-xs text-slate-600">{p}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {step.resources.length > 0 && (
                                <div className="mt-3">
                                  <p className="mb-1.5 text-xs font-medium text-slate-500">Resources</p>
                                  <ul className="list-inside list-disc space-y-0.5">
                                    {step.resources.map((r, i) => (
                                      <li key={i} className="text-xs text-slate-600">{r}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
  );
}

