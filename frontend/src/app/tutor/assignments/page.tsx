"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Status = "DRAFT" | "PUBLISHED";
type SubmissionType = "PDF" | "DOCX" | "ZIP" | "TEXT";
type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "FILL_IN_THE_BLANKS";

type User = { _id: string; role: "STUDENT" | "TUTOR" | "ADMIN" };
type ModuleOption = { _id: string; moduleCode: string; name: string; faculty: string; year: number; semester: number };
type Assignment = { _id: string; title: string; description: string; moduleName: string; totalMarks: number; deadline: string; submissionType: SubmissionType; instructions: string; status: Status; createdAt: string };
type QuizQuestion = { _id?: string; questionType: QuestionType; questionText: string; options: string[]; correctAnswer: string; marks: number; topicCategory: string };
type Quiz = { _id: string; title: string; description: string; moduleName: string; totalMarks: number; deadline: string; instructions: string; status: Status; questions: QuizQuestion[]; createdAt: string };
type QuizAttemptRow = {
  student: { _id: string; fullName: string; email: string; userId: string };
  attemptId: string | null;
  submitted: boolean;
  submittedAt: string | null;
  isLate: boolean;
  status: "NOT_SUBMITTED" | "LATE" | "AUTO_GRADED" | "REVIEWED";
  score: number | null;
  reviewStatus: "AUTO_GRADED" | "REVIEWED";
  overallFeedback: string;
  reviewedAt: string | null;
  answers: Array<{ questionId: string; answer: string; isCorrect: boolean; marksAwarded: number; reviewComment?: string }>;
};
type QuizAttemptOverview = {
  quiz: Quiz;
  summary: { totalStudents: number; submittedCount: number; notSubmittedCount: number; lateCount: number };
  attempts: QuizAttemptRow[];
};
type QuizReviewForm = {
  answers: Array<{ questionId: string; marksAwarded: string; reviewComment: string }>;
  overallFeedback: string;
};
type AssignmentForm = { title: string; description: string; moduleName: string; totalMarks: string; deadline: string; submissionType: "" | SubmissionType; instructions: string };
type QuizQuestionForm = { questionType: QuestionType; questionText: string; options: string[]; correctAnswer: string; marks: string; topicCategory: string };
type QuizForm = { title: string; description: string; moduleName: string; totalMarks: string; deadline: string; instructions: string; questions: QuizQuestionForm[] };
type AssignmentFormErrors = Partial<Record<"title" | "description" | "moduleName" | "totalMarks" | "deadline" | "submissionType", string>>;
type QuizQuestionErrors = Partial<Record<"questionText" | "topicCategory" | "correctAnswer" | "marks" | "options", string>>;
type QuizFormErrors = Partial<Record<"title" | "description" | "moduleName" | "totalMarks" | "deadline", string>> & { questions?: QuizQuestionErrors[] };

const shell = "rounded-[28px] border border-blue-100 bg-white shadow-[0_20px_60px_rgba(37,99,235,0.08)]";
const input = "w-full rounded-2xl border border-blue-100 bg-blue-50/40 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500";
const card = "rounded-2xl border border-blue-100 bg-white p-4";
const overlay = "fixed inset-0 z-[90] overflow-y-auto bg-slate-950/80 px-4 py-8 backdrop-blur-sm";
const modalCard = "mx-auto w-full max-w-4xl rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_30px_90px_rgba(37,99,235,0.12)]";

const emptyAssignment: AssignmentForm = { title: "", description: "", moduleName: "", totalMarks: "", deadline: "", submissionType: "", instructions: "" };
const createQuestion = (type: QuestionType = "MCQ"): QuizQuestionForm => ({ questionType: type, questionText: "", options: type === "MCQ" ? ["", ""] : type === "TRUE_FALSE" ? ["True", "False"] : [], correctAnswer: "", marks: "", topicCategory: "" });
const emptyQuiz = (): QuizForm => ({ title: "", description: "", moduleName: "", totalMarks: "", deadline: "", instructions: "", questions: [createQuestion()] });
const dt = (value: string) => new Date(value).toLocaleString();
const toDateTimeLocal = (value: string) => { const d = new Date(value); if (Number.isNaN(d.getTime())) return ""; const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); };
const syncInstructionFields = <T extends { description: string; instructions: string }>(form: T) => ({ ...form, description: form.description, instructions: form.description });
const toAssignmentForm = (item: Assignment): AssignmentForm => ({ title: item.title, description: item.instructions || item.description, moduleName: item.moduleName, totalMarks: String(item.totalMarks), deadline: toDateTimeLocal(item.deadline), submissionType: item.submissionType, instructions: item.instructions || item.description });
const toQuizForm = (quiz: Quiz): QuizForm => ({ title: quiz.title, description: quiz.instructions || quiz.description, moduleName: quiz.moduleName, totalMarks: String(quiz.totalMarks), deadline: toDateTimeLocal(quiz.deadline), instructions: quiz.instructions || quiz.description, questions: quiz.questions.map((q) => ({ questionType: q.questionType, questionText: q.questionText, options: q.questionType === "MCQ" ? [...q.options] : q.questionType === "TRUE_FALSE" ? ["True", "False"] : [], correctAnswer: q.correctAnswer, marks: String(q.marks), topicCategory: q.topicCategory })) });
const buildQuizPayload = (form: QuizForm, status: Status) => ({ ...syncInstructionFields(form), totalMarks: Number(form.totalMarks), status, questions: form.questions.map((q) => ({ ...q, marks: Number(q.marks), options: q.questionType === "MCQ" ? q.options.filter((item) => item.trim()) : q.questionType === "TRUE_FALSE" ? ["True", "False"] : [] })) });
const fieldError = (message?: string) => message ? <p className="mt-1 text-xs font-medium text-red-500">{message}</p> : null;
const validateAssignmentForm = (form: AssignmentForm): AssignmentFormErrors => {
  const errors: AssignmentFormErrors = {};
  if (!form.title.trim()) errors.title = "This field is required.";
  if (!form.description.trim()) errors.description = "This field is required.";
  if (!form.moduleName) errors.moduleName = "This field is required.";
  if (!form.totalMarks || Number(form.totalMarks) <= 0) errors.totalMarks = "Enter a valid mark.";
  if (!form.deadline) errors.deadline = "This field is required.";
  if (!form.submissionType) errors.submissionType = "This field is required.";
  return errors;
};
const validateQuizForm = (form: QuizForm): QuizFormErrors => {
  const errors: QuizFormErrors = {};
  if (!form.title.trim()) errors.title = "This field is required.";
  if (!form.description.trim()) errors.description = "This field is required.";
  if (!form.moduleName) errors.moduleName = "This field is required.";
  if (!form.totalMarks || Number(form.totalMarks) <= 0) errors.totalMarks = "Enter a valid mark.";
  if (!form.deadline) errors.deadline = "This field is required.";
  const questionErrors = form.questions.map((question) => {
    const entry: QuizQuestionErrors = {};
    if (!question.topicCategory.trim()) entry.topicCategory = "This field is required.";
    if (!question.questionText.trim()) entry.questionText = "This field is required.";
    if (!question.correctAnswer.trim()) entry.correctAnswer = "This field is required.";
    if (!question.marks || Number(question.marks) <= 0) entry.marks = "Enter a valid mark.";
    if (question.questionType === "MCQ" && question.options.some((option) => !option.trim())) entry.options = "Each option is required.";
    return entry;
  });
  if (questionErrors.some((entry) => Object.keys(entry).length > 0)) errors.questions = questionErrors;
  return errors;
};

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-[0_16px_40px_rgba(37,99,235,0.08)]"><div className="text-xs uppercase tracking-[0.22em] text-blue-700">{label}</div><div className="mt-3 text-3xl font-semibold text-slate-900">{value}</div><p className="mt-2 text-sm text-slate-500">{note}</p></div>;
}

