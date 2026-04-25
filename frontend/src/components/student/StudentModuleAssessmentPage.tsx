"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

type User = {
  role: "STUDENT" | "TUTOR" | "ADMIN";
};

type ModuleItem = {
  _id: string;
  moduleCode: string;
  name: string;
  faculty: string;
  year: number;
  semester: number;
  description: string;
};

type AssignmentSubmission = {
  status: string;
  submissionText: string;
  attachmentUrl: string;
  submittedAt: string;
  comments?: string;
  overallFeedback?: string;
  gradingStatus?: "PENDING" | "GRADED";
  totalMarksAwarded?: number | null;
};

type AssignmentItem = {
  _id: string;
  title: string;
  description: string;
  moduleName: string;
  totalMarks: number;
  deadline: string;
  submissionType: "PDF" | "DOCX" | "ZIP" | "TEXT";
  instructions: string;
  isClosed?: boolean;
  mySubmission?: AssignmentSubmission | null;
};

type QuizAttemptSummary = {
  _id: string;
  status: "STARTED" | "SUBMITTED";
  score?: number;
  startedAt?: string;
  submittedAt?: string | null;
};

type QuizQuestion = {
  _id: string;
  questionType: "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "FILL_IN_THE_BLANKS";
  questionText: string;
  options: string[];
  correctAnswer: string;
  marks: number;
  topicCategory: string;
};

type QuizItem = {
  _id: string;
  title: string;
  description: string;
  moduleName: string;
  totalMarks: number;
  deadline: string;
  instructions: string;
  isClosed?: boolean;
  questions: QuizQuestion[];
  myAttempt?: QuizAttemptSummary | null;
};

type ActiveQuizAttempt = {
  attempt: { _id: string; status: "STARTED"; startedAt: string };
  quiz: QuizItem;
};

type AssignmentFormState = {
  submissionText: string;
  attachmentUrl: string;
  attachmentName: string;
  fileError?: string;
};

type AssessmentMode = "assignments" | "quizzes";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function isClosedByDeadline(deadline: string, isClosed?: boolean) {
  if (typeof isClosed === "boolean") return isClosed;
  return new Date(deadline).getTime() < Date.now();
}

function isFileBasedAssignment(type: AssignmentItem["submissionType"]) {
  return type === "PDF" || type === "DOCX" || type === "ZIP";
}

function getAcceptedFileTypes(type: AssignmentItem["submissionType"]) {
  if (type === "PDF") return ".pdf,application/pdf";
  if (type === "DOCX") {
    return ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (type === "ZIP") return ".zip,application/zip,application/x-zip-compressed";
  return undefined;
}

function getExpectedFileLabel(type: AssignmentItem["submissionType"]) {
  if (type === "PDF") return "PDF";
  if (type === "DOCX") return "DOCX";
  if (type === "ZIP") return "ZIP";
  return "file";
}

function matchesSubmissionType(file: File, type: AssignmentItem["submissionType"]) {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  if (type === "PDF") {
    return fileName.endsWith(".pdf") || mimeType === "application/pdf";
  }

  if (type === "DOCX") {
    return (
      fileName.endsWith(".docx") ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  }

  if (type === "ZIP") {
    return (
      fileName.endsWith(".zip") ||
      mimeType === "application/zip" ||
      mimeType === "application/x-zip-compressed"
    );
  }

  return false;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read the selected file."));
    reader.readAsDataURL(file);
  });
}

