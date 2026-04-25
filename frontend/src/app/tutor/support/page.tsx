"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Role = "STUDENT" | "TUTOR" | "ADMIN";
type User = { _id: string; userId: string; role: Role; passwordResetRequested?: boolean; passwordResetResolvedAt?: string | null };
type TargetType =
  | "STUDENTS_ALL"
  | "STUDENTS_FACULTY"
  | "STUDENTS_FACULTY_YEAR"
  | "STUDENTS_FACULTY_YEAR_SEMESTER"
  | "FACULTY"
  | "YEAR_SEM"
  | "FACULTY_YEAR_SEM";
type EventItem = { _id: string; title: string; description: string; startsAt: string; location: string; targetType: string };
type Step =
  | "start" | "help" | "events" | "pickDate" | "password" | "passwordConfirm" | "passwordPending" | "passwordApproved"
  | "createTitle" | "createDescription" | "createLocation" | "createDateTime" | "createTarget" | "createExtra" | "createConfirm" | "createDone";

const FACULTIES = ["Faculty of Computing", "Faculty of Engineering", "Faculty of Business", "Faculty of Humanities & Sciences", "Faculty of Law"];
const TARGETS: Array<{ v: TargetType; l: string }> = [
  { v: "STUDENTS_ALL", l: "All Students" },
  { v: "STUDENTS_FACULTY", l: "Selected Faculty Students" },
  { v: "STUDENTS_FACULTY_YEAR", l: "Selected Faculty + Year Students" },
  { v: "STUDENTS_FACULTY_YEAR_SEMESTER", l: "Selected Faculty + Year + Semester Students" },
  { v: "FACULTY", l: "Faculty Students" },
  { v: "YEAR_SEM", l: "All Faculty + Year + Semester Students" },
  { v: "FACULTY_YEAR_SEM", l: "Faculty + Year + Semester Students" },
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function needFaculty(t: TargetType) { return ["STUDENTS_FACULTY", "STUDENTS_FACULTY_YEAR", "STUDENTS_FACULTY_YEAR_SEMESTER", "FACULTY", "FACULTY_YEAR_SEM"].includes(t); }
function needYear(t: TargetType) { return ["STUDENTS_FACULTY_YEAR", "STUDENTS_FACULTY_YEAR_SEMESTER", "YEAR_SEM", "FACULTY_YEAR_SEM"].includes(t); }
function needSem(t: TargetType) { return ["STUDENTS_FACULTY_YEAR_SEMESTER", "YEAR_SEM", "FACULTY_YEAR_SEM"].includes(t); }
function helpMenuText() { return "Welcome to tutor support.\nSelect a service:\n1. Event related\n2. Password related\n0. Exit"; }
function eventMenuText() { return "Event services:\n1. All event list\n2. Specific date event list\n3. Today's event\n4. Create event\n9. Back\n0. Exit"; }
function passwordMenuText() { return "Password support:\n1. Forgot password\n9. Back\n0. Exit"; }
function passwordConfirmText() { return "Do you want to send a reset request to admin?\n1. Yes\n9. Back\n0. Exit"; }
function targetMenuText() {
  return `Select target:\n${TARGETS.map((item, index) => `${index + 1}. ${item.l}`).join("\n")}\n9. Back\n0. Exit`;
}

function parseMessage(message: string) {
  if (message.startsWith("You:")) {
    return { sender: "user" as const, text: message.replace(/^You:\s*/, "") };
  }
  if (message.startsWith("Bot:")) {
    return { sender: "bot" as const, text: message.replace(/^Bot:\s*/, "") };
  }
  return { sender: "bot" as const, text: message };
}

function renderMessageLines(text: string) {
  return text.split("\n").map((line, index) => (
    <span key={`${line}-${index}`} className="block">
      {line || "\u00A0"}
    </span>
  ));
}

export default function TutorSupportPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [step, setStep] = useState<Step>("start");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [watchStatus, setWatchStatus] = useState(false);
  const [text, setText] = useState("");
  const [y, setY] = useState(new Date().getFullYear());
  const [m, setM] = useState(new Date().getMonth() + 1);
  const [d, setD] = useState(new Date().getDate());
  const [hh, setHh] = useState(new Date().getHours());
  const [mm, setMm] = useState(0);
  const [target, setTarget] = useState<TargetType>("STUDENTS_ALL");
  const [faculty, setFaculty] = useState(FACULTIES[0]);
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [draft, setDraft] = useState({ title: "", description: "", location: "" });
  const endRef = useRef<HTMLDivElement | null>(null);

  const say = (x: string) => setMessages((p) => [...p, x]);
  const sayUser = (x: string) => say(`You: ${x}`);
  const sayBot = (x: string) => say(`Bot: ${x}`);

  async function load(silent = false) {
    if (!token) return router.push("/login");
    if (!silent) { setLoading(true); setError(null); }
    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role !== "TUTOR") return router.push(me.user.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard");
      setUser(me.user);

      if (!silent) {
        const ev = await apiFetch<{ events: EventItem[] }>("/api/events", {}, token);
        setEvents(ev.events);
      }

      if (watchStatus && me.user.passwordResetRequested) setStep("passwordPending");
      if (watchStatus && !me.user.passwordResetRequested && me.user.passwordResetResolvedAt) {
        setStep("passwordApproved");
        sayBot(`Password reset approved. Use User ID (${me.user.userId}) as temporary password, then change it.`);
        sayBot("Type 0 to end chat or 9 to return to the main menu.");
      }
    } catch (e: unknown) {
      if (!silent) setError(e instanceof Error ? e.message : "Failed to load support.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!watchStatus) return;
    const id = setInterval(() => { void load(true); }, 10000);
    return () => clearInterval(id);
  }, [watchStatus]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function startChat() {
    setMessages([`Bot: ${helpMenuText()}`]);
    setStep("help");
    setWatchStatus(false);
    setText("");
  }

  function showAllEvents() {
    const list = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    sayBot(`Found ${list.length} events.`);
    list.forEach((e) => sayBot(`- ${e.title} | ${new Date(e.startsAt).toLocaleString()} | ${e.location}`));
    sayBot(eventMenuText());
  }

  function showTodayEvents() {
    const t = new Date();
    const list = events.filter((e) => sameDay(new Date(e.startsAt), t));
    sayBot(`Found ${list.length} event(s) today.`);
    list.forEach((e) => sayBot(`- ${e.title} | ${new Date(e.startsAt).toLocaleString()} | ${e.location}`));
    sayBot(eventMenuText());
  }

  function showSpecificDateEvents(dateValue: string) {
    const parts = dateValue.trim().split("-");
    if (parts.length !== 3) {
      sayBot("Enter the date in YYYY-MM-DD format.");
      return;
    }
    const nextYear = Number(parts[0]);
    const nextMonth = Number(parts[1]);
    const nextDay = Number(parts[2]);
    if (!nextYear || !nextMonth || !nextDay) {
      sayBot("Enter a valid date in YYYY-MM-DD format.");
      return;
    }
    setY(nextYear);
    setM(nextMonth);
    setD(nextDay);
    const dt = new Date(nextYear, nextMonth - 1, nextDay);
    const list = events.filter((e) => sameDay(new Date(e.startsAt), dt));
    sayBot(`Found ${list.length} event(s) on selected date.`);
    list.forEach((e) => sayBot(`- ${e.title} | ${new Date(e.startsAt).toLocaleString()} | ${e.location}`));
    sayBot(eventMenuText());
    setStep("events");
  }

  async function sendPasswordRequest() {
    if (!token || !user) return;
    const res = await apiFetch<{ message: string; code?: string; status?: string }>(
      "/api/auth/forgot-password-request",
      { method: "POST", body: JSON.stringify({ identifier: user.userId }) },
      token
    );
    sayBot(res.message);
    if (res.status === "APPROVED" || res.code === "PASSWORD_RESET_APPROVED") {
      setStep("passwordApproved");
      sayBot("Type 0 to end chat or 9 to return to the main menu.");
    } else if (res.status === "PENDING") {
      sayBot("Your password reset request is pending. I will inform after approval.");
      setWatchStatus(true);
      setStep("passwordPending");
      sayBot("Type 0 to end chat or 9 to return to the main menu.");
    } else {
      setStep("passwordPending");
      sayBot("Type 0 to end chat or 9 to return to the main menu.");
    }
  }

  async function confirmCreate() {
    if (!token) return;
    const startsAt = new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
    const payload: { title: string; description: string; location: string; startsAt: string; targetType: TargetType; targetFaculty?: string; targetYear?: number; targetSemester?: number } = {
      title: draft.title, description: draft.description, location: draft.location, startsAt, targetType: target,
    };
    if (needFaculty(target)) payload.targetFaculty = faculty;
    if (needYear(target)) payload.targetYear = year;
    if (needSem(target)) payload.targetSemester = semester;
    const out = await apiFetch<{ event: EventItem }>("/api/events", { method: "POST", body: JSON.stringify(payload) }, token);
    sayBot(`Event created successfully - ${out.event.title}`);
    sayBot("Type 9 to return to the event menu or 0 to exit.");
    setStep("createDone");
  }

  function resetToMainMenu() {
    setWatchStatus(false);
    setStep("help");
    sayBot(helpMenuText());
  }

  function handleBack() {
    if (step === "help") {
      setStep("start");
      setMessages([]);
      return;
    }

    if (step === "events") {
      resetToMainMenu();
      return;
    }

    if (step === "pickDate") {
      setStep("events");
      sayBot(eventMenuText());
      return;
    }

    if (step === "password") {
      resetToMainMenu();
      return;
    }

    if (step === "passwordConfirm" || step === "passwordPending" || step === "passwordApproved") {
      setWatchStatus(false);
      setStep("password");
      sayBot(passwordMenuText());
      return;
    }

    if (step === "createTitle" || step === "createDone") {
      setStep("events");
      sayBot(eventMenuText());
      return;
    }

    if (step === "createDescription") {
      setStep("createTitle");
      sayBot("Enter the event title.\n9. Back\n0. Exit");
      return;
    }

    if (step === "createLocation") {
      setStep("createDescription");
      sayBot("Enter the description.\n9. Back\n0. Exit");
      return;
    }

    if (step === "createDateTime") {
      setStep("createLocation");
      sayBot("Enter the location.\n9. Back\n0. Exit");
      return;
    }

    if (step === "createTarget") {
      setStep("createDateTime");
      sayBot("Enter date and time in YYYY-MM-DD HH:mm format.\n9. Back\n0. Exit");
      return;
    }

    if (step === "createExtra") {
      setStep("createTarget");
      sayBot(targetMenuText());
      return;
    }

    if (step === "createConfirm") {
      if (needFaculty(target) || needYear(target) || needSem(target)) {
        setStep("createExtra");
        if (needFaculty(target) && needYear(target) && needSem(target)) {
          sayBot(`Enter faculty number, year, and semester like 1,2,1.\n${FACULTIES.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n9. Back\n0. Exit`);
          return;
        }
        if (needFaculty(target) && needYear(target)) {
          sayBot(`Enter faculty number and year like 1,2.\n${FACULTIES.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n9. Back\n0. Exit`);
          return;
        }
        if (needFaculty(target)) {
          sayBot(`Enter faculty number.\n${FACULTIES.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n9. Back\n0. Exit`);
          return;
        }
        sayBot("Enter year and semester like 2,1.\n9. Back\n0. Exit");
        return;
      }

      setStep("createTarget");
      sayBot(targetMenuText());
      return;
    }
  }

  async function submitChat() {
    const value = text.trim();
    if (!value) return;

    sayUser(value);
    setText("");

    if (value === "0") {
      setWatchStatus(false);
      setStep("start");
      setMessages([]);
      return;
    }

    if (step === "start") {
      if (value.toLowerCase() === "start") {
        startChat();
        return;
      }
      sayBot("Type start to begin the chat.");
      return;
    }

    if (value === "9") {
      handleBack();
      return;
    }

    if (step === "help") {
      if (value === "1") {
        setStep("events");
        sayBot(eventMenuText());
        return;
      }
      if (value === "2") {
        setStep("password");
        sayBot(passwordMenuText());
        return;
      }
      sayBot("Enter 1 for event support or 2 for password support.");
      return;
    }

    if (step === "events") {
      if (value === "1") {
        showAllEvents();
        return;
      }
      if (value === "2") {
        setStep("pickDate");
        sayBot("Enter a date in YYYY-MM-DD format.\n9. Back\n0. Exit");
        return;
      }
      if (value === "3") {
        showTodayEvents();
        return;
      }
      if (value === "4") {
        setDraft({ title: "", description: "", location: "" });
        setTarget("STUDENTS_ALL");
        setFaculty(FACULTIES[0]);
        setYear(1);
        setSemester(1);
        setStep("createTitle");
        sayBot("Enter the event title.\n9. Back\n0. Exit");
        return;
      }
      sayBot("Choose a valid event option number.");
      return;
    }

    if (step === "pickDate") {
      showSpecificDateEvents(value);
      return;
    }

    if (step === "password") {
      if (value === "1") {
        setStep("passwordConfirm");
        sayBot(passwordConfirmText());
        return;
      }
      sayBot("Choose 1 to request password help, 9 to go back, or 0 to exit.");
      return;
    }

    if (step === "passwordConfirm") {
      if (value === "1") {
        await sendPasswordRequest();
        return;
      }
      sayBot("Choose 1 to send the request, 9 to go back, or 0 to exit.");
      return;
    }

    if (step === "passwordPending" || step === "passwordApproved") {
      sayBot("Type 9 to return to the main menu or 0 to end chat.");
      return;
    }

    if (step === "createTitle") {
      setDraft((p) => ({ ...p, title: value }));
      setStep("createDescription");
      sayBot("Enter the description.\n9. Back\n0. Exit");
      return;
    }

    if (step === "createDescription") {
      setDraft((p) => ({ ...p, description: value }));
      setStep("createLocation");
      sayBot("Enter the location.\n9. Back\n0. Exit");
      return;
    }

    if (step === "createLocation") {
      setDraft((p) => ({ ...p, location: value }));
      setStep("createDateTime");
      sayBot("Enter date and time in YYYY-MM-DD HH:mm format.\n9. Back\n0. Exit");
      return;
    }

    if (step === "createDateTime") {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
      if (!match) {
        sayBot("Enter date and time in YYYY-MM-DD HH:mm format.");
        return;
      }
      setY(Number(match[1]));
      setM(Number(match[2]));
      setD(Number(match[3]));
      setHh(Number(match[4]));
      setMm(Number(match[5]));
      setStep("createTarget");
      sayBot(targetMenuText());
      return;
    }

    if (step === "createTarget") {
      const targetIndex = Number(value) - 1;
      if (!TARGETS[targetIndex]) {
        sayBot("Choose a valid target number.");
        return;
      }
      const nextTarget = TARGETS[targetIndex].v;
      setTarget(nextTarget);
      if (needFaculty(nextTarget) || needYear(nextTarget) || needSem(nextTarget)) {
        setStep("createExtra");
        if (needFaculty(nextTarget) && needYear(nextTarget) && needSem(nextTarget)) {
          sayBot(`Enter faculty number, year, and semester like 1,2,1.\n${FACULTIES.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n9. Back\n0. Exit`);
          return;
        }
        if (needFaculty(nextTarget) && needYear(nextTarget)) {
          sayBot(`Enter faculty number and year like 1,2.\n${FACULTIES.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n9. Back\n0. Exit`);
          return;
        }
        if (needFaculty(nextTarget)) {
          sayBot(`Enter faculty number.\n${FACULTIES.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n9. Back\n0. Exit`);
          return;
        }
        if (needYear(nextTarget) && needSem(nextTarget)) {
          sayBot("Enter year and semester like 2,1.\n9. Back\n0. Exit");
          return;
        }
      }
      setStep("createConfirm");
      sayBot(`Review event details:\nTitle: ${draft.title}\nDescription: ${draft.description}\nLocation: ${draft.location}\nDate & Time: ${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}\nTarget: ${TARGETS[targetIndex].l}\n1. Confirm\n9. Back\n0. Exit`);
      return;
    }

    if (step === "createExtra") {
      const parts = value.split(",").map((item) => item.trim());
      if (needFaculty(target) && needYear(target) && needSem(target)) {
        const facultyIndex = Number(parts[0]) - 1;
        const nextYear = Number(parts[1]);
        const nextSemester = Number(parts[2]);
        if (!FACULTIES[facultyIndex] || !nextYear || !nextSemester) {
          sayBot("Enter values like 1,2,1.");
          return;
        }
        setFaculty(FACULTIES[facultyIndex]);
        setYear(nextYear);
        setSemester(nextSemester);
      } else if (needFaculty(target) && needYear(target)) {
        const facultyIndex = Number(parts[0]) - 1;
        const nextYear = Number(parts[1]);
        if (!FACULTIES[facultyIndex] || !nextYear) {
          sayBot("Enter values like 1,2.");
          return;
        }
        setFaculty(FACULTIES[facultyIndex]);
        setYear(nextYear);
      } else if (needFaculty(target)) {
        const facultyIndex = Number(parts[0]) - 1;
        if (!FACULTIES[facultyIndex]) {
          sayBot("Enter a valid faculty number.");
          return;
        }
        setFaculty(FACULTIES[facultyIndex]);
      } else if (needYear(target) && needSem(target)) {
        const nextYear = Number(parts[0]);
        const nextSemester = Number(parts[1]);
        if (!nextYear || !nextSemester) {
          sayBot("Enter values like 2,1.");
          return;
        }
        setYear(nextYear);
        setSemester(nextSemester);
      }
      setStep("createConfirm");
      sayBot(`Review event details:\nTitle: ${draft.title}\nDescription: ${draft.description}\nLocation: ${draft.location}\nDate & Time: ${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}\nTarget: ${TARGETS.find((item) => item.v === target)?.l}\n1. Confirm\n9. Back\n0. Exit`);
      return;
    }

    if (step === "createConfirm") {
      if (value === "1") {
        await confirmCreate();
        return;
      }
      sayBot("Enter 1 to confirm, 9 to go back, or 0 to exit.");
      return;
    }

    if (step === "createDone") {
      sayBot("Type 9 to return to the event menu or 0 to exit.");
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_20px_60px_rgba(37,99,235,0.1)]">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-sky-600">Tutor Support</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Interactive help and event assistant</h1>
          <p className="mt-1 text-sm text-slate-600">Tutor chatbot support for events and password help.</p>
        </div>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Loading support...</div>
        ) : (
          <div className="rounded-[26px] border border-sky-100 bg-white p-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
            <div className="h-[430px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-500">Type start to begin support chat.</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((x, i) => {
                    const msg = parseMessage(x);
                    const isUser = msg.sender === "user";
                    return (
                      <div key={`${x}-${i}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm ${
                            isUser
                              ? "rounded-br-md bg-blue-600 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <div>{renderMessageLines(msg.text)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitChat();
                    }
                  }}
                  placeholder={step === "start" ? "Type start to begin" : "Type a number or message"}
                />
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700" onClick={() => void submitChat()} type="button">
                  Send
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">{step === "start" ? "Type `start` to begin a new chat." : "Use `9` for back and `0` for exit."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