export default function TutorAssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => getToken(), []);
  const requestedTab = searchParams.get("tab");
  const selectedModuleId = searchParams.get("moduleId");
  const [tab, setTab] = useState<"assignments" | "quizzes">("assignments");
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [availableModules, setAvailableModules] = useState<ModuleOption[]>([]);
  const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>(emptyAssignment);
  const [quizForm, setQuizForm] = useState<QuizForm>(emptyQuiz());
  const [assignmentFormErrors, setAssignmentFormErrors] = useState<AssignmentFormErrors>({});
  const [quizFormErrors, setQuizFormErrors] = useState<QuizFormErrors>({});
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(false);
  const [assignmentEditForm, setAssignmentEditForm] = useState<AssignmentForm>(emptyAssignment);
  const [quizEditForm, setQuizEditForm] = useState<QuizForm>(emptyQuiz());
  const [assignmentEditErrors, setAssignmentEditErrors] = useState<AssignmentFormErrors>({});
  const [quizEditErrors, setQuizEditErrors] = useState<QuizFormErrors>({});
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingModules, setLoadingModules] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingAssignmentEdit, setSavingAssignmentEdit] = useState(false);
  const [savingQuizEdit, setSavingQuizEdit] = useState(false);
  const [publishingAssignmentId, setPublishingAssignmentId] = useState<string | null>(null);
  const [publishingQuizId, setPublishingQuizId] = useState<string | null>(null);
  const [closingAssignmentId, setClosingAssignmentId] = useState<string | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [loadingSubmissionAssignmentId, setLoadingSubmissionAssignmentId] = useState<string | null>(null);
  const [loadingAttemptQuizId, setLoadingAttemptQuizId] = useState<string | null>(null);
  const [attemptOverview, setAttemptOverview] = useState<QuizAttemptOverview | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<QuizAttemptRow | null>(null);
  const [quizReviewForm, setQuizReviewForm] = useState<QuizReviewForm>({ answers: [], overallFeedback: "" });
  const [savingQuizReview, setSavingQuizReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const assignmentStats = useMemo(() => { const now = new Date(); return { drafts: assignments.filter((i) => i.status === "DRAFT").length, active: assignments.filter((i) => i.status === "PUBLISHED" && new Date(i.deadline) >= now).length, closed: assignments.filter((i) => new Date(i.deadline) < now).length }; }, [assignments]);
  const quizStats = useMemo(() => { const now = new Date(); return { drafts: quizzes.filter((i) => i.status === "DRAFT").length, live: quizzes.filter((i) => i.status === "PUBLISHED" && new Date(i.deadline) >= now).length, closed: quizzes.filter((i) => new Date(i.deadline) < now).length }; }, [quizzes]);
  const activeModule = useMemo(() => availableModules.find((item) => item._id === selectedModuleId) || null, [availableModules, selectedModuleId]);
  const visibleModules = useMemo(() => activeModule ? [activeModule] : availableModules, [activeModule, availableModules]);
  const visibleAssignments = useMemo(() => activeModule ? assignments.filter((item) => item.moduleName === activeModule.name) : assignments, [activeModule, assignments]);
  const visibleQuizzes = useMemo(() => activeModule ? quizzes.filter((item) => item.moduleName === activeModule.name) : quizzes, [activeModule, quizzes]);

  useEffect(() => {
    if (requestedTab === "assignments" || requestedTab === "quizzes") {
      setTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (!activeModule) return;
    setAssignmentForm((current) => ({ ...current, moduleName: activeModule.name }));
    setQuizForm((current) => ({ ...current, moduleName: activeModule.name }));
  }, [activeModule]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { async function boot() { if (!token) { router.push("/login"); return; } try { const me = await apiFetch<{ user: User }>("/api/me", {}, token); if (me.user.role !== "TUTOR") { router.push("/login"); return; } await Promise.all([loadAssignments(token), loadQuizzes(token), loadModules(token)]); } catch (err: unknown) { setLoadingAssignments(false); setLoadingQuizzes(false); setLoadingModules(false); setError(err instanceof Error ? err.message : "Failed to load data."); } } void boot(); }, [router, token]);

  async function loadAssignments(authToken = token) { if (!authToken) return; setLoadingAssignments(true); const data = await apiFetch<{ assignments: Assignment[] }>("/api/assignments", {}, authToken); setAssignments(data.assignments); setLoadingAssignments(false); }
  async function loadQuizzes(authToken = token) { if (!authToken) return; setLoadingQuizzes(true); const data = await apiFetch<{ quizzes: Quiz[] }>("/api/quizzes", {}, authToken); setQuizzes(data.quizzes); setLoadingQuizzes(false); }
  async function loadModules(authToken = token) { if (!authToken) return; setLoadingModules(true); const data = await apiFetch<{ modules: ModuleOption[] }>("/api/modules", {}, authToken); setAvailableModules(data.modules); setLoadingModules(false); }

  async function saveAssignment(status: Status) {
    if (!token) return;
    const validationErrors = validateAssignmentForm(assignmentForm);
    setAssignmentFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSavingAssignment(true); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ assignment: Assignment }>("/api/assignments", { method: "POST", body: JSON.stringify({ ...syncInstructionFields(assignmentForm), totalMarks: Number(assignmentForm.totalMarks), status }) }, token);
      setAssignments((current) => [data.assignment, ...current]);
      setAssignmentForm(emptyAssignment); setAssignmentFormErrors({}); setShowAssignmentForm(false);
      setSuccess(status === "DRAFT" ? "Assignment saved as draft." : "Assignment created successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save assignment.");
    } finally { setSavingAssignment(false); }
  }

  async function saveQuiz(status: Status) {
    if (!token) return;
    const validationErrors = validateQuizForm(quizForm);
    setQuizFormErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSavingQuiz(true); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ quiz: Quiz }>("/api/quizzes", { method: "POST", body: JSON.stringify(buildQuizPayload(quizForm, status)) }, token);
      setQuizzes((current) => [data.quiz, ...current]);
      setQuizForm(emptyQuiz()); setQuizFormErrors({}); setShowQuizForm(false);
      setSuccess(status === "DRAFT" ? "Quiz saved as draft." : "Quiz created successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save quiz.");
    } finally { setSavingQuiz(false); }
  }

  async function publishAssignment(id: string) {
    if (!token) return;
    setPublishingAssignmentId(id); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ assignment: Assignment; message: string }>(`/api/assignments/${id}/publish`, { method: "PATCH" }, token);
      setAssignments((current) => current.map((item) => item._id === id ? data.assignment : item));
      setSelectedAssignment((current) => current && current._id === id ? data.assignment : current);
      setSuccess(data.message || "Assignment published successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish assignment.");
    } finally { setPublishingAssignmentId(null); }
  }

  async function closeAssignment(id: string) {
    if (!token) return;
    setClosingAssignmentId(id); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ assignment: Assignment; message: string }>(`/api/assignments/${id}/close`, { method: "PATCH" }, token);
      setAssignments((current) => current.map((item) => item._id === id ? data.assignment : item));
      setSelectedAssignment((current) => current && current._id === id ? data.assignment : current);
      setSuccess(data.message || "Assignment closed successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to close assignment.");
    } finally { setClosingAssignmentId(null); }
  }

  async function publishQuiz(id: string) {
    if (!token) return;
    setPublishingQuizId(id); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ quiz: Quiz; message: string }>(`/api/quizzes/${id}/publish`, { method: "PATCH" }, token);
      setQuizzes((current) => current.map((item) => item._id === id ? data.quiz : item));
      setSelectedQuiz((current) => current && current._id === id ? data.quiz : current);
      setSuccess(data.message || "Quiz published successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish quiz.");
    } finally { setPublishingQuizId(null); }
  }

  async function saveAssignmentEdit() {
    if (!token || !selectedAssignment) return;
    const validationErrors = validateAssignmentForm(assignmentEditForm);
    setAssignmentEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSavingAssignmentEdit(true); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ assignment: Assignment; message: string }>(`/api/assignments/${selectedAssignment._id}`, { method: "PATCH", body: JSON.stringify({ ...syncInstructionFields(assignmentEditForm), totalMarks: Number(assignmentEditForm.totalMarks), status: selectedAssignment.status }) }, token);
      setAssignments((current) => current.map((item) => item._id === data.assignment._id ? data.assignment : item));
      setSelectedAssignment(data.assignment); setAssignmentEditForm(toAssignmentForm(data.assignment)); setAssignmentEditErrors({}); setEditingAssignment(false);
      setSuccess(data.message || "Assignment updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update assignment.");
    } finally { setSavingAssignmentEdit(false); }
  }

  async function saveQuizEdit() {
    if (!token || !selectedQuiz) return;
    const validationErrors = validateQuizForm(quizEditForm);
    setQuizEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setSavingQuizEdit(true); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ quiz: Quiz; message: string }>(`/api/quizzes/${selectedQuiz._id}`, { method: "PATCH", body: JSON.stringify(buildQuizPayload(quizEditForm, selectedQuiz.status)) }, token);
      setQuizzes((current) => current.map((item) => item._id === data.quiz._id ? data.quiz : item));
      setSelectedQuiz(data.quiz); setQuizEditForm(toQuizForm(data.quiz)); setQuizEditErrors({}); setEditingQuiz(false);
      setSuccess(data.message || "Quiz updated successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update quiz.");
    } finally { setSavingQuizEdit(false); }
  }

  async function deleteAssignment(id: string) {
    if (!token) return;
    setDeletingAssignmentId(id); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ message: string }>(`/api/assignments/${id}`, { method: "DELETE" }, token);
      setAssignments((current) => current.filter((item) => item._id !== id));
      setSelectedAssignment((current) => current && current._id === id ? null : current);
      setEditingAssignment(false); setSuccess(data.message || "Assignment deleted successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete assignment.");
    } finally { setDeletingAssignmentId(null); }
  }

  async function deleteQuiz(id: string) {
    if (!token) return;
    setDeletingQuizId(id); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ message: string }>(`/api/quizzes/${id}`, { method: "DELETE" }, token);
      setQuizzes((current) => current.filter((item) => item._id !== id));
      setSelectedQuiz((current) => current && current._id === id ? null : current);
      setEditingQuiz(false); setSuccess(data.message || "Quiz deleted successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete quiz.");
    } finally { setDeletingQuizId(null); }
  }

  async function openAssignmentSubmissions(id: string) {
    if (!token) return;
    setLoadingSubmissionAssignmentId(id); setError(null); setSuccess(null);
    const params = new URLSearchParams({ tab: "assignments" });
    if (selectedModuleId) params.set("moduleId", selectedModuleId);
    router.push(`/tutor/assignments/${id}/submissions?${params.toString()}`);
  }

  async function openQuizAttempts(id: string) {
    if (!token) return;
    setLoadingAttemptQuizId(id); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<QuizAttemptOverview>(`/api/quizzes/${id}/attempts`, {}, token);
      setAttemptOverview(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load quiz attempts.");
    } finally { setLoadingAttemptQuizId(null); }
  }

  function startQuizReview(row: QuizAttemptRow) {
    if (!attemptOverview) return;
    setSelectedAttempt(row);
    setQuizReviewForm({
      answers: attemptOverview.quiz.questions.map((question) => {
        const answer = row.answers.find((item) => item.questionId === question._id);
        return {
          questionId: String(question._id || ""),
          marksAwarded: String(answer?.marksAwarded ?? 0),
          reviewComment: answer?.reviewComment || "",
        };
      }),
      overallFeedback: row.overallFeedback || "",
    });
  }

  async function saveQuizReview() {
    if (!token || !attemptOverview || !selectedAttempt?.attemptId) return;
    setSavingQuizReview(true); setError(null); setSuccess(null);
    try {
      const data = await apiFetch<{ attempt: Pick<QuizAttemptRow, "score" | "answers" | "reviewStatus" | "overallFeedback" | "reviewedAt">; message: string }>(
        `/api/quizzes/${attemptOverview.quiz._id}/attempts/${selectedAttempt.attemptId}/review`,
        { method: "PATCH", body: JSON.stringify(quizReviewForm) },
        token
      );
      setAttemptOverview((current) => current ? ({
        ...current,
        attempts: current.attempts.map((row) => row.attemptId === selectedAttempt.attemptId ? {
          ...row,
          ...data.attempt,
          status: row.isLate ? "LATE" : "REVIEWED",
        } : row),
      }) : current);
      setSelectedAttempt((current) => current ? { ...current, ...data.attempt, status: current.isLate ? "LATE" : "REVIEWED" } : current);
      setSuccess(data.message || "Quiz attempt reviewed successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save quiz review.");
    } finally { setSavingQuizReview(false); }
  }

  function openAssignmentDetails(item: Assignment) { setSelectedAssignment(item); setAssignmentEditForm(toAssignmentForm(item)); setEditingAssignment(false); }
  function openQuizDetails(item: Quiz) { setSelectedQuiz(item); setQuizEditForm(toQuizForm(item)); setEditingQuiz(false); }
  function updateQuestion(mode: "create" | "edit", index: number, patch: Partial<QuizQuestionForm>) { const setter = mode === "create" ? setQuizForm : setQuizEditForm; setter((current) => ({ ...current, questions: current.questions.map((q, i) => i === index ? { ...q, ...patch } : q) })); }
  function changeQuestionType(mode: "create" | "edit", index: number, type: QuestionType) { const setter = mode === "create" ? setQuizForm : setQuizEditForm; setter((current) => ({ ...current, questions: current.questions.map((q, i) => i === index ? { ...createQuestion(type), questionText: q.questionText, marks: q.marks, topicCategory: q.topicCategory } : q) })); }
  function addQuestion(mode: "create" | "edit") { const setter = mode === "create" ? setQuizForm : setQuizEditForm; setter((current) => ({ ...current, questions: [...current.questions, createQuestion()] })); }
  function removeQuestion(mode: "create" | "edit", index: number) { const setter = mode === "create" ? setQuizForm : setQuizEditForm; setter((current) => ({ ...current, questions: current.questions.filter((_, i) => i !== index) })); }

  function renderQuestions(form: QuizForm, mode: "create" | "edit", disabled: boolean, errors?: QuizQuestionErrors[]) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="text-sm font-semibold uppercase tracking-wide text-orange-100">Quiz Questions</div><p className="mt-1 text-sm text-slate-300">Add MCQ or Short Answer questions.</p></div>
          <button type="button" onClick={() => addQuestion(mode)} disabled={disabled} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 disabled:opacity-60">Add Question</button>
        </div>
        {form.questions.map((question, index) => (
          <div key={`${mode}-question-${index}`} className="rounded-[24px] border border-white/10 bg-slate-950/45 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-base font-semibold text-white">Question {index + 1}</div>
              {form.questions.length > 1 ? <button type="button" onClick={() => removeQuestion(mode, index)} disabled={disabled} className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 disabled:opacity-60">Remove Question</button> : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <select className={input} value={question.questionType} onChange={(e) => changeQuestionType(mode, index, e.target.value as QuestionType)} disabled={disabled}>
                <option value="MCQ">MCQ</option><option value="SHORT_ANSWER">Short Answer</option>
              </select>
              <div>{fieldError(errors?.[index]?.topicCategory)}<input className={input} placeholder="Topic / Category" value={question.topicCategory} onChange={(e) => updateQuestion(mode, index, { topicCategory: e.target.value })} disabled={disabled} required /></div>
              <div className="md:col-span-2">{fieldError(errors?.[index]?.questionText)}<textarea className={`${input}`} rows={3} placeholder="Question Text" value={question.questionText} onChange={(e) => updateQuestion(mode, index, { questionText: e.target.value })} disabled={disabled} required /></div>
              {question.questionType === "MCQ" ? (
                <div className="space-y-3 md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-sm font-medium text-orange-100">Options</span>
                    <button type="button" onClick={() => updateQuestion(mode, index, { options: [...question.options, ""] })} disabled={disabled} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:opacity-60">Add Option</button>
                  </div>
                  {fieldError(errors?.[index]?.options)}
                  {question.options.map((option, optionIndex) => (
                    <div key={`${mode}-q${index}-o${optionIndex}`} className="flex gap-3">
                      <input className={input} placeholder={`Option ${optionIndex + 1}`} value={option} onChange={(e) => updateQuestion(mode, index, { options: question.options.map((item, i) => i === optionIndex ? e.target.value : item) })} disabled={disabled} required />
                      {question.options.length > 2 ? <button type="button" onClick={() => updateQuestion(mode, index, { options: question.options.filter((_, i) => i !== optionIndex) })} disabled={disabled} className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-200 disabled:opacity-60">Remove</button> : null}
                    </div>
                  ))}
                </div>
              ) : question.questionType === "TRUE_FALSE" ? <div className="md:col-span-2 text-sm text-slate-300">Options: True and False</div> : null}
              <div>{fieldError(errors?.[index]?.correctAnswer)}<input className={input} placeholder={question.questionType === "TRUE_FALSE" ? "Correct Answer: True or False" : "Correct Answer"} value={question.correctAnswer} onChange={(e) => updateQuestion(mode, index, { correctAnswer: e.target.value })} disabled={disabled} required /></div>
              <div>{fieldError(errors?.[index]?.marks)}<input className={input} type="number" min="0" placeholder="Marks" value={question.marks} onChange={(e) => updateQuestion(mode, index, { marks: e.target.value })} disabled={disabled} required /></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <div className={`${shell} p-6`}><div className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200/80">Assessment Studio</div><h1 className="mt-3 text-3xl font-semibold text-white">Assignments & Quizzes</h1><p className="mt-2 max-w-2xl text-sm text-slate-300">Create assignments and quizzes for students from one tutor workspace.</p></div>
        <div className={`${shell} p-4`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex rounded-full border border-white/10 bg-slate-950/60 p-1 shadow-[0_14px_35px_rgba(0,0,0,0.28)]">
              {(["assignments", "quizzes"] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${tab === item ? "bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 text-slate-950 shadow-[0_12px_30px_rgba(251,146,60,0.35)]" : "text-slate-300 hover:text-white"}`}>{item === "assignments" ? "Assignments" : "Quizzes"}</button>)}
            </div>
            <button
              type="button"
              onClick={() => activeModule ? router.push(`/tutor/modules/${activeModule._id}/results`) : null}
              disabled={!activeModule}
              className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              View Results
            </button>
          </div>
        </div>
        {error ? <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
        {success ? <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{success}</div> : null}

        {tab === "assignments" ? (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(249,115,22,0.16),rgba(17,24,39,0.78))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div><div className="text-sm font-semibold uppercase tracking-wide text-amber-100">Assignment Management</div><p className="mt-3 max-w-2xl text-sm text-slate-300">Create assignments, attach instructions, and manage saved work here.</p></div>
                <button type="button" onClick={() => { setShowAssignmentForm((current) => !current); setAssignmentFormErrors({}); setError(null); setSuccess(null); }} className="rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_14px_32px_rgba(251,146,60,0.35)]">{showAssignmentForm ? "Close Form" : "Create Assignment"}</button>
              </div>
            </div>

            {showAssignmentForm ? (
              <div className={`${shell} p-6`}>
                <h2 className="text-2xl font-semibold text-white">Create a New Assignment</h2><p className="mt-2 text-sm text-slate-300">Select one of the admin-created modules to attach this assignment to.</p>
                <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={(event: FormEvent) => { event.preventDefault(); void saveAssignment("PUBLISHED"); }}>
                  <div className="md:col-span-2"><input className={`${input}`} placeholder="Assignment Title" value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} required />{fieldError(assignmentFormErrors.title)}</div>
                  <div className="md:col-span-2"><textarea className={`${input}`} rows={5} placeholder="Instructions" value={assignmentForm.description} onChange={(e) => setAssignmentForm({ ...assignmentForm, description: e.target.value, instructions: e.target.value })} required />{fieldError(assignmentFormErrors.description)}</div>
                  <div><select className={input} value={assignmentForm.moduleName} onChange={(e) => setAssignmentForm({ ...assignmentForm, moduleName: e.target.value })} required disabled={loadingModules || visibleModules.length === 0 || !!activeModule}><option value="">{loadingModules ? "Loading modules..." : visibleModules.length === 0 ? "No modules available" : "Select module"}</option>{visibleModules.map((moduleItem) => <option key={moduleItem._id} value={moduleItem.name}>{moduleItem.moduleCode} - {moduleItem.name} - Year {moduleItem.year} Semester {moduleItem.semester}</option>)}</select>{fieldError(assignmentFormErrors.moduleName)}</div>
                  <div><input className={input} type="number" min="0" placeholder="Total Marks" value={assignmentForm.totalMarks} onChange={(e) => setAssignmentForm({ ...assignmentForm, totalMarks: e.target.value })} required />{fieldError(assignmentFormErrors.totalMarks)}</div>
                  <div><input className={input} type="datetime-local" value={assignmentForm.deadline} onChange={(e) => setAssignmentForm({ ...assignmentForm, deadline: e.target.value })} required />{fieldError(assignmentFormErrors.deadline)}</div>
                  <div><select className={input} value={assignmentForm.submissionType} onChange={(e) => setAssignmentForm({ ...assignmentForm, submissionType: e.target.value as AssignmentForm["submissionType"] })} required><option value="">Submission Type</option><option value="PDF">PDF</option><option value="DOCX">DOCX</option><option value="ZIP">ZIP</option><option value="TEXT">Text</option></select>{fieldError(assignmentFormErrors.submissionType)}</div>
                  <div className="flex flex-wrap gap-3 md:col-span-2"><button type="submit" disabled={savingAssignment} className="rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-70">{savingAssignment ? "Saving..." : "Publish Assignment"}</button><button type="button" disabled={savingAssignment} onClick={() => void saveAssignment("DRAFT")} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 disabled:opacity-70">Save as Draft</button></div>
                </form>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-3"><StatCard label="Drafts" value={loadingAssignments ? "--" : String(assignmentStats.drafts).padStart(2, "0")} note="Assignments saved privately before publishing." /><StatCard label="Active" value={loadingAssignments ? "--" : String(assignmentStats.active).padStart(2, "0")} note="Published assignments still before deadline." /><StatCard label="Closed" value={loadingAssignments ? "--" : String(assignmentStats.closed).padStart(2, "0")} note="Assignments whose deadlines have passed." /></div>

            <div className={`${shell} p-5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-orange-100">Saved Assignments</div>
                  <p className="mt-2 text-sm text-slate-300">
                    {activeModule ? `${activeModule.moduleCode} - ${activeModule.name}` : "Assignments already stored in the database."}
                  </p>
                </div>
                <button type="button" onClick={() => void loadAssignments()} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">
                  Refresh
                </button>
              </div>
              {loadingAssignments ? (
                <div className="mt-5 text-sm text-slate-500">Loading assignments...</div>
              ) : visibleAssignments.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-blue-100 bg-white p-5 text-sm text-slate-500">
                  {activeModule ? "No assignments created yet for this module." : "No assignments created yet."}
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {visibleAssignments.map((item) => (
                    <div key={item._id} className={card}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-lg font-semibold text-slate-900">{item.title}</div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {item.status === "PUBLISHED" ? "Published" : "Draft"}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600">{item.description}</div>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-blue-50 px-3 py-1">Module: {item.moduleName}</span>
                            <span className="rounded-full bg-blue-50 px-3 py-1">Marks: {item.totalMarks}</span>
                            <span className="rounded-full bg-blue-50 px-3 py-1">Submission: {item.submissionType}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                          <div className="space-y-1 text-right text-sm text-slate-600">
                            <div>Deadline: {dt(item.deadline)}</div>
                            <div className="text-xs text-slate-500">Created: {dt(item.createdAt)}</div>
                          </div>
                          <div className="flex flex-wrap justify-end gap-3">
                            <button type="button" onClick={() => openAssignmentDetails(item)} className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">
                              View
                            </button>
                            {item.status === "PUBLISHED" ? (
                              <button type="button" onClick={() => void openAssignmentSubmissions(item._id)} disabled={loadingSubmissionAssignmentId === item._id} className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60">
                                {loadingSubmissionAssignmentId === item._id ? "Loading..." : "Check Submissions"}
                              </button>
                            ) : null}
                            {item.status === "DRAFT" ? (
                              <button type="button" onClick={() => void publishAssignment(item._id)} disabled={publishingAssignmentId === item._id} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70">
                                {publishingAssignmentId === item._id ? "Publishing..." : "Publish"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(168,85,247,0.14),rgba(17,24,39,0.78))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="text-sm font-semibold uppercase tracking-wide text-orange-100">Quiz Management</div><p className="mt-3 max-w-2xl text-sm text-slate-300">Create quizzes, add questions, and manage saved quiz sets here.</p></div><button type="button" onClick={() => { setShowQuizForm((current) => !current); setQuizFormErrors({}); setError(null); setSuccess(null); }} className="rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_14px_32px_rgba(251,146,60,0.35)]">{showQuizForm ? "Close Form" : "Create Quiz"}</button></div></div>
            {showQuizForm ? <div className={`${shell} p-6`}><h2 className="text-2xl font-semibold text-white">Create a New Quiz</h2><p className="mt-2 text-sm text-slate-300">Select one of the admin-created modules before building the quiz.</p><form className="mt-6 space-y-6" onSubmit={(event: FormEvent) => { event.preventDefault(); void saveQuiz("PUBLISHED"); }}><div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><input className={`${input}`} placeholder="Quiz Title" value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} required />{fieldError(quizFormErrors.title)}</div><div className="md:col-span-2"><textarea className={`${input}`} rows={5} placeholder="Instructions" value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value, instructions: e.target.value })} required />{fieldError(quizFormErrors.description)}</div><div><select className={input} value={quizForm.moduleName} onChange={(e) => setQuizForm({ ...quizForm, moduleName: e.target.value })} required disabled={loadingModules || visibleModules.length === 0 || !!activeModule}><option value="">{loadingModules ? "Loading modules..." : visibleModules.length === 0 ? "No modules available" : "Select module"}</option>{visibleModules.map((moduleItem) => <option key={moduleItem._id} value={moduleItem.name}>{moduleItem.moduleCode} - {moduleItem.name} - Year {moduleItem.year} Semester {moduleItem.semester}</option>)}</select>{fieldError(quizFormErrors.moduleName)}</div><div><input className={input} type="number" min="0" placeholder="Total Marks" value={quizForm.totalMarks} onChange={(e) => setQuizForm({ ...quizForm, totalMarks: e.target.value })} required />{fieldError(quizFormErrors.totalMarks)}</div><div><input className={input} type="datetime-local" value={quizForm.deadline} onChange={(e) => setQuizForm({ ...quizForm, deadline: e.target.value })} required />{fieldError(quizFormErrors.deadline)}</div></div>{renderQuestions(quizForm, "create", savingQuiz, quizFormErrors.questions)}<div className="flex flex-wrap gap-3"><button type="submit" disabled={savingQuiz} className="rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-70">{savingQuiz ? "Saving..." : "Publish Quiz"}</button><button type="button" disabled={savingQuiz} onClick={() => void saveQuiz("DRAFT")} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 disabled:opacity-70">Save as Draft</button></div></form></div> : null}
            <div className="grid gap-4 md:grid-cols-3"><StatCard label="Draft Quizzes" value={loadingQuizzes ? "--" : String(quizStats.drafts).padStart(2, "0")} note="Quizzes saved privately before release." /><StatCard label="Live" value={loadingQuizzes ? "--" : String(quizStats.live).padStart(2, "0")} note="Published quizzes students can still attempt." /><StatCard label="Closed" value={loadingQuizzes ? "--" : String(quizStats.closed).padStart(2, "0")} note="Quizzes whose deadlines have passed." /></div>
            <div className={`${shell} p-5`}>
              <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold uppercase tracking-wide text-orange-100">Saved Quizzes</div><p className="mt-2 text-sm text-slate-300">{activeModule ? `${activeModule.moduleCode} - ${activeModule.name}` : "Quizzes already stored in the database."}</p></div><button type="button" onClick={() => void loadQuizzes()} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">Refresh</button></div>
              {loadingQuizzes ? <div className="mt-5 text-sm text-slate-300">Loading quizzes...</div> : visibleQuizzes.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-slate-950/35 p-5 text-sm text-slate-400">{activeModule ? "No quizzes created yet for this module." : "No quizzes created yet."}</div> : <div className="mt-5 space-y-3">{visibleQuizzes.map((quiz) => <div key={quiz._id} className={card}><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="space-y-2"><div className="flex flex-wrap items-center gap-2"><div className="text-lg font-semibold text-white">{quiz.title}</div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quiz.status === "PUBLISHED" ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>{quiz.status === "PUBLISHED" ? "Published" : "Draft"}</span></div><div className="text-sm text-slate-300">{quiz.description}</div><div className="flex flex-wrap gap-2 text-xs text-slate-400"><span className="rounded-full bg-white/5 px-3 py-1">Module: {quiz.moduleName}</span><span className="rounded-full bg-white/5 px-3 py-1">Marks: {quiz.totalMarks}</span><span className="rounded-full bg-white/5 px-3 py-1">Questions: {quiz.questions.length}</span></div></div><div className="space-y-1 text-sm text-slate-300 md:text-right"><div>Deadline: {dt(quiz.deadline)}</div><div className="text-xs text-slate-500">Created: {dt(quiz.createdAt)}</div></div></div><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => openQuizDetails(quiz)} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">View</button>{quiz.status === "PUBLISHED" ? <button type="button" onClick={() => void openQuizAttempts(quiz._id)} disabled={loadingAttemptQuizId === quiz._id} className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-60">{loadingAttemptQuizId === quiz._id ? "Loading..." : "Review Attempts"}</button> : null}{quiz.status === "DRAFT" ? <button type="button" onClick={() => void publishQuiz(quiz._id)} disabled={publishingQuizId === quiz._id} className="rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-70">{publishingQuizId === quiz._id ? "Publishing..." : "Publish"}</button> : null}<button type="button" onClick={() => void deleteQuiz(quiz._id)} disabled={deletingQuizId === quiz._id} className="rounded-full border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-60">{deletingQuizId === quiz._id ? "Deleting..." : "Delete"}</button></div></div>)}</div>}
            </div>
          </div>
        )}
      </div>

      {selectedAssignment ? (
        <div className={overlay}>
          <div className={modalCard}>
            <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200/75">Assignment Details</div><h2 className="mt-3 text-2xl font-semibold text-white">{selectedAssignment.title}</h2><p className="mt-2 text-sm text-slate-300">View the saved details, then edit or delete if needed.</p></div><button type="button" onClick={() => { setSelectedAssignment(null); setEditingAssignment(false); }} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">Close</button></div>
            {!editingAssignment ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedAssignment.status === "PUBLISHED" ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"}`}>{selectedAssignment.status === "PUBLISHED" ? "Published" : "Draft"}</span><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">Module: {selectedAssignment.moduleName}</span></div>
                <div className="grid gap-4 md:grid-cols-2"><div className={card}><div className="text-xs uppercase tracking-[0.2em] text-orange-100/80">Instructions</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-200">{selectedAssignment.instructions || selectedAssignment.description}</div></div><div className={card}><div className="grid gap-3 text-sm text-slate-200"><div><span className="font-semibold text-orange-100">Marks:</span> {selectedAssignment.totalMarks}</div><div><span className="font-semibold text-orange-100">Submission Type:</span> {selectedAssignment.submissionType}</div><div><span className="font-semibold text-orange-100">Deadline:</span> {dt(selectedAssignment.deadline)}</div><div><span className="font-semibold text-orange-100">Created:</span> {dt(selectedAssignment.createdAt)}</div></div></div></div>
                <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setEditingAssignment(true)} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Edit</button>{selectedAssignment.status === "PUBLISHED" ? <button type="button" onClick={() => void openAssignmentSubmissions(selectedAssignment._id)} disabled={loadingSubmissionAssignmentId === selectedAssignment._id} className="rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60">{loadingSubmissionAssignmentId === selectedAssignment._id ? "Loading..." : "Check Submissions"}</button> : null}{selectedAssignment.status === "PUBLISHED" && new Date(selectedAssignment.deadline).getTime() >= Date.now() ? <button type="button" onClick={() => void closeAssignment(selectedAssignment._id)} disabled={closingAssignmentId === selectedAssignment._id} className="rounded-full border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60">{closingAssignmentId === selectedAssignment._id ? "Closing..." : "Close Assignment"}</button> : null}{selectedAssignment.status === "DRAFT" ? <button type="button" onClick={() => void publishAssignment(selectedAssignment._id)} disabled={publishingAssignmentId === selectedAssignment._id} className="rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-blue-50 disabled:opacity-60">{publishingAssignmentId === selectedAssignment._id ? "Publishing..." : "Publish"}</button> : null}<button type="button" onClick={() => void deleteAssignment(selectedAssignment._id)} disabled={deletingAssignmentId === selectedAssignment._id} className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60">{deletingAssignmentId === selectedAssignment._id ? "Deleting..." : "Delete"}</button></div>
              </div>
            ) : (
              <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void saveAssignmentEdit(); }}>
                <div className="md:col-span-2"><input className={`${input}`} placeholder="Assignment Title" value={assignmentEditForm.title} onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, title: e.target.value })} required />{fieldError(assignmentEditErrors.title)}</div>
                <div className="md:col-span-2"><textarea className={`${input}`} rows={5} placeholder="Instructions" value={assignmentEditForm.description} onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, description: e.target.value, instructions: e.target.value })} required />{fieldError(assignmentEditErrors.description)}</div>
                <div><select className={input} value={assignmentEditForm.moduleName} onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, moduleName: e.target.value })} required disabled={loadingModules || visibleModules.length === 0 || !!activeModule}><option value="">{loadingModules ? "Loading modules..." : visibleModules.length === 0 ? "No modules available" : "Select module"}</option>{visibleModules.map((moduleItem) => <option key={moduleItem._id} value={moduleItem.name}>{moduleItem.moduleCode} - {moduleItem.name} - Year {moduleItem.year} Semester {moduleItem.semester}</option>)}</select>{fieldError(assignmentEditErrors.moduleName)}</div>
                <div><input className={input} type="number" min="0" placeholder="Total Marks" value={assignmentEditForm.totalMarks} onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, totalMarks: e.target.value })} required />{fieldError(assignmentEditErrors.totalMarks)}</div>
                <div><input className={input} type="datetime-local" value={assignmentEditForm.deadline} onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, deadline: e.target.value })} required />{fieldError(assignmentEditErrors.deadline)}</div>
                <div><select className={input} value={assignmentEditForm.submissionType} onChange={(e) => setAssignmentEditForm({ ...assignmentEditForm, submissionType: e.target.value as AssignmentForm["submissionType"] })} required><option value="">Submission Type</option><option value="PDF">PDF</option><option value="DOCX">DOCX</option><option value="ZIP">ZIP</option><option value="TEXT">Text</option></select>{fieldError(assignmentEditErrors.submissionType)}</div>
                <div className="flex flex-wrap gap-3 md:col-span-2"><button type="submit" disabled={savingAssignmentEdit} className="rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-70">{savingAssignmentEdit ? "Saving..." : "Save Changes"}</button><button type="button" onClick={() => { setEditingAssignment(false); setAssignmentEditErrors({}); setAssignmentEditForm(toAssignmentForm(selectedAssignment)); }} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200">Cancel</button></div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {selectedQuiz ? (
        <div className={overlay}>
          <div className={modalCard}>
            <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-medium uppercase tracking-[0.24em] text-blue-700">Quiz Details</div><h2 className="mt-3 text-2xl font-semibold text-slate-900">{selectedQuiz.title}</h2><p className="mt-2 text-sm text-slate-600">View the saved quiz, then edit or delete it from this panel.</p></div><button type="button" onClick={() => { setSelectedQuiz(null); setEditingQuiz(false); }} className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">Close</button></div>
            {!editingQuiz ? (
              <div className="mt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${selectedQuiz.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{selectedQuiz.status === "PUBLISHED" ? "Published" : "Draft"}</span><span className="rounded-full bg-blue-50 px-3 py-1 text-xs text-slate-700">Module: {selectedQuiz.moduleName}</span></div>
                <div className="grid gap-4 md:grid-cols-2"><div className={card}><div className="text-xs uppercase tracking-[0.2em] text-blue-700">Instructions</div><div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedQuiz.instructions || selectedQuiz.description}</div></div><div className={card}><div className="grid gap-3 text-sm text-slate-700"><div><span className="font-semibold text-blue-700">Marks:</span> {selectedQuiz.totalMarks}</div><div><span className="font-semibold text-blue-700">Questions:</span> {selectedQuiz.questions.length}</div><div><span className="font-semibold text-blue-700">Deadline:</span> {dt(selectedQuiz.deadline)}</div><div><span className="font-semibold text-blue-700">Created:</span> {dt(selectedQuiz.createdAt)}</div></div></div></div>
                <div className="space-y-3">{selectedQuiz.questions.map((question, index) => <div key={question._id || `quiz-question-${index}`} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_10px_30px_rgba(37,99,235,0.08)]"><div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold"><span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">{question.questionType.replaceAll("_", " ")}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-slate-700">{question.topicCategory}</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-slate-700">{question.marks} marks</span></div><div className="mt-3 text-sm font-medium text-slate-900">{question.questionText}</div>{question.options.length > 0 ? <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-700">{question.options.map((option, optionIndex) => <span key={`${question._id || index}-option-${optionIndex}`} className="rounded-full bg-blue-50 px-3 py-1">{option}</span>)}</div> : null}<div className="mt-2 text-xs text-slate-600">Correct Answer: <span className="font-medium text-blue-700">{question.correctAnswer}</span></div></div>)}</div>
                <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setEditingQuiz(true)} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Edit</button>{selectedQuiz.status === "PUBLISHED" ? <button type="button" onClick={() => void openQuizAttempts(selectedQuiz._id)} disabled={loadingAttemptQuizId === selectedQuiz._id} className="rounded-full border border-blue-100 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60">{loadingAttemptQuizId === selectedQuiz._id ? "Loading..." : "Review Attempts"}</button> : null}{selectedQuiz.status === "DRAFT" ? <button type="button" onClick={() => void publishQuiz(selectedQuiz._id)} disabled={publishingQuizId === selectedQuiz._id} className="rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60">{publishingQuizId === selectedQuiz._id ? "Publishing..." : "Publish"}</button> : null}<button type="button" onClick={() => void deleteQuiz(selectedQuiz._id)} disabled={deletingQuizId === selectedQuiz._id} className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-60">{deletingQuizId === selectedQuiz._id ? "Deleting..." : "Delete"}</button></div>
              </div>
            ) : (
              <form className="mt-6 space-y-6" onSubmit={(event) => { event.preventDefault(); void saveQuizEdit(); }}>
                <div className="grid gap-4 md:grid-cols-2"><div className="md:col-span-2"><input className={`${input}`} placeholder="Quiz Title" value={quizEditForm.title} onChange={(e) => setQuizEditForm({ ...quizEditForm, title: e.target.value })} required />{fieldError(quizEditErrors.title)}</div><div className="md:col-span-2"><textarea className={`${input}`} rows={5} placeholder="Instructions" value={quizEditForm.description} onChange={(e) => setQuizEditForm({ ...quizEditForm, description: e.target.value, instructions: e.target.value })} required />{fieldError(quizEditErrors.description)}</div><div><select className={input} value={quizEditForm.moduleName} onChange={(e) => setQuizEditForm({ ...quizEditForm, moduleName: e.target.value })} required disabled={loadingModules || visibleModules.length === 0 || !!activeModule}><option value="">{loadingModules ? "Loading modules..." : visibleModules.length === 0 ? "No modules available" : "Select module"}</option>{visibleModules.map((moduleItem) => <option key={moduleItem._id} value={moduleItem.name}>{moduleItem.moduleCode} - {moduleItem.name} - Year {moduleItem.year} Semester {moduleItem.semester}</option>)}</select>{fieldError(quizEditErrors.moduleName)}</div><div><input className={input} type="number" min="0" placeholder="Total Marks" value={quizEditForm.totalMarks} onChange={(e) => setQuizEditForm({ ...quizEditForm, totalMarks: e.target.value })} required />{fieldError(quizEditErrors.totalMarks)}</div><div><input className={input} type="datetime-local" value={quizEditForm.deadline} onChange={(e) => setQuizEditForm({ ...quizEditForm, deadline: e.target.value })} required />{fieldError(quizEditErrors.deadline)}</div></div>
                {renderQuestions(quizEditForm, "edit", savingQuizEdit, quizEditErrors.questions)}
                <div className="flex flex-wrap gap-3"><button type="submit" disabled={savingQuizEdit} className="rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-70">{savingQuizEdit ? "Saving..." : "Save Changes"}</button><button type="button" onClick={() => { setEditingQuiz(false); setQuizEditErrors({}); setQuizEditForm(toQuizForm(selectedQuiz)); }} className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200">Cancel</button></div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {attemptOverview ? (
        <div className={overlay}>
          <div className="mx-auto w-full max-w-6xl rounded-[30px] border border-blue-100 bg-white p-6 shadow-[0_30px_90px_rgba(37,99,235,0.12)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-blue-700">Quiz Review</div>
                <h2 className="mt-3 text-2xl font-semibold text-slate-900">{attemptOverview.quiz.title}</h2>
                <p className="mt-2 text-sm text-slate-600">Automatic scoring is shown here, and tutors can review descriptive answers manually.</p>
              </div>
              <button type="button" onClick={() => setAttemptOverview(null)} className="rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-blue-50">Close</button>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <StatCard label="Students" value={String(attemptOverview.summary.totalStudents).padStart(2, "0")} note="Students registered to this module." />
              <StatCard label="Submitted" value={String(attemptOverview.summary.submittedCount).padStart(2, "0")} note="Students who submitted quiz attempts." />
              <StatCard label="Missing" value={String(attemptOverview.summary.notSubmittedCount).padStart(2, "0")} note="Students with no submitted attempt." />
              <StatCard label="Late" value={String(attemptOverview.summary.lateCount).padStart(2, "0")} note="Quiz attempts submitted after the deadline." />
            </div>
            <div className="mt-6 space-y-3">
              {attemptOverview.attempts.map((row) => (
                <div key={row.student._id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_10px_30px_rgba(37,99,235,0.08)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-lg font-semibold text-slate-900">{row.student.fullName}</div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "NOT_SUBMITTED" ? "bg-slate-100 text-slate-600" : row.status === "LATE" ? "bg-red-100 text-red-700" : row.status === "REVIEWED" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{row.status === "NOT_SUBMITTED" ? "Not Submitted" : row.status === "AUTO_GRADED" ? "Auto Graded" : row.status}</span>
                      </div>
                      <div className="text-sm text-slate-600">{row.student.email}</div>
                      <div className="text-xs text-slate-500">User ID: {row.student.userId}</div>
                    </div>
                    <div className="space-y-1 text-sm text-slate-600 md:text-right">
                      <div>Submission Time: {row.submittedAt ? dt(row.submittedAt) : "Not submitted"}</div>
                      <div>Score: {row.score ?? 0} / {attemptOverview.quiz.totalMarks}</div>
                      <div>Review Status: {row.reviewStatus}</div>
                    </div>
                  </div>
                  {row.submitted ? <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => startQuizReview(row)} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">{row.reviewStatus === "REVIEWED" ? "Update Review" : "Review Attempt"}</button></div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {selectedAttempt && attemptOverview ? (
        <div className={overlay}>
          <div className="mx-auto w-full max-w-5xl rounded-[30px] border border-white/10 bg-[linear-gradient(155deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200/75">Review Quiz Attempt</div>
                <h2 className="mt-3 text-2xl font-semibold text-white">{selectedAttempt.student.fullName}</h2>
                <p className="mt-2 text-sm text-slate-300">Objective questions are auto-marked. Short and descriptive answers can be adjusted here.</p>
              </div>
              <button type="button" onClick={() => setSelectedAttempt(null)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100">Close</button>
            </div>
            <div className="mt-6 space-y-4">
              {attemptOverview.quiz.questions.map((question, index) => {
                const answer = selectedAttempt.answers.find((item) => item.questionId === question._id);
                const reviewAnswer = quizReviewForm.answers.find((item) => item.questionId === question._id);
                const isManual = question.questionType === "SHORT_ANSWER" || question.questionType === "FILL_IN_THE_BLANKS";
                return (
                  <div key={question._id || `review-question-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/5 px-2.5 py-1">Question {index + 1}</span>
                      <span className="rounded-full bg-white/5 px-2.5 py-1">{question.questionType}</span>
                      <span className="rounded-full bg-white/5 px-2.5 py-1">{question.marks} marks</span>
                    </div>
                    <div className="mt-3 text-base font-semibold text-white">{question.questionText}</div>
                    <div className="mt-3 text-sm text-slate-300">Student Answer: <span className="text-slate-100">{answer?.answer || "No answer"}</span></div>
                    <div className="mt-2 text-sm text-slate-300">Correct Answer: <span className="text-slate-100">{question.correctAnswer}</span></div>
                    {isManual ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <input className={input} type="number" min="0" max={question.marks} placeholder="Marks Awarded" value={reviewAnswer?.marksAwarded || "0"} onChange={(e) => setQuizReviewForm((current) => ({ ...current, answers: current.answers.map((item) => item.questionId === question._id ? { ...item, marksAwarded: e.target.value } : item) }))} />
                        <input className={input} placeholder="Review Comment" value={reviewAnswer?.reviewComment || ""} onChange={(e) => setQuizReviewForm((current) => ({ ...current, answers: current.answers.map((item) => item.questionId === question._id ? { ...item, reviewComment: e.target.value } : item) }))} />
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">Automatically marked: {answer?.marksAwarded ?? 0} / {question.marks}</div>
                    )}
                  </div>
                );
              })}
              <textarea className={input} rows={4} placeholder="Overall feedback" value={quizReviewForm.overallFeedback} onChange={(e) => setQuizReviewForm((current) => ({ ...current, overallFeedback: e.target.value }))} />
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => void saveQuizReview()} disabled={savingQuizReview} className="rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 px-6 py-3 text-sm font-semibold text-slate-950 disabled:opacity-70">{savingQuizReview ? "Saving..." : "Save Review"}</button>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">Total Reviewed Marks: {quizReviewForm.answers.reduce((sum, item) => sum + (Number(item.marksAwarded) || 0), 0)} / {attemptOverview.quiz.totalMarks}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
