"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, buildApiUrl } from "@/lib/api";
import { getToken } from "@/lib/auth";
import ClassicCVPreview from "@/components/career/ClassicCVPreview";
import type { CVState } from "@/components/career/ClassicCVForm";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

function slugify(name: string) { return name.trim().toLowerCase().replace(/\s+/g, "-"); }

const emptyCvData: CVState = {
  fullName: "", email: "", phone: "", location: "", linkedIn: "", github: "",
  summary: "", education: [], experience: [], projects: [], skills: [], skillInput: "",
};

export default function CVViewPage() {
  const params = useParams();
  const cvId = params?.id as string;

  const [cvData, setCvData] = useState<CVState>(emptyCvData);
  const [templateSlug, setTemplateSlug] = useState("classic");
  const [templateId, setTemplateId] = useState("");
  const [status, setStatus] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!cvId) return;
    (async () => {
      try {
        const res = await careerFetch<{ data: { _id: string; templateId?: { _id: string; name: string } | string; data?: { personal?: Record<string, string>; summary?: string; education?: Record<string, string>[]; experience?: Record<string, string>[]; projects?: Record<string, string>[]; skills?: string[] }; status: string } }>(`/cv/${cvId}`);
        const cv = res.data;
        const tid = typeof cv.templateId === "object" && cv.templateId ? cv.templateId._id : (cv.templateId as string) || "";
        const tname = typeof cv.templateId === "object" && cv.templateId && "name" in cv.templateId ? (cv.templateId as { name: string }).name : "Classic";
        setTemplateId(tid);
        setTemplateSlug(slugify(tname));
        setStatus(cv.status === "final" ? "completed" : cv.status);
        const d = cv.data || {};
        const p = d.personal || {};
        setCvData({
          fullName: p.fullName || "",
          email: p.email || "",
          phone: p.phone || "",
          location: p.location || "",
          linkedIn: p.linkedIn || "",
          github: p.github || "",
          summary: d.summary || "",
          education: (d.education || []).map((e) => ({ id: crypto.randomUUID(), institution: e.institution || "", degree: e.degree || "", field: e.field || "", start: e.start || "", end: e.end || "" })),
          experience: (d.experience || []).map((e) => ({ id: crypto.randomUUID(), company: e.company || "", position: e.position || "", start: e.start || "", end: e.end || "", description: e.description || "" })),
          projects: (d.projects || []).map((p2) => ({ id: crypto.randomUUID(), name: p2.name || "", link: p2.link || "", description: p2.description || "", technologies: p2.technologies || "" })),
          skills: d.skills || [],
          skillInput: "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load CV");
      } finally {
        setLoading(false);
      }
    })();
  }, [cvId]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = getToken() || "";
      const res = await fetch(buildApiUrl(`/api/career/cv/${cvId}/download`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cvData.fullName || "cv"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
              <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">Loading CV...</p>
        </div>
      );
  }

  if (error) {
    return (
              <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <p className="font-medium text-red-700">Failed to load CV</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      );
  }

  return (
          <div>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/student/career/cv-builder" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{cvData.fullName || "CV Preview"}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {status === "completed" ? "Final" : "Draft"}
                </span>
                <span className="text-sm text-slate-500">{templateSlug.charAt(0).toUpperCase() + templateSlug.slice(1)} template</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/student/career/cv-builder/create/${templateSlug}?id=${cvId}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Edit
            </Link>
            <button type="button" onClick={handleDownload} disabled={downloading} className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
              {downloading ? "Generating PDF..." : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-3xl">
          <ClassicCVPreview cvData={cvData} template={templateSlug} />
        </div>
      </div>
  );
}
