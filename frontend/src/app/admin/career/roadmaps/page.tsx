"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type CareerRole = { _id: string; title: string };
type RoadmapStep = { title: string; skills: string[]; certifications: string[]; projects: string[]; resources: string[] };
type Roadmap = { _id: string; careerRoleId: { _id: string; title: string } | string; steps: RoadmapStep[] };

function emptyStep(): RoadmapStep { return { title: "", skills: [], certifications: [], projects: [], resources: [] }; }
function csvToArr(s: string) { return s.split(",").map((x) => x.trim()).filter(Boolean); }
function arrToCsv(arr: string[]) { return arr.join(", "); }

export default function AdminRoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [careerRoles, setCareerRoles] = useState<CareerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Roadmap | null>(null);
  const [formRole, setFormRole] = useState("");
  const [formSteps, setFormSteps] = useState<(RoadmapStep & { _skills: string; _certs: string; _projects: string; _resources: string })[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [rmRes, crRes] = await Promise.all([
        careerFetch<{ data: Roadmap[] }>("/admin/roadmaps"),
        careerFetch<{ data: CareerRole[] }>("/admin/careers"),
      ]);
      setRoadmaps(rmRes.data || []);
      setCareerRoles(crRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const toFormSteps = (steps: RoadmapStep[]) =>
    steps.map((s) => ({ ...s, _skills: arrToCsv(s.skills), _certs: arrToCsv(s.certifications), _projects: arrToCsv(s.projects), _resources: arrToCsv(s.resources) }));

  const openCreate = () => {
    setEditing(null);
    setFormRole("");
    setFormSteps([{ ...emptyStep(), _skills: "", _certs: "", _projects: "", _resources: "" }]);
    setShowForm(true);
  };

  const openEdit = (rm: Roadmap) => {
    setEditing(rm);
    const rid = typeof rm.careerRoleId === "object" && rm.careerRoleId ? (rm.careerRoleId as { _id: string })._id : (rm.careerRoleId as string);
    setFormRole(rid);
    setFormSteps(toFormSteps(rm.steps));
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const updateStep = (i: number, field: string, value: string) =>
    setFormSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const save = async () => {
    if (!formRole) { alert("Select a career role"); return; }
    const steps: RoadmapStep[] = formSteps.map((s) => ({
      title: s.title,
      skills: csvToArr(s._skills),
      certifications: csvToArr(s._certs),
      projects: csvToArr(s._projects),
      resources: csvToArr(s._resources),
    }));
    setSaving(true);
    try {
      if (editing) {
        const res = await careerFetch<{ data: Roadmap }>(`/admin/roadmaps/${editing._id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careerRoleId: formRole, steps }),
        });
        setRoadmaps((prev) => prev.map((r) => r._id === editing._id ? res.data : r));
      } else {
        const res = await careerFetch<{ data: Roadmap }>("/admin/roadmaps", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ careerRoleId: formRole, steps }),
        });
        setRoadmaps((prev) => [...prev, res.data]);
      }
      closeForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteRoadmap = async (id: string) => {
    if (!confirm("Delete this roadmap?")) return;
    try {
      await careerFetch(`/admin/roadmaps/${id}`, { method: "DELETE" });
      setRoadmaps((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const getRoleTitle = (crid: unknown) => {
    if (typeof crid === "object" && crid && "title" in (crid as object)) return (crid as { title: string }).title;
    return careerRoles.find((cr) => cr._id === crid)?.title || "Unknown";
  };

  const inputCls = "w-full rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm outline-none focus:border-blue-500";

  return (
          <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Career Roadmaps</h1>
            <p className="mt-1 text-sm text-slate-500">Define step-by-step learning paths for career roles.</p>
          </div>
          <button type="button" onClick={openCreate} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ New Roadmap</button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">{editing ? "Edit Roadmap" : "New Roadmap"}</h2>
            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Career Role</label>
                <select value={formRole} onChange={(e) => setFormRole(e.target.value)} className={inputCls}>
                  <option value="">— Select a career role —</option>
                  {careerRoles.map((cr) => <option key={cr._id} value={cr._id}>{cr.title}</option>)}
                </select>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Steps ({formSteps.length})</label>
                  <button type="button" onClick={() => setFormSteps((prev) => [...prev, { ...emptyStep(), _skills: "", _certs: "", _projects: "", _resources: "" }])} className="text-xs text-blue-600 hover:text-blue-700">+ Add Step</button>
                </div>
                <div className="space-y-4">
                  {formSteps.map((step, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">Step {i + 1}</span>
                        {formSteps.length > 1 && (
                          <button type="button" onClick={() => setFormSteps((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Step Title</label>
                          <input value={step.title} onChange={(e) => updateStep(i, "title", e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Skills (comma-separated)</label>
                          <input value={step._skills} onChange={(e) => updateStep(i, "_skills", e.target.value)} placeholder="HTML, CSS, JavaScript" className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Certifications (comma-separated)</label>
                          <input value={step._certs} onChange={(e) => updateStep(i, "_certs", e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Practice Projects (comma-separated)</label>
                          <input value={step._projects} onChange={(e) => updateStep(i, "_projects", e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-500">Resources (comma-separated)</label>
                          <input value={step._resources} onChange={(e) => updateStep(i, "_resources", e.target.value)} className={inputCls} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{saving ? "Saving..." : "Save"}</button>
                <button type="button" onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">Loading...</p></div>
        ) : roadmaps.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">No roadmaps yet. Create the first one above.</p></div>
        ) : (
          <div className="space-y-4">
            {roadmaps.map((rm) => (
              <div key={rm._id} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{getRoleTitle(rm.careerRoleId)}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{rm.steps.length} step{rm.steps.length !== 1 ? "s" : ""}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rm.steps.map((s, i) => (
                        <span key={i} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">Step {i + 1}: {s.title || "Untitled"}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => openEdit(rm)} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                    <button type="button" onClick={() => deleteRoadmap(rm._id)} className="text-sm text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

