"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = { _id: string; role: "STUDENT" | "TUTOR" | "ADMIN" };
type Assignment = { _id: string; title: string; description: string; moduleName: string; totalMarks: number; deadline: string; submissionType: "PDF" | "DOCX" | "ZIP" | "TEXT"; instructions: string; status: "DRAFT" | "PUBLISHED"; createdAt: string };
type AssignmentSubmissionRow = {
  submissionId: string | null;
  student: { _id: string; fullName: string; email: string; userId: string };
  submitted: boolean;
  submittedAt: string | null;
  isLate: boolean;
  submissionText: string;
  attachmentUrl: string;
  status: "SUBMITTED" | "LATE" | "NOT_SUBMITTED";
  responseType: "FILE" | "TEXT" | "NONE";
  criteriaScores: Array<{ criterion: string; marksAwarded: number; comment: string }>;
  totalMarksAwarded: number | null;
  comments: string;
  overallFeedback: string;
  gradingStatus: "PENDING" | "GRADED";
  gradedAt: string | null;
};
type AssignmentSubmissionOverview = {
  assignment: Assignment;
  summary: { totalStudents: number; submittedCount: number; notSubmittedCount: number; lateCount: number };
  submissions: AssignmentSubmissionRow[];
};
type AssignmentReviewForm = {
  criteriaScores: Array<{ criterion: string; marksAwarded: string; comment: string }>;
};
type SubmissionFilter = "ALL" | "SUBMITTED" | "NOT_SUBMITTED";
type SubmittedReviewFilter = "ALL" | "GRADED" | "PENDING";

const shell = "rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_rgba(37,99,235,0.08)]";
const card = "rounded-2xl border border-blue-100 bg-white p-4";
const input = "w-full rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500";
const overlay = "fixed inset-0 z-[90] overflow-y-auto bg-slate-950/80 px-4 py-8 backdrop-blur-sm";
const modalCard = "mx-auto w-full max-w-4xl rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_30px_90px_rgba(37,99,235,0.12)]";
const ASSIGNMENT_REVIEW_COMMENT_MAX_LENGTH = 200;

const dt = (value: string) => new Date(value).toLocaleString();
const emptyAssignmentReview = (): AssignmentReviewForm => ({ criteriaScores: [{ criterion: "", marksAwarded: "", comment: "" }] });
const totalCriteriaMarks = (criteriaScores: AssignmentReviewForm["criteriaScores"]) => criteriaScores.reduce((sum, item) => sum + (Number(item.marksAwarded) || 0), 0);

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.08)]"><div className="text-xs uppercase tracking-[0.22em] text-blue-700">{label}</div><div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div><p className="mt-2 text-sm text-slate-500">{note}</p></div>;
}

export default function TutorAssignmentSubmissionsPage() {
  return (
    <Suspense fallback={<div className="px-4 py-6 text-sm text-slate-500">Loading...</div>}>
      <TutorAssignmentSubmissionsContent />
    </Suspense>
  );
}

function TutorAssignmentSubmissionsContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = useMemo(() => getToken(), []);
  const assignmentId = params.id;
  const [overview, setOverview] = useState<AssignmentSubmissionOverview | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmissionRow | null>(null);
  const [assignmentReviewForm, setAssignmentReviewForm] = useState<AssignmentReviewForm>(emptyAssignmentReview());
  const [loading, setLoading] = useState(true);
  const [savingAssignmentReview, setSavingAssignmentReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>("ALL");
  const [submittedReviewFilter, setSubmittedReviewFilter] = useState<SubmittedReviewFilter>("ALL");

  const backHref = useMemo(() => {
    const params = new URLSearchParams();
    const tab = searchParams.get("tab");
    const moduleId = searchParams.get("moduleId");
    if (tab) params.set("tab", tab);
    if (moduleId) params.set("moduleId", moduleId);
    const query = params.toString();
    return `/tutor/assignments${query ? `?${query}` : ""}`;
  }, [searchParams]);

  const filteredSubmissions = useMemo(() => {
    if (!overview) return [];
    return overview.submissions.filter((row) => {
      if (submissionFilter === "NOT_SUBMITTED") return !row.submitted;
      if (submissionFilter === "SUBMITTED") {
        if (!row.submitted) return false;
        if (submittedReviewFilter === "GRADED") return row.gradingStatus === "GRADED";
        if (submittedReviewFilter === "PENDING") return row.gradingStatus !== "GRADED";
      }
      return true;
    });
  }, [overview, submissionFilter, submittedReviewFilter]);

  useEffect(() => {
    async function boot() {
      if (!token) {
        router.push("/login");
        return;
      }
      try {
        const me = await apiFetch<{ user: User }>("/api/me", {}, token);
        if (me.user.role !== "TUTOR") {
          router.push("/login");
          return;
        }
        const data = await apiFetch<AssignmentSubmissionOverview>(`/api/assignments/${assignmentId}/submissions`, {}, token);
        setOverview(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load assignment submissions.");
      } finally {
        setLoading(false);
      }
    }
    void boot();
  }, [assignmentId, router, token]);

  function startAssignmentReview(row: AssignmentSubmissionRow) {
    setSelectedSubmission(row);
    setAssignmentReviewForm({
      criteriaScores: row.criteriaScores.length > 0
        ? row.criteriaScores.map((item) => ({ criterion: item.criterion, marksAwarded: String(item.marksAwarded), comment: item.comment }))
        : [{ criterion: "", marksAwarded: "", comment: "" }],
    });
  }

  async function saveAssignmentReview() {
    if (!token || !overview || !selectedSubmission?.submissionId) return;
    const currentTotal = totalCriteriaMarks(assignmentReviewForm.criteriaScores);
    if (currentTotal !== overview.assignment.totalMarks) {
      setError(`Total criteria marks must be exactly ${overview.assignment.totalMarks}.`);
      setSuccess(null);
      return;
    }
    if (assignmentReviewForm.criteriaScores.some((item) => item.comment.trim().length > ASSIGNMENT_REVIEW_COMMENT_MAX_LENGTH)) {
      setError(`Each comment must be ${ASSIGNMENT_REVIEW_COMMENT_MAX_LENGTH} characters or fewer.`);
      setSuccess(null);
      return;
    }
    setSavingAssignmentReview(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        criteriaScores: assignmentReviewForm.criteriaScores,
        totalMarksAwarded: currentTotal,
        comments: "",
        overallFeedback: "",
      };
      const data = await apiFetch<{ submission: Omit<AssignmentSubmissionRow, "student" | "submitted" | "isLate" | "responseType" | "status" | "submissionId">; message: string }>(
        `/api/assignments/${overview.assignment._id}/submissions/${selectedSubmission.submissionId}/review`,
        { method: "PATCH", body: JSON.stringify(payload) },
        token
      );
      setOverview((current) => current ? ({
        ...current,
        submissions: current.submissions.map((row) => row.submissionId === selectedSubmission.submissionId ? {
          ...row,
          ...data.submission,
        } : row),
      }) : current);
      setSelectedSubmission(null);
      setAssignmentReviewForm(emptyAssignmentReview());
      setSuccess(data.message || "Assignment evaluated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save assignment evaluation.");
    } finally {
      setSavingAssignmentReview(false);
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_35%,#f8fbff_100%)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
        <div className={`${shell} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.24em] text-blue-700">Assignment Submissions</div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">{overview?.assignment.title || "Loading assignment..."}</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">Review uploaded work, check who is still pending, and grade each submission from a dedicated screen.</p>
            </div>
            <button type="button" onClick={() => router.push(backHref)} className="rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50">
              Back to Assignments
            </button>
          </div>
          {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
          {success ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}
        </div>

        {loading ? (
          <div className={`${shell} p-6 text-sm text-slate-500`}>Loading submissions...</div>
        ) : !overview ? (
          <div className={`${shell} p-6 text-sm text-slate-500`}>Submission details could not be loaded.</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Students" value={String(overview.summary.totalStudents).padStart(2, "0")} note="Students registered to this module." />
              <StatCard label="Submitted" value={String(overview.summary.submittedCount).padStart(2, "0")} note="Students who already submitted." />
              <StatCard label="Missing" value={String(overview.summary.notSubmittedCount).padStart(2, "0")} note="Students who have not submitted yet." />
              <StatCard label="Late" value={String(overview.summary.lateCount).padStart(2, "0")} note="Submissions sent after the deadline." />
            </div>

            <div className={`${shell} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">Student Submission List</div>
                  <p className="mt-2 text-sm text-slate-500">Each card shows the student, submission status, uploaded response, and grading state.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("ALL")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${submissionFilter === "ALL" ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-700 hover:bg-blue-50"}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("SUBMITTED")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${submissionFilter === "SUBMITTED" ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-700 hover:bg-blue-50"}`}
                  >
                    Submitted
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmissionFilter("NOT_SUBMITTED")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${submissionFilter === "NOT_SUBMITTED" ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-700 hover:bg-blue-50"}`}
                  >
                    Not Submitted
                  </button>
                </div>
              </div>

              {submissionFilter === "SUBMITTED" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmittedReviewFilter("ALL")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${submittedReviewFilter === "ALL" ? "bg-emerald-600 text-white" : "border border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50"}`}
                  >
                    All Submitted
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedReviewFilter("GRADED")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${submittedReviewFilter === "GRADED" ? "bg-emerald-600 text-white" : "border border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50"}`}
                  >
                    Evaluated
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedReviewFilter("PENDING")}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${submittedReviewFilter === "PENDING" ? "bg-emerald-600 text-white" : "border border-emerald-100 bg-white text-slate-700 hover:bg-emerald-50"}`}
                  >
                    Not Evaluated
                  </button>
                </div>
              ) : null}

              <div className="mt-6 space-y-3">
                {filteredSubmissions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 px-4 py-8 text-center text-sm text-slate-600">
                    No submissions match the selected filter.
                  </div>
                ) : filteredSubmissions.map((row) => (
                  <div key={row.student._id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_10px_30px_rgba(37,99,235,0.08)]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-slate-900">{row.student.fullName}</div>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "NOT_SUBMITTED" ? "bg-slate-100 text-slate-600" : row.status === "LATE" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {row.status === "NOT_SUBMITTED" ? "Not Submitted" : row.status === "LATE" ? "Late" : "Submitted"}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">{row.student.email}</div>
                        <div className="text-xs text-slate-500">User ID: {row.student.userId}</div>
                      </div>
                      <div className="space-y-1 text-sm text-slate-600 md:text-right">
                        <div>Submission Time: {row.submittedAt ? dt(row.submittedAt) : "Not submitted"}</div>
                        <div>Current Status: {row.status === "NOT_SUBMITTED" ? "Waiting" : row.status}</div>
                        <div>Response Type: {row.responseType === "FILE" ? "File Uploaded" : row.responseType === "TEXT" ? "Answer Given" : "No Response"}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className={card}>
                        <div className="text-xs uppercase tracking-[0.2em] text-blue-700">Uploaded File</div>
                        <div className="mt-2 break-all text-sm text-slate-700">
                          {row.attachmentUrl ? <a href={row.attachmentUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open uploaded file</a> : "No file uploaded"}
                        </div>
                      </div>
                      <div className={card}>
                        <div className="text-xs uppercase tracking-[0.2em] text-blue-700">Answer / Notes</div>
                        <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{row.submissionText || "No written answer provided"}</div>
                      </div>
                    </div>

                    {row.submitted ? (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button type="button" onClick={() => startAssignmentReview(row)} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                          {row.gradingStatus === "GRADED" ? "Update Marks" : "Evaluate Submission"}
                        </button>
                        <div className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-slate-700">
                          {row.gradingStatus === "GRADED" ? `Graded${row.totalMarksAwarded != null ? `: ${row.totalMarksAwarded}/${overview.assignment.totalMarks}` : ""}` : "Pending grading"}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {selectedSubmission && overview ? (
        <div className={overlay}>
          <div className={modalCard}>
            {(() => {
              const currentTotal = totalCriteriaMarks(assignmentReviewForm.criteriaScores);
              const hasExactTotal = currentTotal === overview.assignment.totalMarks;
              return (
                <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-blue-700">Evaluate Assignment</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">{selectedSubmission.student.fullName}</h2>
                <p className="mt-2 text-sm text-slate-600">Give criterion-based marks and comments for this assignment submission.</p>
              </div>
              <button type="button" onClick={() => setSelectedSubmission(null)} className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className={card}><div className="text-xs uppercase tracking-[0.2em] text-blue-700">Submission Time</div><div className="mt-2 text-sm text-slate-700">{selectedSubmission.submittedAt ? dt(selectedSubmission.submittedAt) : "Not submitted"}</div></div>
              <div className={card}><div className="text-xs uppercase tracking-[0.2em] text-blue-700">Current Total</div><div className="mt-2 text-sm text-slate-700">{totalCriteriaMarks(assignmentReviewForm.criteriaScores)} / {overview.assignment.totalMarks}</div></div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">Marking Criteria</div>
                <button type="button" onClick={() => setAssignmentReviewForm((current) => ({ ...current, criteriaScores: [...current.criteriaScores, { criterion: "", marksAwarded: "", comment: "" }] }))} className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">
                  Add Criterion
                </button>
              </div>
              {assignmentReviewForm.criteriaScores.map((criterion, index) => (
                <div key={`criterion-${index}`} className="grid gap-3 rounded-2xl border border-blue-100 bg-slate-50 p-4 md:grid-cols-[1.5fr,0.5fr,1.5fr,auto]">
                  <input className={input} placeholder="Criterion" value={criterion.criterion} onChange={(e) => setAssignmentReviewForm((current) => ({ ...current, criteriaScores: current.criteriaScores.map((item, itemIndex) => itemIndex === index ? { ...item, criterion: e.target.value } : item) }))} />
                  <input className={input} type="number" min="0" max={overview.assignment.totalMarks} placeholder="Marks" value={criterion.marksAwarded} onChange={(e) => setAssignmentReviewForm((current) => ({ ...current, criteriaScores: current.criteriaScores.map((item, itemIndex) => itemIndex === index ? { ...item, marksAwarded: e.target.value } : item) }))} />
                  <div><input className={input} placeholder="Comment" value={criterion.comment} onChange={(e) => setAssignmentReviewForm((current) => ({ ...current, criteriaScores: current.criteriaScores.map((item, itemIndex) => itemIndex === index ? { ...item, comment: e.target.value } : item) }))} maxLength={ASSIGNMENT_REVIEW_COMMENT_MAX_LENGTH} /><p className="mt-1 text-right text-xs text-slate-500">{criterion.comment.length}/{ASSIGNMENT_REVIEW_COMMENT_MAX_LENGTH}</p></div>
                  {assignmentReviewForm.criteriaScores.length > 1 ? <button type="button" onClick={() => setAssignmentReviewForm((current) => ({ ...current, criteriaScores: current.criteriaScores.filter((_, itemIndex) => itemIndex !== index) }))} className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100">Remove</button> : null}
                </div>
              ))}
              {!hasExactTotal ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  Total criteria marks must be exactly {overview.assignment.totalMarks}. Current total is {currentTotal}.
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void saveAssignmentReview()} disabled={savingAssignmentReview || !hasExactTotal} className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70">
                  {savingAssignmentReview ? "Saving..." : "Save Evaluation"}
                </button>
                <div className={`rounded-full border px-4 py-3 text-sm ${hasExactTotal ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-600"}`}>Total: {currentTotal} / {overview.assignment.totalMarks}</div>
              </div>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
