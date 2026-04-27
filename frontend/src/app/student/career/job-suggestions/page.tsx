"use client";

import { useEffect, useState } from "react";
import { Briefcase, CircleCheck, MapPin, Percent, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

function careerFetch<T = unknown>(path: string, options: RequestInit = {}) {
  return apiFetch<T>(`/api/career${path}`, options, getToken() || "");
}

type LinkedCareerRole = {
  _id: string;
  title: string;
  description?: string;
};

type JobSuggestion = {
  _id: string;
  title: string;
  matchPercentage: number;
  linkedCareerRoleId?: LinkedCareerRole | string | null;
  requiredSkills?: { name: string; minLevel: string }[];
  keywords?: string[];
  matchedSkills: { name: string; userLevel: string; requiredLevel: string }[];
  missingSkills: { name: string; requiredLevel: string; userLevel?: string; reason?: string }[];
};

function getLinkedCareer(job: JobSuggestion) {
  return job.linkedCareerRoleId && typeof job.linkedCareerRoleId === "object" ? job.linkedCareerRoleId : null;
}

function getCareerLabel(job: JobSuggestion) {
  return getLinkedCareer(job)?.title || job.title;
}

function getMatchBadgeTone(matchPercentage: number) {
  if (matchPercentage >= 80) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100";
  if (matchPercentage >= 50) return "bg-sky-50 text-sky-700 ring-1 ring-sky-100";
  return "bg-rose-50 text-rose-700 ring-1 ring-rose-100";
}

function buildJobSummary(job: JobSuggestion) {
  const linkedCareerDescription = getLinkedCareer(job)?.description?.trim();
  if (linkedCareerDescription) return linkedCareerDescription;

  const requiredSkillNames = (job.requiredSkills || []).map((skill) => skill.name).filter(Boolean);
  if (requiredSkillNames.length > 0) {
    const preview = requiredSkillNames.slice(0, 3).join(", ");
    const remaining = requiredSkillNames.length - Math.min(requiredSkillNames.length, 3);
    return remaining > 0
      ? `This role aligns with skills in ${preview}, plus ${remaining} more focus area${remaining > 1 ? "s" : ""}.`
      : `This role aligns with skills in ${preview}.`;
  }

  const keywords = (job.keywords || []).filter(Boolean);
  if (keywords.length > 0) {
    return `Key focus areas for this role include ${keywords.slice(0, 3).join(", ")}.`;
  }

  return "Suggested from your current skill profile and how it matches this role's requirements.";
}

export default function JobSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<JobSuggestion[]>([]);
  const [selectedCareer, setSelectedCareer] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await careerFetch<{ data: JobSuggestion[] }>("/jobs/suggestions");
        setSuggestions(res.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job suggestions");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const careerOptions = Array.from(new Set(suggestions.map(getCareerLabel))).sort((a, b) => a.localeCompare(b));
  const filteredSuggestions = suggestions
    .filter((job) => selectedCareer === "all" || getCareerLabel(job) === selectedCareer)
    .slice()
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.05)] sm:p-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Job Suggestions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Explore jobs that match your current profile and skill set.
        </p>
      </section>

      {error && !loading && (
        <div className="rounded-[28px] border border-rose-200 bg-white p-5 shadow-sm">
          <p className="font-medium text-rose-700">{error}</p>
        </div>
      )}

      {!error && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.05)] sm:p-6">
          <label htmlFor="career-filter" className="mb-3 block text-sm font-medium text-slate-700">
            Filter by target career
          </label>
          <select
            id="career-filter"
            value={selectedCareer}
            onChange={(event) => setSelectedCareer(event.target.value)}
            className="w-full rounded-2xl border border-sky-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
          >
            <option value="all">All suggested roles</option>
            {careerOptions.map((career) => (
              <option key={career} value={career}>
                {career}
              </option>
            ))}
          </select>
        </section>
      )}

      {loading ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-slate-500">Loading job suggestions...</p>
        </div>
      ) : error ? null : suggestions.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-800">No suggestions yet</p>
          <p className="mt-2 text-sm text-slate-500">Add your skills first to get job match suggestions.</p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-800">No roles found for this filter</p>
          <p className="mt-2 text-sm text-slate-500">Try switching back to all suggested roles.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredSuggestions.map((job) => (
            <article
              key={job._id}
              className="rounded-[30px] border border-slate-200 bg-white px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(15,23,42,0.08)] sm:px-6 sm:py-7"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{job.title}</h2>

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-slate-400" />
                      {getCareerLabel(job)}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      Based on your profile
                    </span>
                  </div>

                  <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    {buildJobSummary(job)}
                  </p>
                </div>

                <div className="flex items-center">
                  <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${getMatchBadgeTone(job.matchPercentage)}`}>
                    <Percent className="h-4 w-4" />
                    {job.matchPercentage}% Match
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <section className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">Missing Skills</p>
                  {job.missingSkills.length > 0 ? (
                    <>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {job.missingSkills.map((skill) => (
                          <span
                            key={skill.name}
                            className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-700"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        Strengthen these skills to improve your match score for this role.
                      </p>
                    </>
                  ) : (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
                      <CircleCheck className="h-4 w-4" />
                      You already meet all listed skill requirements.
                    </div>
                  )}
                </section>

                <section className="rounded-3xl bg-sky-50/70 p-4">
                  <p className="text-sm font-semibold text-slate-900">Current Strengths</p>
                  {job.matchedSkills.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.matchedSkills.map((skill) => (
                        <span
                          key={skill.name}
                          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-100"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {skill.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      Add more skills to see where you already match this role.
                    </p>
                  )}
                </section>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
