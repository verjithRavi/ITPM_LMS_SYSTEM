"use client";

export default function StudentAssignmentsPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.22),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.16),_transparent_22%),linear-gradient(180deg,#26184e_0%,#221744_46%,#1b1235_100%)]">
      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="text-xs font-medium uppercase tracking-[0.24em] text-violet-200/80">Learning Tasks</div>
            <h1 className="mt-3 text-3xl font-semibold text-white">Assignments & Quizzes</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              This section is ready for student assignment and quiz features. We can connect submissions, deadlines,
              marks, and quiz attempts here next.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(123,92,255,0.18),rgba(35,23,77,0.76))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="text-sm font-semibold uppercase tracking-wide text-violet-100">Assignments</div>
              <p className="mt-3 text-sm text-slate-300">
                Upcoming assignments, due dates, submission status, and feedback can appear here.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="text-sm font-semibold uppercase tracking-wide text-fuchsia-100">Quizzes</div>
              <p className="mt-3 text-sm text-slate-300">
                Quiz schedules, attempts, scores, and review details can appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
