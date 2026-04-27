"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import ClassicCVForm, { type CVState, type CVErrors } from "@/components/career/ClassicCVForm";
import ClassicCVPreview from "@/components/career/ClassicCVPreview";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

const defaultCvData: CVState = {
  fullName: "", email: "", phone: "", location: "", linkedIn: "", github: "",
  summary: "",
  education: [{ id: crypto.randomUUID(), institution: "", degree: "", field: "", start: "", end: "" }],
  experience: [{ id: crypto.randomUUID(), company: "", position: "", start: "", end: "", description: "" }],
  projects: [{ id: crypto.randomUUID(), name: "", link: "", description: "", technologies: "" }],
  skills: [],
  skillInput: "",
};

function validateCvData(cvData: CVState): { errors: CVErrors; valid: boolean } {
  const errors: CVErrors = {};
  let valid = true;

  if (!cvData.fullName.trim()) { errors.fullName = "Full name is required"; valid = false; }
  if (!cvData.email.trim()) { errors.email = "Email is required"; valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cvData.email.trim())) { errors.email = "Enter a valid email"; valid = false; }
  if (!cvData.phone.trim()) { errors.phone = "Phone is required"; valid = false; }
  else if (cvData.phone.replace(/\D/g, "").length !== 10) { errors.phone = "Must be 10 digits"; valid = false; }
  if (!cvData.location.trim()) { errors.location = "Location is required"; valid = false; }
  if (!cvData.summary.trim()) { errors.summary = "Summary is required"; valid = false; }
  else if (cvData.summary.trim().length < 10) { errors.summary = "At least 10 characters"; valid = false; }

  const eduErrors = cvData.education.map((e) => (e.institution || e.degree) && !e.institution ? "Institution is required" : "");
  if (eduErrors.some(Boolean)) { errors.education = eduErrors; valid = false; }

  if (cvData.skills.length === 0) { errors.skills = "Add at least one skill"; valid = false; }

  return { errors, valid };
}

function buildPayload(cvData: CVState, templateId: string, status: "draft" | "final") {
  return {
    templateId,
    status,
    data: {
      personal: {
        fullName: cvData.fullName,
        email: cvData.email,
        phone: cvData.phone,
        location: cvData.location,
        linkedin: cvData.linkedIn,   // DB field is lowercase "linkedin"
        github: cvData.github,
      },
      summary: cvData.summary,
      education: cvData.education
        .filter((e) => e.institution || e.degree)
        .map(({ id: _id, institution, degree, field, start, end }) => ({
          institution,
          degree,
          fieldOfStudy: field,   // DB field is "fieldOfStudy"
          startDate: start,      // DB field is "startDate"
          endDate: end,          // DB field is "endDate"
        })),
      experience: cvData.experience
        .filter((e) => e.company || e.position)
        .map(({ id: _id, company, position, start, end, description }) => ({
          company,
          jobTitle: position,    // DB field is "jobTitle"
          startDate: start,      // DB field is "startDate"
          endDate: end,          // DB field is "endDate"
          description,
        })),
      projects: cvData.projects
        .filter((p) => p.name)
        .map(({ id: _id, name, link, description, technologies }) => ({
          title: name,           // DB field is "title"
          link,
          description,
          technologies: technologies
            ? technologies.split(",").map((t) => t.trim()).filter(Boolean)
            : [],               // DB stores as [String] array
        })),
      skills: cvData.skills,
    },
  };
}

type BackendCv = {
  _id: string;
  templateId?: { _id: string; name: string } | string;
  data?: {
    personal?: {
      fullName?: string; email?: string; phone?: string; location?: string;
      linkedin?: string; linkedIn?: string; github?: string;
    };
    summary?: string;
    education?: {
      institution?: string; degree?: string;
      fieldOfStudy?: string; field?: string;
      startDate?: string; start?: string;
      endDate?: string; end?: string;
    }[];
    experience?: {
      company?: string;
      jobTitle?: string; position?: string;
      startDate?: string; start?: string;
      endDate?: string; end?: string;
      description?: string;
    }[];
    projects?: {
      title?: string; name?: string;
      link?: string; description?: string;
      technologies?: string[] | string;
    }[];
    skills?: string[];
  };
};

export default function CVCreatePage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-sm text-slate-500">Loading...</div>}>
      <CVCreateContent />
    </Suspense>
  );
}

function CVCreateContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateSlug = (params?.template as string) || "classic";
  const templateIdParam = searchParams?.get("templateId") || "";
  const editId = searchParams?.get("id") || "";

  const [cvData, setCvData] = useState<CVState>(defaultCvData);
  const [errors, setErrors] = useState<CVErrors>({});
  const [templateId, setTemplateId] = useState(templateIdParam);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSavingComplete, setIsSavingComplete] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [cvId, setCvId] = useState(editId);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadExistingCv = useCallback(async (id: string) => {
    try {
      const res = await careerFetch<{ data: BackendCv }>(`/cv/${id}`);
      const cv = res.data;
      const tid = typeof cv.templateId === "object" && cv.templateId ? cv.templateId._id : (cv.templateId as string) || templateIdParam;
      setTemplateId(tid);
      const d = cv.data || {};
      const p = d.personal || {};
      setCvData({
        fullName: p.fullName || "",
        email: p.email || "",
        phone: p.phone || "",
        location: p.location || "",
        linkedIn: p.linkedin || p.linkedIn || "",   // DB uses "linkedin"
        github: p.github || "",
        summary: d.summary || "",
        education: (d.education || []).length > 0
          ? (d.education || []).map((e) => ({
              id: crypto.randomUUID(),
              institution: e.institution || "",
              degree: e.degree || "",
              field: e.fieldOfStudy || e.field || "",    // DB uses "fieldOfStudy"
              start: e.startDate || e.start || "",       // DB uses "startDate"
              end: e.endDate || e.end || "",             // DB uses "endDate"
            }))
          : [{ id: crypto.randomUUID(), institution: "", degree: "", field: "", start: "", end: "" }],
        experience: (d.experience || []).length > 0
          ? (d.experience || []).map((e) => ({
              id: crypto.randomUUID(),
              company: e.company || "",
              position: e.jobTitle || e.position || "", // DB uses "jobTitle"
              start: e.startDate || e.start || "",      // DB uses "startDate"
              end: e.endDate || e.end || "",            // DB uses "endDate"
              description: e.description || "",
            }))
          : [{ id: crypto.randomUUID(), company: "", position: "", start: "", end: "", description: "" }],
        projects: (d.projects || []).length > 0
          ? (d.projects || []).map((p2) => ({
              id: crypto.randomUUID(),
              name: p2.title || p2.name || "",           // DB uses "title"
              link: p2.link || "",
              description: p2.description || "",
              technologies: Array.isArray(p2.technologies)
                ? p2.technologies.join(", ")             // DB stores as [String]
                : (p2.technologies || ""),
            }))
          : [{ id: crypto.randomUUID(), name: "", link: "", description: "", technologies: "" }],
        skills: d.skills || [],
        skillInput: "",
      });
    } catch {
      showToast("error", "Failed to load CV");
    } finally {
      setLoading(false);
    }
  }, [templateIdParam]);

  const resolveTemplateId = useCallback(async () => {
    if (templateIdParam) { setTemplateId(templateIdParam); return; }
    try {
      const res = await careerFetch<{ data: { _id: string; name: string; isActive: boolean }[] }>("/cv/templates");
      const match = (res.data || []).find((t) => t.isActive && t.name.trim().toLowerCase().replace(/\s+/g, "-") === templateSlug);
      if (match) setTemplateId(match._id);
    } catch { /* ignore */ }
  }, [templateIdParam, templateSlug]);

  useEffect(() => {
    if (editId) {
      loadExistingCv(editId);
    } else {
      resolveTemplateId();
    }
  }, [editId, loadExistingCv, resolveTemplateId]);

  const save = async (status: "draft" | "final") => {
    if (status === "final") {
      const { errors: errs, valid } = validateCvData(cvData);
      if (!valid) { setErrors(errs); showToast("error", "Please fix validation errors"); return; }
    }
    const setter = status === "draft" ? setIsSavingDraft : setIsSavingComplete;
    setter(true);
    try {
      const payload = buildPayload(cvData, templateId, status);
      if (cvId) {
        await careerFetch(`/cv/${cvId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        showToast("success", status === "draft" ? "Draft saved!" : "CV saved as complete!");
      } else {
        const res = await careerFetch<{ data: { _id: string } }>("/cv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const newId = res.data._id;
        setCvId(newId);
        showToast("success", status === "draft" ? "Draft saved!" : "CV saved as complete!");
        if (status === "final") setTimeout(() => router.push("/student/career/cv-builder"), 1200);
      }
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save CV");
    } finally {
      setter(false);
    }
  };

  if (loading) {
    return (
              <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
          <p className="text-slate-500">Loading CV...</p>
        </div>
      );
  }

  const templateLabel = templateSlug.charAt(0).toUpperCase() + templateSlug.slice(1);

  return (
          <div>
        {toast && (
          <div className={`fixed right-6 top-6 z-50 rounded-2xl px-5 py-3 text-sm font-medium shadow-lg ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
            {toast.message}
          </div>
        )}

        <div className="mb-6 flex items-center gap-4">
          <Link href="/student/career/cv-builder/templates" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{editId ? "Edit CV" : `New CV — ${templateLabel}`}</h1>
            <p className="mt-1 text-sm text-slate-500">Fill in your details and preview your CV on the right.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <ClassicCVForm
              cvData={cvData}
              setCvData={setCvData}
              onSaveDraft={() => save("draft")}
              onSaveComplete={() => save("final")}
              errors={errors}
              setErrors={setErrors}
              isSavingDraft={isSavingDraft}
              isSavingComplete={isSavingComplete}
            />
          </div>
          <div className="xl:sticky xl:top-6 xl:self-start">
            <p className="mb-3 text-sm font-medium text-slate-500">Live Preview</p>
            <ClassicCVPreview cvData={cvData} template={templateSlug} />
          </div>
        </div>
      </div>
  );
}
