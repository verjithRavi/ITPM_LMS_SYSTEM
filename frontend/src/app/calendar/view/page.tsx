"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/TopBar";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

type User = {
  _id: string;
  fullName: string;
  role: "STUDENT" | "TUTOR" | "ADMIN";
};

type EventTargetType =
  | "EVERYONE"
  | "STUDENTS_ALL"
  | "STUDENTS_FACULTY"
  | "STUDENTS_FACULTY_YEAR"
  | "STUDENTS_FACULTY_YEAR_SEMESTER"
  | "TUTORS_ALL"
  | "TUTORS_FACULTY"
  | "FACULTY"
  | "YEAR_SEM"
  | "FACULTY_YEAR_SEM";

type EventItem = {
  _id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  targetType: EventTargetType;
  targetFaculty?: string | null;
  targetYear?: number | null;
  targetSemester?: number | null;
};

function formatAudience(eventItem: EventItem) {
  if (eventItem.targetType === "EVERYONE") return "Everyone";
  if (eventItem.targetType === "STUDENTS_ALL") return "All Students";
  if (eventItem.targetType === "STUDENTS_FACULTY") return `Students - ${eventItem.targetFaculty || "Faculty"}`;
  if (eventItem.targetType === "STUDENTS_FACULTY_YEAR") {
    return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"}`;
  }
  if (eventItem.targetType === "STUDENTS_FACULTY_YEAR_SEMESTER") {
    return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  }
  if (eventItem.targetType === "TUTORS_ALL") return "All Tutors";
  if (eventItem.targetType === "TUTORS_FACULTY") return `Tutors - ${eventItem.targetFaculty || "Faculty"}`;
  if (eventItem.targetType === "FACULTY") return `Students - ${eventItem.targetFaculty || "Faculty"}`;
  if (eventItem.targetType === "YEAR_SEM") {
    return `Students - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  }
  if (eventItem.targetType === "FACULTY_YEAR_SEM") {
    return `Students - ${eventItem.targetFaculty || "Faculty"} - Year ${eventItem.targetYear || "-"} - Semester ${eventItem.targetSemester || "-"}`;
  }
  return eventItem.targetType;
}

function isTodayEvent(startsAt: string) {
  const d = new Date(startsAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthLabel(date: Date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

function buildCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const startDate = new Date(year, month, 1 - startWeekday);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });
}

export default function StudentEventsCalendarPage() {
  const router = useRouter();
  const token = useMemo(() => getToken(), []);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDayAgenda, setShowDayAgenda] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [focusEventId, setFocusEventId] = useState<string | null>(null);

  const userSignatureRef = useRef("");
  const eventsSignatureRef = useRef("");

  async function load(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false;
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
      if (me.user.role === "ADMIN") {
        router.push("/admin/events/calendar");
        return;
      }
      if (me.user.role === "TUTOR") {
        router.push("/tutor/events/calendar");
        return;
      }
      const nextUserSignature = JSON.stringify([me.user._id, me.user.fullName, me.user.role]);
      if (nextUserSignature !== userSignatureRef.current) {
        userSignatureRef.current = nextUserSignature;
      }

      const data = await apiFetch<{ events: EventItem[] }>("/api/events", {}, token);
      const nextEventsSignature = JSON.stringify(
        data.events.map((eventItem) => [
          eventItem._id,
          eventItem.title,
          eventItem.startsAt,
          eventItem.location,
          eventItem.targetType,
        ])
      );

      if (nextEventsSignature !== eventsSignatureRef.current) {
        eventsSignatureRef.current = nextEventsSignature;
        setEvents(data.events);
      }
    } catch (err: unknown) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to load events calendar.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => {
      void load({ silent: true });
    }, 10000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredEvents = useMemo(() => {
    const cutoff = new Date();
    if (showPastEvents) {
      return events.filter((eventItem) => new Date(eventItem.startsAt) < cutoff);
    }
    return events.filter((eventItem) => new Date(eventItem.startsAt) >= cutoff);
  }, [events, showPastEvents]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const eventItem of filteredEvents) {
      const key = dateKey(new Date(eventItem.startsAt));
      const list = map.get(key) ?? [];
      list.push(eventItem);
      map.set(key, list);
    }
    return map;
  }, [filteredEvents]);

  const selectedDateEvents = useMemo(() => {
    const key = dateKey(selectedDate);
    const list = eventsByDate.get(key) ?? [];
    return list.slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [eventsByDate, selectedDate]);

  const calendarDays = buildCalendarDays(currentMonth);
  const today = new Date();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setFocusEventId(params.get("eventId"));
  }, []);

  useEffect(() => {
    if (!focusEventId || events.length === 0) return;
    const targetEvent = events.find((eventItem) => eventItem._id === focusEventId);
    if (!targetEvent) return;

    const eventDate = new Date(targetEvent.startsAt);
    setSelectedDate(eventDate);
    setCurrentMonth(new Date(eventDate.getFullYear(), eventDate.getMonth(), 1));
    setShowDayAgenda(true);
    setSelectedEvent(targetEvent);
  }, [focusEventId, events]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.22),_transparent_20%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.16),_transparent_22%),linear-gradient(180deg,#26184e_0%,#221744_46%,#1b1235_100%)]">
      <TopBar />

      <div className="px-4 py-6">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-white">Events Calendar</h1>
                <p className="mt-1 text-sm text-slate-300">Click a date to view all events for that date.</p>
              </div>
              <button
                className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-100 hover:bg-white/12"
                onClick={() => router.push("/student/events")}
                type="button"
              >
                Back to Events
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(123,92,255,0.18),rgba(35,23,77,0.76))] shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className={`flex w-[200%] transition-transform duration-300 ease-out ${showDayAgenda ? "-translate-x-1/2" : "translate-x-0"}`}>
              <div className="w-1/2 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <button
                    className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/12"
                    onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    type="button"
                  >
                    &lt;
                  </button>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-white">{monthLabel(currentMonth)}</div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <select
                        className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-[11px] text-slate-100"
                        value={currentMonth.getMonth()}
                        onChange={(e) => setCurrentMonth(new Date(currentMonth.getFullYear(), Number(e.target.value), 1))}
                      >
                        {MONTH_OPTIONS.map((monthName, index) => (
                          <option key={monthName} value={index}>
                            {monthName}
                          </option>
                        ))}
                      </select>
                      <select
                        className="rounded-md border border-white/10 bg-white/8 px-2 py-1 text-[11px] text-slate-100"
                        value={currentMonth.getFullYear()}
                        onChange={(e) => setCurrentMonth(new Date(Number(e.target.value), currentMonth.getMonth(), 1))}
                      >
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-white/12"
                    onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    type="button"
                  >
                    &gt;
                  </button>
                </div>

                <div className="mb-3 flex justify-end">
                  <button
                    className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-white/12"
                    onClick={() => setShowPastEvents((prev) => !prev)}
                    type="button"
                  >
                    {showPastEvents ? "View Upcoming Events" : "View Past Events"}
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-y-2">
                  {WEEK_DAYS.map((day) => (
                    <div key={day} className="text-center text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {day[0]}
                    </div>
                  ))}

                  {calendarDays.map((day) => {
                    const inCurrentMonth = day.getMonth() === currentMonth.getMonth();
                    const isToday = sameDate(day, today);
                    const isSelected = sameDate(day, selectedDate);
                    const key = dateKey(day);
                    const count = (eventsByDate.get(key) || []).length;
                    const hasEvents = count > 0;

                    return (
                      <button
                        key={key}
                        className={`group mx-0.5 flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border py-1.5 transition ${
                          isSelected
                            ? "border-violet-300/35 bg-[linear-gradient(145deg,rgba(168,85,247,0.18),rgba(35,23,77,0.82))]"
                            : hasEvents
                              ? "border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))]"
                              : "border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/6"
                        } ${inCurrentMonth ? "" : "opacity-50"}`}
                        onClick={() => {
                          setSelectedDate(day);
                          setShowDayAgenda(true);
                        }}
                        type="button"
                      >
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
                            isSelected
                              ? "bg-gradient-to-r from-violet-400 to-fuchsia-400 font-semibold text-white"
                              : isToday
                                ? "bg-red-500/12 font-semibold text-red-200"
                                : inCurrentMonth
                                  ? "text-slate-100 group-hover:bg-white/8"
                                  : "text-slate-300"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        <span className="h-3 text-[9px] text-slate-400">{hasEvents ? `${count} event${count > 1 ? "s" : ""}` : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="w-1/2 border-l border-white/10 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-white/12"
                    onClick={() => setShowDayAgenda(false)}
                    type="button"
                  >
                    &lt; Month
                  </button>
                  <div className="rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-violet-100">
                    {selectedDateEvents.length} Event{selectedDateEvents.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">{showPastEvents ? "Past Events" : "Upcoming Events"}</div>
                  <div className="text-base font-semibold text-white">{selectedDate.toLocaleDateString()}</div>
                </div>

                {loading ? (
                  <div className="text-sm text-slate-300">Loading events...</div>
                ) : selectedDateEvents.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm text-slate-300">No events on this date.</div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDateEvents.map((eventItem) => (
                      <div
                        key={eventItem._id}
                        className={`rounded-2xl border p-3 ${
                          isTodayEvent(eventItem.startsAt)
                            ? "border-violet-300/30 bg-[linear-gradient(145deg,rgba(168,85,247,0.18),rgba(35,23,77,0.82))]"
                            : "border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
                        }`}
                      >
                        <div className="font-semibold text-white">{eventItem.title}</div>
                        <div className="mt-1 text-xs text-slate-300">
                          {new Date(eventItem.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | {eventItem.location}
                        </div>
                        <div className="mt-2">
                          <button
                            className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-slate-100 hover:bg-white/12"
                            onClick={() => setSelectedEvent(eventItem)}
                            type="button"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(43,27,90,0.98),rgba(24,18,57,0.98))] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedEvent.title}</h2>
                <p className="mt-1 text-sm text-slate-300">Event Details</p>
              </div>
              <button
                className="rounded-lg border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/12"
                onClick={() => setSelectedEvent(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/8 p-3">
                <div className="text-xs text-violet-200">Date & Time</div>
                <div className="text-sm font-medium text-white">{new Date(selectedEvent.startsAt).toLocaleString()}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-3">
                <div className="text-xs text-violet-200">Location</div>
                <div className="text-sm font-medium text-white">{selectedEvent.location}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-3 sm:col-span-2">
                <div className="text-xs text-violet-200">Audience</div>
                <div className="text-sm font-medium text-white">{formatAudience(selectedEvent)}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-3 sm:col-span-2">
                <div className="text-xs text-violet-200">Description</div>
                <div className="text-sm font-medium text-white">{selectedEvent.description || "No description."}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

