"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type CareerRole = { _id: string; title: string; description: string };

export default function AdminCareerRolesPage() {
  const [roles, setRoles] = useState<CareerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CareerRole | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRoles = async () => {
    try {
      const res = await careerFetch<{ data: CareerRole[] }>("/admin/careers");
      setRoles(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load career roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRoles(); }, []);

  const openCreate = () => { setEditing(null); setFormTitle(""); setFormDesc(""); setShowForm(true); };
  const openEdit = (r: CareerRole) => { setEditing(r); setFormTitle(r.title); setFormDesc(r.description); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const save = async () => {
    if (!formTitle.trim()) { alert("Title is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        const res = await careerFetch<{ data: CareerRole }>(`/admin/careers/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle.trim(), description: formDesc.trim() }),
        });
        setRoles((prev) => prev.map((r) => r._id === editing._id ? res.data : r));
      } else {
        const res = await careerFetch<{ data: CareerRole }>("/admin/careers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: formTitle.trim(), description: formDesc.trim() }),
        });
        setRoles((prev) => [...prev, res.data]);
      }
      closeForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteRole = async (id: string) => {
    if (!confirm("Delete this career role?")) return;
    try {
      await careerFetch(`/admin/careers/${id}`, { method: "DELETE" });
      setRoles((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  return (
          <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Career Roles</h1>
            <p className="mt-1 text-sm text-slate-500">Manage career paths available for student roadmaps.</p>
          </div>
          <button type="button" onClick={openCreate} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ New Role</button>
        </div>

        {error && <div className="mb-4 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}</div>}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">{editing ? "Edit Career Role" : "New Career Role"}</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
                <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Frontend Developer" className="w-full rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
                <textarea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Brief description of this career path..." className="w-full rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500" />
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
        ) : roles.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">No career roles yet. Create the first one above.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {roles.map((r) => (
              <div key={r._id} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{r.title}</h3>
                    {r.description && <p className="mt-1 text-sm text-slate-500">{r.description}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={() => openEdit(r)} className="text-sm text-blue-600 hover:text-blue-700">Edit</button>
                    <button type="button" onClick={() => deleteRole(r._id)} className="text-sm text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

