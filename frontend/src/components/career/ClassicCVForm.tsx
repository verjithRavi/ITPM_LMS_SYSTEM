"use client";

export type CVState = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  github: string;
  summary: string;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  skills: string[];
  skillInput: string;
};

export type EducationItem = { id: string; institution: string; degree: string; field: string; start: string; end: string };
export type ExperienceItem = { id: string; company: string; position: string; start: string; end: string; description: string };
export type ProjectItem = { id: string; name: string; link: string; description: string; technologies: string };

export type CVErrors = {
  fullName?: string; email?: string; phone?: string; location?: string;
  linkedIn?: string; github?: string; summary?: string;
  education?: string[]; experience?: string[]; projects?: string[]; skills?: string;
};

type Props = {
  cvData: CVState;
  setCvData: React.Dispatch<React.SetStateAction<CVState>>;
  onSaveDraft: () => void;
  onSaveComplete: () => void;
  errors?: CVErrors;
  setErrors: React.Dispatch<React.SetStateAction<CVErrors>>;
  isSavingDraft?: boolean;
  isSavingComplete?: boolean;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const linkedInRegex = /^(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub|company)\/[A-Za-z0-9\-_%/]+\/?$/i;
const githubRegex = /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9-_]+\/?$/i;
const urlRegex = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i;

function getPhoneDigits(phone: string) { return phone.replace(/\D/g, ""); }
function isValidMonth(value: string) { return /^\d{4}-\d{2}$/.test(value); }