export default function StudentModuleAssessmentPage({
  moduleId,
  mode = "assignments",
  embeddedTabs = false,
}: {
  moduleId: string;
  mode?: AssessmentMode;
  embeddedTabs?: boolean;
}) {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [tab, setTab] = useState<AssessmentMode>(mode);
  const [moduleItem, setModuleItem] = useState<ModuleItem | null>(null);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openAssignmentId, setOpenAssignmentId] = useState<string | null>(null);
  const [submittingAssignmentId, setSubmittingAssignmentId] = useState<string | null>(null);
  const [assignmentForms, setAssignmentForms] = useState<Record<string, AssignmentFormState>>({});
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizAttempt | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  useEffect(() => {
    async function load() {
      if (!token) {
        router.push("/login");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const me = await apiFetch<{ user: User }>("/api/me", {}, token);
        if (me.user.role !== "STUDENT") {
          router.push("/login");
          return;
        }

        const moduleRes = await apiFetch<{ module: ModuleItem }>(`/api/modules/${moduleId}`, {}, token);
        setModuleItem(moduleRes.module);

        const encodedModuleName = encodeURIComponent(moduleRes.module.name);
        const [assignmentsRes, quizzesRes] = await Promise.all([
          apiFetch<{ assignments: AssignmentItem[] }>(`/api/assignments?moduleName=${encodedModuleName}`, {}, token),
          apiFetch<{ quizzes: QuizItem[] }>(`/api/quizzes?moduleName=${encodedModuleName}`, {}, token),
        ]);

        setAssignments(assignmentsRes.assignments);
        setQuizzes(quizzesRes.quizzes);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load module assessment details.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [moduleId, router, token]);

  async function submitAssignment(assignment: AssignmentItem) {
    if (!token) return;

    const form = assignmentForms[assignment._id] || { submissionText: "", attachmentUrl: "", attachmentName: "", fileError: "" };
    const isFileSubmission = isFileBasedAssignment(assignment.submissionType);

    if (assignment.submissionType === "TEXT" && !form.submissionText.trim()) {
      setError("Please enter your assignment submission before sending it.");
      setSuccess(null);
      return;
    }

    if (isFileSubmission && !form.attachmentUrl.trim()) {
      setError(`Please provide the ${assignment.submissionType} file URL before submitting.`);
      setSuccess(null);
      return;
    }

    setSubmittingAssignmentId(assignment._id);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiFetch<{ submission: AssignmentSubmission; message: string }>(
        `/api/assignments/${assignment._id}/submissions`,
        {
          method: "POST",
          body: JSON.stringify(form),
        },
        token
      );

      setAssignments((current) =>
        current.map((item) => (item._id === assignment._id ? { ...item, mySubmission: data.submission } : item))
      );
      setOpenAssignmentId(null);
      setSuccess(
        assignment.mySubmission ? data.message || "Assignment updated successfully." : data.message || "Assignment submitted successfully."
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit assignment.");
    } finally {
      setSubmittingAssignmentId(null);
    }
  }

  async function handleAssignmentFileChange(assignment: AssignmentItem, file: File | null) {
    if (!file) {
      setAssignmentForms((current) => ({
        ...current,
        [assignment._id]: {
          submissionText: current[assignment._id]?.submissionText || "",
          attachmentUrl: "",
          attachmentName: "",
          fileError: "",
        },
      }));
      return;
    }

    setSuccess(null);

    if (!matchesSubmissionType(file, assignment.submissionType)) {
      setAssignmentForms((current) => ({
        ...current,
        [assignment._id]: {
          submissionText: current[assignment._id]?.submissionText || "",
          attachmentUrl: "",
          attachmentName: "",
          fileError: `Please choose a ${getExpectedFileLabel(assignment.submissionType)} file for this assignment.`,
        },
      }));
      return;
    }

    try {
      const fileDataUrl = await readFileAsDataUrl(file);
      setAssignmentForms((current) => ({
        ...current,
        [assignment._id]: {
          submissionText: current[assignment._id]?.submissionText || "",
          attachmentUrl: fileDataUrl,
          attachmentName: file.name,
          fileError: "",
        },
      }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to read the selected file.");
    }
  }

  async function startQuiz(quiz: QuizItem) {
    if (!token) return;

    setStartingQuizId(quiz._id);
    setError(null);
    setSuccess(null);

    try {
      const data = await apiFetch<ActiveQuizAttempt>(`/api/quizzes/${quiz._id}/attempts/start`, { method: "POST" }, token);
      const initialAnswers: Record<string, string> = {};
      data.quiz.questions.forEach((question) => {
        initialAnswers[question._id] = "";
      });

      setQuizAnswers(initialAnswers);
      setActiveQuiz(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start quiz.");
    } finally {
      setStartingQuizId(null);
    }
  }

  async function finishQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !activeQuiz) return;

    setSubmittingQuiz(true);
    setError(null);
    setSuccess(null);

    try {
      const answers = activeQuiz.quiz.questions.map((question) => ({
        questionId: question._id,
        answer: quizAnswers[question._id] || "",
      }));

      const data = await apiFetch<{ attempt: QuizAttemptSummary; message: string }>(
        `/api/quizzes/${activeQuiz.quiz._id}/attempts/${activeQuiz.attempt._id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers }),
        },
        token
      );

      setQuizzes((current) =>
        current.map((quiz) => (quiz._id === activeQuiz.quiz._id ? { ...quiz, myAttempt: data.attempt } : quiz))
      );
      setActiveQuiz(null);
      setQuizAnswers({});
      setSuccess(data.message || "Quiz submitted successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit quiz.");
    } finally {
      setSubmittingQuiz(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.22),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.16),_transparent_22%),linear-gradient(180deg,#26184e_0%,#221744_46%,#1b1235_100%)]">
      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-7xl space-y-4">
          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_22px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-violet-200/80">
                  {tab === "assignments" ? "Module Assignments" : "Module Quizzes"}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold text-white">
                    {loading ? "Loading module..." : moduleItem?.name || "Module"}
                  </h1>
                  {moduleItem ? (
                    <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-violet-100">
                      {moduleItem.moduleCode}
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 max-w-3xl text-sm text-slate-300">
                  {tab === "assignments"
                    ? "See every assignment for this module, review the details, and open the correct submission form only when you are ready."
                    : "See every quiz for this module, review the details, and start the question set when you are ready to attempt it."}
                </p>
                {moduleItem ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                    <span className="rounded-full bg-white/8 px-2.5 py-1">{moduleItem.faculty}</span>
                    <span className="rounded-full bg-white/8 px-2.5 py-1">Year {moduleItem.year}</span>
                    <span className="rounded-full bg-white/8 px-2.5 py-1">Semester {moduleItem.semester}</span>
                  </div>
                ) : null}
              </div>

              {embeddedTabs ? null : (
                <div className="inline-flex rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
                  {(["assignments", "quizzes"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setTab(item)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                        tab === item
                          ? "bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 text-slate-950 shadow-[0_12px_30px_rgba(251,146,60,0.35)]"
                          : "text-slate-300 hover:text-white"
                      }`}
                    >
                      {item === "assignments" ? "Assignments" : "Quizzes"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {embeddedTabs ? (
            <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
              <div className="inline-flex rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
                {(["assignments", "quizzes"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={`rounded-full px-7 py-3 text-base font-semibold transition ${
                      tab === item
                        ? "bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 text-slate-950 shadow-[0_12px_30px_rgba(251,146,60,0.35)]"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {item === "assignments" ? "Assignments" : "Quizzes"}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div> : null}
          {success ? <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-emerald-200">{success}</div> : null}

          {tab === "assignments" ? (
            <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(145deg,rgba(123,92,255,0.18),rgba(35,23,77,0.76))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-violet-100">Assignment List</div>
                  <p className="mt-1 text-sm text-slate-300">All assignment details for this module are shown here.</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                  {loading ? "..." : `${assignments.length} assignment${assignments.length === 1 ? "" : "s"}`}
                </div>
              </div>

              {loading ? (
                <div className="text-sm text-slate-300">Loading assignments...</div>
              ) : assignments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/35 p-4 text-sm text-slate-400">
                  No assignments available for this module.
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => {
                    const closed = isClosedByDeadline(assignment.deadline, assignment.isClosed);
                    const form = assignmentForms[assignment._id] || {
                      submissionText: "",
                      attachmentUrl: "",
                      attachmentName: "",
                      fileError: "",
                    };
                    const isOpen = openAssignmentId === assignment._id;
                    const isFileSubmission = isFileBasedAssignment(assignment.submissionType);

                    return (
                      <div key={assignment._id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold text-white">{assignment.title}</div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  closed ? "bg-red-400/15 text-red-200" : "bg-emerald-400/15 text-emerald-200"
                                }`}
                              >
                                {closed ? "Closed" : "Open"}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-300">{assignment.description}</div>
                          </div>
                          <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                            {assignment.totalMarks} marks
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
                          <span className="rounded-full bg-white/8 px-2.5 py-1">Deadline: {formatDateTime(assignment.deadline)}</span>
                          <span className="rounded-full bg-white/8 px-2.5 py-1">Submission Type: {assignment.submissionType}</span>
                        </div>

                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                          <span className="font-semibold text-violet-100">Instructions:</span> {assignment.instructions}
                        </div>

                        {assignment.mySubmission ? (
                          <div className="mt-3 space-y-3">
                            <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                              Submitted on {formatDateTime(assignment.mySubmission.submittedAt)}
                            </div>
                            {assignment.submissionType === "TEXT" ? (
                              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                                <div className="font-semibold text-violet-100">Your Submission</div>
                                <div className="mt-2 whitespace-pre-wrap text-slate-300">
                                  {assignment.mySubmission.submissionText || "No written answer provided."}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                                <div className="font-semibold text-violet-100">Uploaded File</div>
                                <div className="mt-2">
                                  {assignment.mySubmission.attachmentUrl ? (
                                    <a
                                      href={assignment.mySubmission.attachmentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-300 underline"
                                    >
                                      Open uploaded file
                                    </a>
                                  ) : (
                                    "No uploaded file."
                                  )}
                                </div>
                              </div>
                            )}
                            {!closed ? (
                              <div className="space-y-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setError(null);
                                    setSuccess(null);
                                    setAssignmentForms((current) => ({
                                      ...current,
                                      [assignment._id]: {
                                        submissionText: assignment.mySubmission?.submissionText || "",
                                        attachmentUrl: assignment.mySubmission?.attachmentUrl || "",
                                        attachmentName:
                                          assignment.mySubmission?.attachmentUrl && !assignment.mySubmission?.submissionText
                                            ? `Current ${assignment.submissionType} file`
                                            : "",
                                        fileError: "",
                                      },
                                    }));
                                    setOpenAssignmentId((current) => (current === assignment._id ? null : assignment._id));
                                  }}
                                  className="rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-5 py-2.5 text-sm font-semibold text-white"
                                >
                                  {isOpen ? "Close Edit Form" : "Edit Submission"}
                                </button>

                                {isOpen ? (
                                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                                    <div className="text-sm font-semibold text-white">Edit Submission</div>
                                    <p className="mt-1 text-sm text-slate-300">
                                      Update your submission before the deadline. Saving again will replace the current one.
                                    </p>

                                    <div className="mt-4 flex flex-col items-center space-y-3">
                                      {assignment.submissionType === "TEXT" ? (
                                        <textarea
                                          rows={5}
                                          value={form.submissionText}
                                          onChange={(event) =>
                                            setAssignmentForms((current) => ({
                                              ...current,
                                              [assignment._id]: {
                                                submissionText: event.target.value,
                                                attachmentUrl: current[assignment._id]?.attachmentUrl || "",
                                                attachmentName: current[assignment._id]?.attachmentName || "",
                                                fileError: current[assignment._id]?.fileError || "",
                                              },
                                            }))
                                          }
                                          placeholder="Write your assignment answer here"
                                          className={`${inputClass} max-w-2xl text-left`}
                                        />
                                      ) : (
                                        <div className="space-y-3">
                                          <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">
                                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-lg text-white">
                                              +
                                            </span>
                                            <span>{form.attachmentName ? "Change file" : `Add ${assignment.submissionType} file`}</span>
                                            <input
                                              type="file"
                                              accept={getAcceptedFileTypes(assignment.submissionType)}
                                              onChange={(event) =>
                                                void handleAssignmentFileChange(
                                                  assignment,
                                                  event.target.files && event.target.files.length > 0 ? event.target.files[0] : null
                                                )
                                              }
                                              className="sr-only"
                                            />
                                          </label>
                                          <div className="text-xs text-slate-300">
                                            {form.attachmentName
                                              ? `Selected file: ${form.attachmentName}`
                                              : assignment.mySubmission?.attachmentUrl
                                                ? `Current file uploaded. Choose a new file only if you want to replace it.`
                                                : `Upload your ${assignment.submissionType} file here.`}
                                          </div>
                                          {assignment.mySubmission?.attachmentUrl ? (
                                            <a
                                              href={assignment.mySubmission.attachmentUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="text-xs text-blue-300 underline"
                                            >
                                              Open current uploaded file
                                            </a>
                                          ) : null}
                                          {form.fileError ? (
                                            <div className="text-xs font-medium text-red-300">{form.fileError}</div>
                                          ) : null}
                                        </div>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => void submitAssignment(assignment)}
                                        disabled={submittingAssignmentId === assignment._id}
                                        className="rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
                                      >
                                        {submittingAssignmentId === assignment._id ? "Saving..." : "Save Changes"}
                                      </button>
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : closed ? (
                          <div className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">
                            This assignment is closed because the deadline has passed.
                          </div>
                        ) : (
                          <div className="mt-4 space-y-3">
                            <button
                              type="button"
                              onClick={() => {
                                setError(null);
                                setSuccess(null);
                                setOpenAssignmentId((current) => (current === assignment._id ? null : assignment._id));
                              }}
                              className="rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-5 py-2.5 text-sm font-semibold text-white"
                            >
                              {isOpen ? "Close Submission" : "Submit Assignment"}
                            </button>

                            {isOpen ? (
                              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                                <div className="text-sm font-semibold text-white">Submission Form</div>
                                <p className="mt-1 text-sm text-slate-300">
                                  {isFileSubmission
                                    ? `This assignment requires a ${assignment.submissionType} file upload. Other formats are not allowed.`
                                    : "This assignment requires a text submission."}
                                </p>

                                <div className="mt-4 flex flex-col items-center space-y-3">
                                  {assignment.submissionType === "TEXT" ? (
                                    <textarea
                                      rows={5}
                                      value={form.submissionText}
                                      onChange={(event) =>
                                        setAssignmentForms((current) => ({
                                          ...current,
                                          [assignment._id]: {
                                            submissionText: event.target.value,
                                            attachmentUrl: current[assignment._id]?.attachmentUrl || "",
                                            attachmentName: current[assignment._id]?.attachmentName || "",
                                            fileError: current[assignment._id]?.fileError || "",
                                          },
                                        }))
                                      }
                                      placeholder="Write your assignment answer here"
                                      className={`${inputClass} max-w-2xl text-left`}
                                    />
                                  ) : (
                                    <div className="space-y-3">
                                      <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:bg-white/10">
                                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/8 text-lg text-white">
                                          +
                                        </span>
                                        <span>{form.attachmentName ? "Change file" : `Add ${assignment.submissionType} file`}</span>
                                        <input
                                          type="file"
                                          accept={getAcceptedFileTypes(assignment.submissionType)}
                                          onChange={(event) =>
                                            void handleAssignmentFileChange(
                                              assignment,
                                              event.target.files && event.target.files.length > 0 ? event.target.files[0] : null
                                            )
                                          }
                                          className="sr-only"
                                        />
                                      </label>
                                      <div className="text-xs text-slate-300">
                                        {form.attachmentName
                                          ? `Selected file: ${form.attachmentName}`
                                          : `Upload your ${assignment.submissionType} file here.`}
                                      </div>
                                      {form.fileError ? (
                                        <div className="text-xs font-medium text-red-300">{form.fileError}</div>
                                      ) : null}
                                    </div>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => void submitAssignment(assignment)}
                                    disabled={submittingAssignmentId === assignment._id}
                                    className="rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
                                  >
                                    {submittingAssignmentId === assignment._id ? "Submitting..." : "Submit Now"}
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-[26px] border border-blue-200 bg-[linear-gradient(145deg,rgba(219,234,254,0.9),rgba(255,255,255,0.98))] p-5 shadow-[0_18px_50px_rgba(59,130,246,0.12)] backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-wide text-blue-700">Quiz List</div>
                    <p className="mt-1 text-sm text-slate-600">All quizzes for this module are shown here.</p>
                  </div>
                  <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-900">
                    {loading ? "..." : `${quizzes.length} quiz${quizzes.length === 1 ? "" : "zes"}`}
                  </div>
                </div>

                {loading ? (
                  <div className="text-sm text-slate-600">Loading quizzes...</div>
                ) : quizzes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-4 text-sm text-slate-500">
                    No quizzes available for this module.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quizzes.map((quiz) => {
                      const closed = isClosedByDeadline(quiz.deadline, quiz.isClosed);
                      return (
                        <div key={quiz._id} className="rounded-2xl border border-blue-200 bg-white p-4 shadow-[0_10px_30px_rgba(59,130,246,0.08)]">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-lg font-semibold text-slate-900">{quiz.title}</div>
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  closed ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {closed ? "Closed" : "Open"}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-slate-600">{quiz.description}</div>
                          </div>
                          <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                            {quiz.totalMarks} marks
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-blue-800">
                          <span className="rounded-full bg-blue-100 px-2.5 py-1">Deadline: {formatDateTime(quiz.deadline)}</span>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1">{quiz.questions.length} questions</span>
                        </div>

                        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">
                          <span className="font-semibold text-blue-800">Instructions:</span> {quiz.instructions}
                        </div>

                        {quiz.myAttempt?.status === "SUBMITTED" ? (
                          <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                            Submitted. Score: {quiz.myAttempt.score ?? 0} / {quiz.totalMarks}
                          </div>
                        ) : closed ? (
                          <div className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">
                            This quiz is closed because the deadline has passed.
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void startQuiz(quiz)}
                            disabled={startingQuizId === quiz._id}
                            className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
                          >
                            {startingQuizId === quiz._id ? "Starting..." : "Start Quiz"}
                          </button>
                        )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeQuiz ? (
                <div className="rounded-[26px] border border-blue-200 bg-[linear-gradient(145deg,rgba(219,234,254,0.88),rgba(255,255,255,0.98))] p-6 shadow-[0_18px_50px_rgba(59,130,246,0.12)] backdrop-blur-xl">
                  <div className="relative">
                    <div className="text-center">
                      <div className="text-xs font-medium uppercase tracking-[0.24em] text-blue-700">Quiz Attempt</div>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-900">{activeQuiz.quiz.title}</h2>
                      <p className="mt-2 text-sm text-slate-600">{activeQuiz.quiz.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveQuiz(null)}
                      className="absolute right-0 top-0 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-blue-50"
                    >
                      Close
                    </button>
                  </div>

                  <form className="mt-6 space-y-4" onSubmit={finishQuiz}>
                    {activeQuiz.quiz.questions.map((question, index) => (
                      <div key={question._id} className="rounded-2xl border border-blue-200 bg-white p-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-blue-800">
                          <span className="rounded-full bg-blue-100 px-2.5 py-1">Question {index + 1}</span>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1">{question.questionType.replaceAll("_", " ")}</span>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1">{question.topicCategory}</span>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1">{question.marks} marks</span>
                        </div>
                        <div className="mt-3 text-base font-semibold text-slate-900">{question.questionText}</div>

                        {question.questionType === "MCQ" || question.questionType === "TRUE_FALSE" ? (
                          <div className="mt-3 space-y-2">
                            {question.options.map((option) => (
                              <label
                                key={option}
                                className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-slate-800"
                              >
                                <input
                                  type="radio"
                                  name={question._id}
                                  value={option}
                                  checked={quizAnswers[question._id] === option}
                                  onChange={(event) =>
                                    setQuizAnswers((current) => ({ ...current, [question._id]: event.target.value }))
                                  }
                                />
                                <span className="text-slate-800">{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <textarea
                            rows={4}
                            value={quizAnswers[question._id] || ""}
                            onChange={(event) =>
                              setQuizAnswers((current) => ({ ...current, [question._id]: event.target.value }))
                            }
                            placeholder="Type your answer here"
                            className={`mt-3 ${inputClass} border-blue-200 bg-white text-slate-900 placeholder:text-slate-400`}
                          />
                        )}
                      </div>
                    ))}

                    <div className="flex justify-center">
                      <button
                        type="submit"
                        disabled={submittingQuiz}
                        className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
                      >
                        {submittingQuiz ? "Finishing..." : "Finish Quiz"}
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
