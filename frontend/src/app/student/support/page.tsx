"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type Role = "STUDENT" | "TUTOR" | "ADMIN";
type User = {
  _id: string;
  userId: string;
  role: Role;
  passwordResetRequested?: boolean;
  passwordResetResolvedAt?: string | null;
};

type EventItem = {
  _id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
};

type Step =
  | "start"
  | "help"
  | "events"
  | "pickDate"
  | "password"
  | "passwordConfirm"
  | "passwordPending"
  | "passwordApproved";

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function helpMenuText() {
  return "Welcome to student support.\nSelect a service:\n1. Event related\n2. Password related\n0. Exit";
}

function eventMenuText() {
  return "Event services:\n1. All event list\n2. Specific date event list\n3. Today's event\n9. Back\n0. Exit";
}

function passwordMenuText() {
  return "Password support:\n1. Forgot password\n9. Back\n0. Exit";
}

function passwordConfirmText() {
  return "Do you want to send a reset request to admin?\n1. Yes\n9. Back\n0. Exit";
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

export default function StudentSupportPage() {
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
  const endRef = useRef<HTMLDivElement | null>(null);

  const say = (value: string) => setMessages((current) => [...current, value]);
  const sayUser = (value: string) => say(`You: ${value}`);
  const sayBot = (value: string) => say(`Bot: ${value}`);

  async function load(silent = false) {
    if (!token) {
      router.push("/login");
      return;
    }

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const me = await apiFetch<{ user: User }>("/api/me", {}, token);
      if (me.user.role !== "STUDENT") {
        router.push(me.user.role === "ADMIN" ? "/admin/dashboard" : "/tutor/dashboard");
        return;
      }
      setUser(me.user);

      if (!silent) {
        const ev = await apiFetch<{ events: EventItem[] }>("/api/events", {}, token);
        setEvents(ev.events);
      }

      if (watchStatus && me.user.passwordResetRequested) {
        setStep("passwordPending");
      }

      if (watchStatus && !me.user.passwordResetRequested && me.user.passwordResetResolvedAt) {
        setStep("passwordApproved");
        sayBot(`Password reset approved. Use User ID (${me.user.userId}) as temporary password, then change it.`);
        sayBot("Type 0 to end chat or 9 to return to the main menu.");
        setWatchStatus(false);
      }
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load support.");
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!watchStatus) return;
    const id = setInterval(() => {
      void load(true);
    }, 10000);
    return () => clearInterval(id);
  }, [watchStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function startChat() {
    setMessages([`Bot: ${helpMenuText()}`]);
    setStep("help");
    setWatchStatus(false);
    setText("");
  }

  function showAllEvents() {
    const list = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    sayBot(`Found ${list.length} events.`);
    list.forEach((item) => sayBot(`- ${item.title} | ${new Date(item.startsAt).toLocaleString()} | ${item.location}`));
    sayBot(eventMenuText());
  }

  function showTodayEvents() {
    const today = new Date();
    const list = events.filter((item) => sameDay(new Date(item.startsAt), today));
    sayBot(`Found ${list.length} event(s) today.`);
    list.forEach((item) => sayBot(`- ${item.title} | ${new Date(item.startsAt).toLocaleString()} | ${item.location}`));
    sayBot(eventMenuText());
  }

  function showSpecificDateEvents(value: string) {
    const parts = value.trim().split("-");
    if (parts.length !== 3) {
      sayBot("Enter the date in YYYY-MM-DD format.");
      return;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!year || !month || !day) {
      sayBot("Enter a valid date in YYYY-MM-DD format.");
      return;
    }

    const targetDate = new Date(year, month - 1, day);
    const list = events.filter((item) => sameDay(new Date(item.startsAt), targetDate));
    sayBot(`Found ${list.length} event(s) on selected date.`);
    list.forEach((item) => sayBot(`- ${item.title} | ${new Date(item.startsAt).toLocaleString()} | ${item.location}`));
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
      return;
    }

    if (res.status === "PENDING") {
      sayBot("Your password reset request is pending. I will inform after approval.");
      setWatchStatus(true);
      setStep("passwordPending");
      sayBot("Type 0 to end chat or 9 to return to the main menu.");
      return;
    }

    setStep("passwordPending");
    sayBot("Type 0 to end chat or 9 to return to the main menu.");
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
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_20px_60px_rgba(37,99,235,0.1)]">
          <div className="text-xs font-medium uppercase tracking-[0.22em] text-sky-600">Student Support</div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Interactive help assistant</h1>
          <p className="mt-1 text-sm text-slate-600">Student chatbot support for events and password help.</p>
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
                  {messages.map((message, index) => {
                    const parsed = parseMessage(message);
                    const isUser = parsed.sender === "user";

                    return (
                      <div key={`${message}-${index}`} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-sm ${
                            isUser
                              ? "rounded-br-md bg-blue-600 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <div>{renderMessageLines(parsed.text)}</div>
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
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  onClick={() => void submitChat()}
                  type="button"
                >
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