export default function ClassicCVForm({ cvData, setCvData, onSaveDraft, onSaveComplete, errors, setErrors, isSavingDraft, isSavingComplete }: Props) {
  const inputClass = (hasError?: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${hasError ? "border-red-500 bg-red-50" : "border-blue-100 bg-blue-50/60"}`;
  const textareaClass = (hasError?: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${hasError ? "border-red-500 bg-red-50" : "border-blue-100 bg-blue-50/60"}`;

  const updateField = (field: keyof Omit<CVState, "education" | "experience" | "projects" | "skills">, value: string) => {
    setCvData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      if (field === "fullName") { next.fullName = !value.trim() ? "Full name is required" : undefined; }
      if (field === "email") { next.email = !value.trim() ? "Email is required" : !emailRegex.test(value.trim()) ? "Enter a valid email" : undefined; }
      if (field === "phone") { const d = getPhoneDigits(value); next.phone = !value.trim() ? "Phone is required" : d.length !== 10 ? "Must be 10 digits" : undefined; }
      if (field === "location") { next.location = !value.trim() ? "Location is required" : undefined; }
      if (field === "linkedIn" && value.trim() && !linkedInRegex.test(value.trim())) next.linkedIn = "Enter a valid LinkedIn URL";
      else if (field === "linkedIn") next.linkedIn = undefined;
      if (field === "github" && value.trim() && !githubRegex.test(value.trim())) next.github = "Enter a valid GitHub URL";
      else if (field === "github") next.github = undefined;
      if (field === "summary") { next.summary = !value.trim() ? "Summary is required" : value.trim().length < 10 ? "At least 10 characters" : undefined; }
      return next;
    });
  };

  const addEducation = () => setCvData((prev) => ({ ...prev, education: [...prev.education, { id: crypto.randomUUID(), institution: "", degree: "", field: "", start: "", end: "" }] }));
  const removeEducation = (id: string) => setCvData((prev) => ({ ...prev, education: prev.education.length === 1 ? prev.education : prev.education.filter((e) => e.id !== id) }));
  const updateEducation = (id: string, field: keyof EducationItem, value: string) => setCvData((prev) => ({ ...prev, education: prev.education.map((e) => e.id === id ? { ...e, [field]: value } : e) }));

  const addExperience = () => setCvData((prev) => ({ ...prev, experience: [...prev.experience, { id: crypto.randomUUID(), company: "", position: "", start: "", end: "", description: "" }] }));
  const removeExperience = (id: string) => setCvData((prev) => ({ ...prev, experience: prev.experience.length === 1 ? prev.experience : prev.experience.filter((e) => e.id !== id) }));
  const updateExperience = (id: string, field: keyof ExperienceItem, value: string) => setCvData((prev) => ({ ...prev, experience: prev.experience.map((e) => e.id === id ? { ...e, [field]: value } : e) }));

  const addProject = () => setCvData((prev) => ({ ...prev, projects: [...prev.projects, { id: crypto.randomUUID(), name: "", link: "", description: "", technologies: "" }] }));
  const removeProject = (id: string) => setCvData((prev) => ({ ...prev, projects: prev.projects.length === 1 ? prev.projects : prev.projects.filter((p) => p.id !== id) }));
  const updateProject = (id: string, field: keyof ProjectItem, value: string) => setCvData((prev) => ({ ...prev, projects: prev.projects.map((p) => p.id === id ? { ...p, [field]: value } : p) }));

  const addSkill = () => {
    const trimmed = cvData.skillInput.trim();
    if (!trimmed || cvData.skills.includes(trimmed)) return;
    setCvData((prev) => ({ ...prev, skills: [...prev.skills, trimmed], skillInput: "" }));
    setErrors((prev) => ({ ...prev, skills: undefined }));
  };
  const removeSkill = (index: number) => setCvData((prev) => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));

  const sectionClass = "rounded-2xl border border-blue-100 bg-white p-6 shadow-sm";

  return (
    <div className="space-y-6">
      <section className={sectionClass}>
        <h2 className="mb-6 text-lg font-semibold text-slate-900">Personal Information</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {(["fullName", "email", "phone", "location", "linkedIn", "github"] as const).map((field) => (
            <div key={field}>
              <label className="mb-2 block text-sm font-medium text-slate-700">{field === "fullName" ? "Full Name" : field === "linkedIn" ? "LinkedIn" : field === "github" ? "GitHub" : field.charAt(0).toUpperCase() + field.slice(1)}</label>
              <input value={cvData[field]} onChange={(e) => updateField(field, e.target.value)} className={inputClass(!!(errors as Record<string, unknown>)?.[field])} />
              {(errors as Record<string, string | undefined>)?.[field] && <p className="mt-1 text-xs text-red-500">{(errors as Record<string, string | undefined>)[field]}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Professional Summary</h2>
        <textarea rows={4} value={cvData.summary} onChange={(e) => updateField("summary", e.target.value)} placeholder="Brief summary of your experience and goals..." className={textareaClass(!!errors?.summary)} />
        {errors?.summary && <p className="mt-1 text-xs text-red-500">{errors.summary}</p>}
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Education</h2>
          <button type="button" onClick={addEducation} className="text-sm font-medium text-blue-600 hover:text-blue-700">+ Add</button>
        </div>
        <div className="space-y-4">
          {cvData.education.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex justify-end">
                <button type="button" onClick={() => removeEducation(item.id)} className="text-sm text-red-500 hover:text-red-600">Remove</button>
              </div>
              {errors?.education?.[index] && <p className="mb-3 text-xs text-red-500">{errors.education[index]}</p>}
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-slate-700">Institution</label>
                <input value={item.institution} onChange={(e) => updateEducation(item.id, "institution", e.target.value)} className={inputClass(false)} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Degree</label><input value={item.degree} onChange={(e) => updateEducation(item.id, "degree", e.target.value)} className={inputClass(false)} /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Field</label><input value={item.field} onChange={(e) => updateEducation(item.id, "field", e.target.value)} className={inputClass(false)} /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Start</label><input type="month" value={item.start} onChange={(e) => updateEducation(item.id, "start", e.target.value)} className={inputClass(false)} /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">End</label><input type="month" value={item.end} onChange={(e) => updateEducation(item.id, "end", e.target.value)} className={inputClass(false)} /></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Experience</h2>
          <button type="button" onClick={addExperience} className="text-sm font-medium text-blue-600 hover:text-blue-700">+ Add</button>
        </div>
        <div className="space-y-4">
          {cvData.experience.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex justify-end">
                <button type="button" onClick={() => removeExperience(item.id)} className="text-sm text-red-500 hover:text-red-600">Remove</button>
              </div>
              {errors?.experience?.[index] && <p className="mb-3 text-xs text-red-500">{errors.experience[index]}</p>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Company</label><input value={item.company} onChange={(e) => updateExperience(item.id, "company", e.target.value)} className={inputClass(false)} /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Position</label><input value={item.position} onChange={(e) => updateExperience(item.id, "position", e.target.value)} className={inputClass(false)} /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Start</label><input type="month" value={item.start} onChange={(e) => updateExperience(item.id, "start", e.target.value)} className={inputClass(false)} /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">End</label><input type="month" value={item.end} onChange={(e) => updateExperience(item.id, "end", e.target.value)} className={inputClass(false)} /></div>
              </div>
              <div className="mt-4"><label className="mb-1 block text-sm font-medium text-slate-700">Description</label><textarea rows={3} value={item.description} onChange={(e) => updateExperience(item.id, "description", e.target.value)} className={textareaClass(false)} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          <button type="button" onClick={addProject} className="text-sm font-medium text-blue-600 hover:text-blue-700">+ Add</button>
        </div>
        <div className="space-y-4">
          {cvData.projects.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-slate-200 p-4">
              <div className="mb-3 flex justify-end">
                <button type="button" onClick={() => removeProject(item.id)} className="text-sm text-red-500 hover:text-red-600">Remove</button>
              </div>
              {errors?.projects?.[index] && <p className="mb-3 text-xs text-red-500">{errors.projects[index]}</p>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Name</label><input value={item.name} onChange={(e) => updateProject(item.id, "name", e.target.value)} className={inputClass(false)} /></div>
                <div><label className="mb-1 block text-sm font-medium text-slate-700">Link</label><input value={item.link} onChange={(e) => updateProject(item.id, "link", e.target.value)} className={inputClass(false)} /></div>
              </div>
              <div className="mt-4"><label className="mb-1 block text-sm font-medium text-slate-700">Description</label><textarea rows={3} value={item.description} onChange={(e) => updateProject(item.id, "description", e.target.value)} className={textareaClass(false)} /></div>
              <div className="mt-4"><label className="mb-1 block text-sm font-medium text-slate-700">Technologies <span className="text-slate-400 text-xs">(comma separated)</span></label><input value={item.technologies} onChange={(e) => updateProject(item.id, "technologies", e.target.value)} placeholder="React, Node.js, MongoDB" className={inputClass(false)} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Skills</h2>
        <div className="flex gap-3">
          <input value={cvData.skillInput} onChange={(e) => setCvData((prev) => ({ ...prev, skillInput: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} placeholder="Add a skill..." className={`flex-1 rounded-xl border px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${errors?.skills ? "border-red-500" : "border-blue-100 bg-blue-50/60"}`} />
          <button type="button" onClick={addSkill} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100">Add</button>
        </div>
        {errors?.skills && <p className="mt-1 text-xs text-red-500">{errors.skills}</p>}
        {cvData.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {cvData.skills.map((skill, index) => (
              <button key={`${skill}-${index}`} type="button" onClick={() => removeSkill(index)} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 hover:bg-blue-200">{skill} ×</button>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-4 pb-8">
        <button type="button" onClick={onSaveDraft} disabled={isSavingDraft} className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">{isSavingDraft ? "Saving..." : "Save as Draft"}</button>
        <button type="button" onClick={onSaveComplete} disabled={isSavingComplete} className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">{isSavingComplete ? "Saving..." : "Save & Complete"}</button>
      </div>
    </div>
  );
}
