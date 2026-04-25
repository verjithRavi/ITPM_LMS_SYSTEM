"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type SavedCV = { id: string; template: string; fullName: string; updatedAt: string; status: string };

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

function mapBackendCv(cv: { _id: string; templateId?: unknown; data?: { personal?: { fullName?: string } }; updatedAt: string; status: string }): SavedCV {
  const templateName = typeof cv.templateId === "object" && cv.templateId && "name" in cv.templateId ? (cv.templateId as { name?: string }).name || "Classic" : "Classic";
  return { id: cv._id, template: templateName, fullName: cv.data?.personal?.fullName || "Untitled CV", updatedAt: cv.updatedAt, status: cv.status === "final" ? "completed" : cv.status };
}

export default function CVBuilderPage() {
  const [cvList, setCvList] = useState<SavedCV[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadCvs = async () => {
    try {
      const res = await careerFetch<{ data: unknown[] }>("/cv");
      setCvList(((res.data || []) as Parameters<typeof mapBackendCv>[0][]).map(mapBackendCv));
    } catch (error) {
      console.error("Failed to load CVs:", error);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => { loadCvs(); }, []);

  const deleteCV = async (id: string) => {
    if (!confirm("Delete this CV?")) return;
    try {
      await careerFetch(`/cv/${id}`, { method: "DELETE" });
      setCvList((prev) => prev.filter((cv) => cv.id !== id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete CV");
    }
  };

  return (
          <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CV Builder</h1>
            <p className="mt-1 text-sm text-slate-500">Create, manage, and download your CVs.</p>
          </div>
          <Link href="/student/career/cv-builder/templates" className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">+ New CV</Link>
        </div>

        {!isLoaded ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">Loading CVs...</p></div>
        ) : cvList.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-700">No CVs yet</p>
            <p className="mt-2 text-sm text-slate-500">Create your first CV to get started.</p>
            <Link href="/student/career/cv-builder/templates" className="mt-4 inline-block rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Create CV</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {cvList.map((cv) => (
              <div key={cv.id} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{cv.fullName}</p>
                    <p className="mt-1 text-sm text-slate-500">Template: {cv.template}</p>
                    <p className="mt-1 text-xs text-slate-400">Updated: {new Date(cv.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cv.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{cv.status === "completed" ? "Final" : "Draft"}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/student/career/cv-builder/view/${cv.id}`} className="flex-1 rounded-xl bg-blue-50 px-3 py-2 text-center text-sm font-medium text-blue-700 hover:bg-blue-100">View</Link>
                  <Link href={`/student/career/cv-builder/create/classic?id=${cv.id}`} className="flex-1 rounded-xl bg-slate-50 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-100">Edit</Link>
                  <button type="button" onClick={() => deleteCV(cv.id)} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
  );
}

