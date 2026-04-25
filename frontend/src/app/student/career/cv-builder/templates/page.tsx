"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type TemplateItem = { id: string; slug: string; name: string; description: string };

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

function slugify(name: string) { return name.trim().toLowerCase().replace(/\s+/g, "-"); }

function getTemplateDescription(name: string) {
  const n = name.trim().toLowerCase();
  if (n === "classic") return "A clean and traditional CV design for a professional look.";
  if (n === "modern") return "A stylish contemporary layout with a fresh visual structure.";
  if (n === "minimal") return "A simple and elegant design focused on clarity.";
  if (n === "professional") return "A polished template designed to highlight your strengths.";
  return "A CV template ready for you to customize.";
}

function getTemplateColor(slug: string) {
  if (slug === "modern") return "bg-cyan-50 text-cyan-600";
  if (slug === "minimal") return "bg-slate-50 text-slate-900";
  if (slug === "professional") return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
}

export default function CVTemplatePage() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await careerFetch<{ data: { _id: string; name: string; isActive: boolean }[] }>("/cv/templates");
        setTemplates((res.data || []).filter((t) => t.isActive).map((t) => ({ id: t._id, slug: slugify(t.name), name: t.name, description: getTemplateDescription(t.name) })));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load templates");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
          <div>
        <div className="mb-8 flex items-center gap-4">
          <Link href="/student/career/cv-builder" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Choose a Template</h1>
            <p className="mt-1 text-sm text-slate-500">Select a design for your CV.</p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">Loading templates...</p></div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><p className="font-medium text-red-700">Failed to load templates</p><p className="mt-1 text-sm text-slate-500">{error}</p></div>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm"><p className="text-slate-500">No active templates. Ask the admin to activate templates.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {templates.map((template) => (
              <Link key={template.id} href={`/student/career/cv-builder/create/${template.slug}?templateId=${template.id}`} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`mb-5 flex h-48 items-center justify-center rounded-xl text-5xl font-bold ${getTemplateColor(template.slug)}`}>{template.name.charAt(0)}</div>
                <h3 className="text-lg font-semibold text-slate-900">{template.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{template.description}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
  );
}

