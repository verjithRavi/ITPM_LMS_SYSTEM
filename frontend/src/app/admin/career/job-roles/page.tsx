"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type CareerRole = { _id: string; title: string };
type RequiredSkill = { name: string; minLevel: string };
type JobRole = { _id: string; title: string; linkedCareerRoleId?: string | { _id: string; title: string }; requiredSkills: RequiredSkill[]; keywords: string[] };

const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

export default function AdminJobRolesPage() {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [careerRoles, setCareerRoles] = useState<CareerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<JobRole | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCareerRole, setFormCareerRole] = useState("");
  const [formSkills, setFormSkills] = useState<RequiredSkill[]>([{ name: "", minLevel: "beginner" }]);
  const [formKeywords, setFormKeywords] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const [jobRes, careerRes] = await Promise.all([
        careerFetch<{ data: JobRole[] }>("/admin/job-roles"),
        careerFetch<{ data: CareerRole[] }>("/admin/careers"),
      ]);
      setJobRoles(jobRes.data || []);
      setCareerRoles(careerRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => {
    setEditing(null); setFormTitle(""); setFormCareerRole(""); setFormSkills([{ name: "", minLevel: "beginner" }]); setFormKeywords(""); setShowForm(true);
  };

  const openEdit = (jr: JobRole) => {
    setEditing(jr);
    setFormTitle(jr.title);
    const crid = typeof jr.linkedCareerRoleId === "object" && jr.linkedCareerRoleId ? jr.linkedCareerRoleId._id : (jr.linkedCareerRoleId as string) || "";
    setFormCareerRole(crid);
    setFormSkills(jr.requiredSkills.length > 0 ? jr.requiredSkills : [{ name: "", minLevel: "beginner" }]);
    setFormKeywords(jr.keywords.join(", "));
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const updateSkill = (i: number, field: keyof RequiredSkill, value: string) => {
    setFormSkills((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const save = async () => {
    if (!formTitle.trim()) { alert("Title is required"); return; }
    const payload = {
      title: formTitle.trim(),
      linkedCareerRoleId: formCareerRole || undefined,
      requiredSkills: formSkills.filter((s) => s.name.trim()),
      keywords: formKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    };
    setSaving(true);
    try {
      if (editing) {
        const res = await careerFetch<{ data: JobRole }>(`/admin/job-roles/${editing._id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        setJobRoles((prev) => prev.map((jr) => jr._id === editing._id ? res.data : jr));
      } else {
        const res = await careerFetch<{ data: JobRole }>("/admin/job-roles", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        setJobRoles((prev) => [...prev, res.data]);
      }
      closeForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteJobRole = async (id: string) => {
    if (!confirm("Delete this job role?")) return;
    try {
      await careerFetch(`/admin/job-roles/${id}`, { method: "DELETE" });
      setJobRoles((prev) => prev.filter((jr) => jr._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const getCareerTitle = (linkedId: unknown) => {
    if (typeof linkedId === "object" && linkedId && "title" in (linkedId as object)) return (linkedId as { title: string }).title;
    const found = careerRoles.find((cr) => cr._id === linkedId);
    return found?.title || "";
  };

  return (
          <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Roles</h1>
            <p className="mt-1 text-sm text-slate-500">Define job roles and their skill requirements for matching.</p>
          </div>
          <button type="button" onClick={openCreate} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ New Job Role</button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">{editing ? "Edit Job Role" : "New Job Role"}</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Job Title</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="w-full rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Linked Career Role (optional)</label>
                <select value={formCareerRole} onChange={(e) => setFormCareerRole(e.target.value)} className="w-full rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
                  <option value="">— None —</option>
                  {careerRoles.map((cr) => <option key={cr._id} value={cr._id}>{cr.title}</option>)}
                </select>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Required Skills</label>
                  <button type="button" onClick={() => setFormSkills((prev) => [...prev, { name: "", minLevel: "beginner" }])} className="text-xs text-blue-600 hover:text-blue-700">+ Add Skill</button>
                </div>
                <div className="space-y-2">
                  {formSkills.map((sk, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={sk.name} onChange={(e) => updateSkill(i, "name", e.target.value)} placeholder="Skill name" className="flex-1 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                      <select value={sk.minLevel} onChange={(e) => updateSkill(i, "minLevel", e.target.value)} className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-sm outline-none focus:border-blue-500">
                        {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                      </select>
                      {formSkills.length > 1 && (
                        <button type="button" onClick={() => setFormSkills((prev) => prev.filter((_, idx) => idx !== i))} className="text-sm text-red-400 hover:text-red-600">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Keywords <span className="text-slate-400 text-xs">(comma-separated, used for resume matching)</span></label>
                <input value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)} placeholder="React, TypeScript, REST API" className="w-full rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
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
        ) : jobRoles.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">No job roles yet. Create the first one above.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {jobRoles.map((jr) => (
              <div key={jr._id} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{jr.title}</h3>
                    {getCareerTitle(jr.linkedCareerRoleId) && (
                      <p className="mt-0.5 text-xs text-slate-400">Career: {getCareerTitle(jr.linkedCareerRoleId)}</p>
                    )}
                    {jr.requiredSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {jr.requiredSkills.map((s, i) => (
                          <span key={i} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{s.name} ({s.minLevel})</span>
                        ))}
                      </div>
                    )}
                    {jr.keywords.length > 0 && (
                      <p className="mt-2 text-xs text-slate-400">Keywords: {jr.keywords.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => openEdit(jr)} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                    <button type="button" onClick={() => deleteJobRole(jr._id)} className="text-sm text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

