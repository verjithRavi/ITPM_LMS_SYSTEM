"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type Template = { _id: string; name: string; isActive: boolean; previewImageUrl?: string };

export default function AdminCVTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadTemplates = async () => {
    try {
      const res = await careerFetch<{ data: Template[] }>("/admin/cv-templates");
      setTemplates(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, []);

  const openCreate = () => { setEditing(null); setFormName(""); setFormActive(true); setShowForm(true); };
  const openEdit = (t: Template) => { setEditing(t); setFormName(t.name); setFormActive(t.isActive); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const save = async () => {
    if (!formName.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        const res = await careerFetch<{ data: Template }>(`/admin/cv-templates/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), isActive: formActive }),
        });
        setTemplates((prev) => prev.map((t) => t._id === editing._id ? res.data : t));
      } else {
        const res = await careerFetch<{ data: Template }>("/admin/cv-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: formName.trim(), isActive: formActive }),
        });
        setTemplates((prev) => [...prev, res.data]);
      }
      closeForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    try {
      await careerFetch(`/admin/cv-templates/${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const toggleActive = async (t: Template) => {
    try {
      const res = await careerFetch<{ data: Template }>(`/admin/cv-templates/${t._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t.name, isActive: !t.isActive }),
      });
      setTemplates((prev) => prev.map((x) => x._id === t._id ? res.data : x));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
          <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CV Templates</h1>
            <p className="mt-1 text-sm text-slate-500">Manage available CV templates for students.</p>
          </div>
          <button type="button" onClick={openCreate} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ New Template</button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">{editing ? "Edit Template" : "New Template"}</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Template Name</label>
                <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Classic" className="w-full rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="active" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} className="h-4 w-4 rounded" />
                <label htmlFor="active" className="text-sm text-slate-700">Active (visible to students)</label>
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
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">No templates yet. Create the first one above.</p></div>
        ) : (
          <div className="rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {templates.map((t) => (
                <div key={t._id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900">{t.name}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${t.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{t.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => toggleActive(t)} className="text-sm text-slate-500 hover:text-slate-700">{t.isActive ? "Deactivate" : "Activate"}</button>
                    <button type="button" onClick={() => openEdit(t)} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                    <button type="button" onClick={() => deleteTemplate(t._id)} className="text-sm text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
  );
}

