"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type Skill = { id: string; skillName: string; level: string };
type JobRole = { _id: string; title: string; requiredSkills: { name: string; minLevel: string }[] };

const LEVELS = ["beginner", "intermediate", "advanced", "expert"];

function levelColor(level: string) {
  if (level === "expert") return "bg-emerald-100 text-emerald-700";
  if (level === "advanced") return "bg-blue-100 text-blue-700";
  if (level === "intermediate") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

function levelRank(level: string) { return LEVELS.indexOf(level); }

function normalizeJobRole(role: Partial<JobRole> & { _id?: string; title?: string }) : JobRole | null {
  if (!role._id || !role.title) return null;

  const requiredSkills = Array.isArray(role.requiredSkills)
    ? role.requiredSkills
        .filter(
          (item): item is { name: string; minLevel: string } =>
            !!item && typeof item.name === "string" && typeof item.minLevel === "string"
        )
        .map((item) => ({
          name: item.name,
          minLevel: LEVELS.includes(item.minLevel) ? item.minLevel : "beginner",
        }))
    : [];

  return {
    _id: role._id,
    title: role.title,
    requiredSkills,
  };
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillName, setSkillName] = useState("");
  const [level, setLevel] = useState<string>("beginner");
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editLevel, setEditLevel] = useState("beginner");
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [skillsRes, rolesRes] = await Promise.all([
          careerFetch<{ data: { _id: string; skillName: string; level: string }[] }>("/skills"),
          careerFetch<{ data: Array<Partial<JobRole> & { _id?: string; title?: string }> }>("/jobs"),
        ]);
        setSkills((skillsRes.data || []).map((s) => ({ id: s._id, skillName: s.skillName, level: s.level })));
        setJobRoles((rolesRes.data || []).map(normalizeJobRole).filter((role): role is JobRole => role !== null));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addSkill = async () => {
    const name = skillName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await careerFetch<{ data: { _id: string; skillName: string; level: string } }>("/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillName: name, level }),
      });
      setSkills((prev) => [...prev, { id: res.data._id, skillName: res.data.skillName, level: res.data.level }]);
      setSkillName("");
      setLevel("beginner");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add skill");
    } finally {
      setAdding(false);
    }
  };

  const updateSkill = async (id: string) => {
    try {
      await careerFetch(`/skills/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: editLevel }),
      });
      setSkills((prev) => prev.map((s) => s.id === id ? { ...s, level: editLevel } : s));
      setEditId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update skill");
    }
  };

  const deleteSkill = async (id: string) => {
    if (!confirm("Remove this skill?")) return;
    try {
      await careerFetch(`/skills/${id}`, { method: "DELETE" });
      setSkills((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete skill");
    }
  };

  const selectedJobRole = jobRoles.find((r) => r._id === selectedRole);
  const gapSkills = selectedJobRole
    ? (selectedJobRole.requiredSkills || []).filter((req) => {
        const mySkill = skills.find((s) => s.skillName.toLowerCase() === req.name.toLowerCase());
        return !mySkill || levelRank(mySkill.level) < levelRank(req.minLevel);
      })
    : [];

  return (
          <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">My Skills</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your skills and analyze gaps for your target career.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700">{error}</div>
        )}

        <div className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Add Skill</h2>
          <div className="flex flex-wrap gap-3">
            <input
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              placeholder="Skill name (e.g. React)"
              className="flex-1 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
            <button type="button" onClick={addSkill} disabled={adding} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">Loading skills...</p></div>
        ) : skills.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">No skills added yet. Start by adding your first skill above.</p></div>
        ) : (
          <div className="mb-6 rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-slate-900">{skill.skillName}</span>
                    {editId === skill.id ? (
                      <select value={editLevel} onChange={(e) => setEditLevel(e.target.value)} className="rounded-lg border border-blue-200 px-2 py-1 text-xs outline-none focus:border-blue-500">
                        {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                      </select>
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${levelColor(skill.level)}`}>{skill.level}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editId === skill.id ? (
                      <>
                        <button type="button" onClick={() => updateSkill(skill.id)} className="text-sm font-medium text-blue-600 hover:text-blue-700">Save</button>
                        <button type="button" onClick={() => setEditId(null)} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => { setEditId(skill.id); setEditLevel(skill.level); }} className="text-sm text-slate-500 hover:text-slate-700">Edit</button>
                        <button type="button" onClick={() => deleteSkill(skill.id)} className="text-sm text-red-400 hover:text-red-600">Remove</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {jobRoles.length > 0 && (
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Skill Gap Analysis</h2>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Select a target career role</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-2.5 text-sm outline-none focus:border-blue-500">
                <option value="">— Choose a role —</option>
                {jobRoles.map((r) => <option key={r._id} value={r._id}>{r.title}</option>)}
              </select>
            </div>
            {selectedRole && (
              gapSkills.length === 0 ? (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                  You meet all skill requirements for this role!
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-sm text-slate-500">Skills to improve or acquire:</p>
                  <div className="space-y-2">
                    {gapSkills.map((req) => {
                      const mySkill = skills.find((s) => s.skillName.toLowerCase() === req.name.toLowerCase());
                      return (
                        <div key={req.name} className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
                          <span className="text-sm font-medium text-slate-800">{req.name}</span>
                          <span className="text-xs text-amber-700">
                            {mySkill ? `Your level: ${mySkill.level} → Need: ${req.minLevel}` : `Missing — Need: ${req.minLevel}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
  );
}

