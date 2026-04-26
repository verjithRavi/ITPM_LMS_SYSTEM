"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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

type EventCreateErrors = Partial<Record<"title" | "description" | "location" | "startsAt" | "targetFaculty" | "targetYear" | "targetSemester", string>>;
const EVENT_TITLE_MAX_LENGTH = 50;
const EVENT_DESCRIPTION_MAX_LENGTH = 200;

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function sameDate(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function monthLabel(date: Date) {
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
}

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

const FACULTY_OPTIONS = [
  "Faculty of Computing",
  "Faculty of Engineering",
  "Faculty of Business",
  "Faculty of Humanities & Sciences",
  "Faculty of Law",
] as const;

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

function requiresFaculty(targetType: EventTargetType) {
  return (
    targetType === "STUDENTS_FACULTY" ||
    targetType === "STUDENTS_FACULTY_YEAR" ||
    targetType === "STUDENTS_FACULTY_YEAR_SEMESTER" ||
    targetType === "TUTORS_FACULTY" ||
    targetType === "FACULTY" ||
    targetType === "FACULTY_YEAR_SEM"
  );
}

function requiresYear(targetType: EventTargetType) {
  return (
    targetType === "STUDENTS_FACULTY_YEAR" ||
    targetType === "STUDENTS_FACULTY_YEAR_SEMESTER" ||
    targetType === "YEAR_SEM" ||
    targetType === "FACULTY_YEAR_SEM"
  );
}

function requiresSemester(targetType: EventTargetType) {
  return (
    targetType === "STUDENTS_FACULTY_YEAR_SEMESTER" ||
    targetType === "YEAR_SEM" ||
    targetType === "FACULTY_YEAR_SEM"
  );
}

function isTodayEvent(startsAt: string) {
  const d = new Date(startsAt);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function renderFieldError(message?: string) {
  return message ? <div className="mt-1 text-xs font-medium text-red-300">{message}</div> : null;
}

function validateEventTitle(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "This field is required.";
  return trimmedValue.length <= EVENT_TITLE_MAX_LENGTH ? "" : `Title must be ${EVENT_TITLE_MAX_LENGTH} characters or fewer.`;
}

function validateEventDescription(value: string) {
  return value.trim().length <= EVENT_DESCRIPTION_MAX_LENGTH ? "" : `Description must be ${EVENT_DESCRIPTION_MAX_LENGTH} characters or fewer.`;
}

export default function AdminEventsCalendarPage() {
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
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createErrors, setCreateErrors] = useState<EventCreateErrors>({});

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [targetType, setTargetType] = useState<EventTargetType>("EVERYONE");
  const [targetFaculty, setTargetFaculty] = useState("");
  const [targetYear, setTargetYear] = useState(1);
  const [targetSemester, setTargetSemester] = useState(1);

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
      if (me.user.role !== "ADMIN") {
        router.push("/login");
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
          eventItem.targetFaculty || "",
          eventItem.targetYear || "",
          eventItem.targetSemester || "",
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
      if (!silent) {
        setLoading(false);
      }
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "1") {
      setShowDayAgenda(true);
      openCreateEventModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function openEventDetails(eventItem: EventItem) {
    setSelectedEvent(eventItem);
    setFormError(null);
    setTitle(eventItem.title);
    setDescription(eventItem.description || "");
    const dateTime = new Date(eventItem.startsAt);
    const localDateTime = `${dateTime.getFullYear()}-${pad(dateTime.getMonth() + 1)}-${pad(dateTime.getDate())}T${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}`;
    setStartsAt(localDateTime);
    setLocation(eventItem.location);
    setTargetType(eventItem.targetType);
    setTargetFaculty(eventItem.targetFaculty || "");
    setTargetYear(eventItem.targetYear || 1);
    setTargetSemester(eventItem.targetSemester || 1);
  }

  function openCreateEventModal() {
    setShowCreateModal(true);
    setFormError(null);
    setCreateErrors({});
    setTitle("");
    setDescription("");
    const selected = new Date(selectedDate);
    selected.setHours(9, 0, 0, 0);
    const localDateTime = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}T${pad(selected.getHours())}:${pad(selected.getMinutes())}`;
    setStartsAt(localDateTime);
    setLocation("");
    setTargetType("EVERYONE");
    setTargetFaculty("");
    setTargetYear(1);
    setTargetSemester(1);
  }

  function validateCreateEventForm() {
    const errors: EventCreateErrors = {};
    const titleError = validateEventTitle(title);
    const descriptionError = validateEventDescription(description);
    if (titleError) errors.title = titleError;
    if (descriptionError) errors.description = descriptionError;
    if (!location.trim()) errors.location = "This field is required.";
    if (!startsAt) errors.startsAt = "This field is required.";
    if (requiresFaculty(targetType) && !targetFaculty) errors.targetFaculty = "This field is required.";
    if (requiresYear(targetType) && (!targetYear || targetYear < 1)) errors.targetYear = "Enter a valid year.";
    if (requiresSemester(targetType) && (!targetSemester || targetSemester < 1)) errors.targetSemester = "Enter a valid semester.";
    return errors;
  }

  async function createEvent() {
    if (!token) return;
    const validationErrors = validateCreateEventForm();
    setCreateErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setCreating(true);
    setFormError(null);

    try {
      if (!title || !startsAt || !location) {
        throw new Error("title, startsAt, location are required.");
      }

      const payload: Record<string, unknown> = {
        title,
        description,
        startsAt: new Date(startsAt).toISOString(),
        location,
        targetType,
      };

      if (requiresFaculty(targetType)) {
        payload.targetFaculty = targetFaculty;
      }
      if (requiresYear(targetType)) {
        payload.targetYear = targetYear;
      }
      if (requiresSemester(targetType)) {
        payload.targetSemester = targetSemester;
      }

      await apiFetch("/api/events", { method: "POST", body: JSON.stringify(payload) }, token);
      await load();
      setCreateErrors({});
      setShowCreateModal(false);
      setShowDayAgenda(true);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create event.");
    } finally {
      setCreating(false);
    }
  }

  async function saveChanges() {
    if (!token || !selectedEvent) return;
    const validationErrors = validateCreateEventForm();
    setCreateErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSaving(true);
    setFormError(null);

    try {
      if (!title || !startsAt || !location) {
        throw new Error("title, startsAt, location are required.");
      }

      const payload: Record<string, unknown> = {
        title,
        description,
        startsAt: new Date(startsAt).toISOString(),
        location,
        targetType,
      };

      if (requiresFaculty(targetType)) {
        payload.targetFaculty = targetFaculty;
      }
      if (requiresYear(targetType)) {
        payload.targetYear = targetYear;
      }
      if (requiresSemester(targetType)) {
        payload.targetSemester = targetSemester;
      }

      await apiFetch(`/api/events/${selectedEvent._id}`, { method: "PUT", body: JSON.stringify(payload) }, token);
      await load();
      setSelectedEvent(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to update event.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!token || !selectedEvent) return;
    setDeleting(true);
    setFormError(null);
    try {
      await apiFetch(`/api/events/${selectedEvent._id}`, { method: "DELETE" }, token);
      await load();
      setSelectedEvent(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to delete event.");
    } finally {
      setDeleting(false);
    }
  }

  const calendarDays = buildCalendarDays(currentMonth);
  const today = new Date();
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);

  return (
    <>
      <div className="px-4 py-5">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-white">Events Calendar</h1>
                <p className="mt-1 text-sm text-slate-300">
                  Click a date to view events. Open details to edit or delete any event.
                </p>
              </div>
              <button
                className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-100 hover:bg-white/12"
                onClick={() => router.push("/admin/events")}
                type="button"
              >
                Back to Event Management
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-red-200">{error}</div>}

          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div
              className={`flex w-[200%] transition-transform duration-300 ease-out ${
                showDayAgenda ? "-translate-x-1/2" : "translate-x-0"
              }`}
            >
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
                        className="rounded-md border border-white/10 bg-slate-950/35 px-2 py-1 text-[11px] text-white"
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
                        className="rounded-md border border-white/10 bg-slate-950/35 px-2 py-1 text-[11px] text-white"
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
                    <div key={day} className="text-center text-[10px] font-medium uppercase tracking-wide text-slate-300">
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
                            ? "border-blue-200 bg-blue-50"
                            : hasEvents
                              ? "border-blue-100 bg-white"
                              : "border-white/10 bg-white/6 hover:border-white/20 hover:bg-white/10"
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
                              ? "bg-blue-600 font-semibold text-white"
                              : isToday
                                ? "bg-blue-50 font-semibold text-blue-700"
                                : inCurrentMonth
                                  ? "text-white group-hover:bg-white/10"
                                  : "text-slate-500"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        <span className="h-3 text-[9px] text-slate-300">
                          {hasEvents ? `${count} event${count > 1 ? "s" : ""}` : ""}
                        </span>
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
                  <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {selectedDateEvents.length} Event{selectedDateEvents.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mb-3">
                  <button
                    className="rounded-xl border border-blue-600 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                    onClick={openCreateEventModal}
                    type="button"
                  >
                    Add New Event
                  </button>
                </div>

                <div className="mb-3">
                  <div className="text-xs uppercase tracking-wide text-slate-300">
                    {showPastEvents ? "Past Events" : "Upcoming Events"}
                  </div>
                  <div className="text-base font-semibold text-white">{selectedDate.toLocaleDateString()}</div>
                </div>

                {loading ? (
                  <div className="text-sm text-slate-600">Loading events...</div>
                ) : selectedDateEvents.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-slate-300">No events on this date.</div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedDateEvents.map((eventItem) => (
                      <div
                        key={eventItem._id}
                        className={`rounded-2xl border p-3 ${
                          isTodayEvent(eventItem.startsAt)
                            ? "border-blue-200 bg-blue-50"
                            : "border-blue-100 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{eventItem.title}</div>
                            <div className="mt-1 text-xs text-slate-300">
                              {new Date(eventItem.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | {eventItem.location}
                            </div>
                          </div>
                          <button
                            className="rounded-lg border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] font-medium text-slate-100 hover:bg-white/12"
                            onClick={() => openEventDetails(eventItem)}
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
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(6,34,38,0.98),rgba(15,23,42,0.98))] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Event Details</h2>
                <p className="mt-1 text-sm text-slate-300">Edit event details below. Students will be notified when changes are saved.</p>
              </div>
              <button
                className="rounded-lg border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/12"
                onClick={() => setSelectedEvent(null)}
                type="button"
              >
                Close
              </button>
            </div>

            {formError && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Title</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  value={title}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTitle(value);
                    setCreateErrors((current) => ({ ...current, title: validateEventTitle(value) }));
                  }}
                  placeholder="Event title"
                />
                {renderFieldError(createErrors.title)}
                <div className="mt-1 text-right text-xs text-slate-400">{title.length}/{EVENT_TITLE_MAX_LENGTH}</div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Location</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Event location"
                />
                {renderFieldError(createErrors.location)}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Date & Time</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
                {renderFieldError(createErrors.startsAt)}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Target Type</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as EventTargetType)}
                >
                  <option value="EVERYONE">Everyone</option>
                  <option value="STUDENTS_ALL">Students: All Faculties</option>
                  <option value="STUDENTS_FACULTY">Students: Specific Faculty</option>
                  <option value="STUDENTS_FACULTY_YEAR">Students: Faculty + Year</option>
                  <option value="STUDENTS_FACULTY_YEAR_SEMESTER">Students: Faculty + Year + Semester</option>
                  <option value="TUTORS_ALL">Tutors: All Faculties</option>
                  <option value="TUTORS_FACULTY">Tutors: Specific Faculty</option>
                  <option value="FACULTY">Legacy: Students Faculty</option>
                  <option value="YEAR_SEM">Legacy: Students Year + Semester</option>
                  <option value="FACULTY_YEAR_SEM">Legacy: Students Faculty + Year + Semester</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Description</span>
                <textarea
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDescription(value);
                    setCreateErrors((current) => ({ ...current, description: validateEventDescription(value) }));
                  }}
                  placeholder="Event description"
                />
                {renderFieldError(createErrors.description)}
                <div className="mt-1 text-right text-xs text-slate-400">{description.length}/{EVENT_DESCRIPTION_MAX_LENGTH}</div>
              </label>

              {requiresFaculty(targetType) && (
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Target Faculty</span>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={targetFaculty}
                    onChange={(e) => setTargetFaculty(e.target.value)}
                  >
                    <option value="">Select faculty</option>
                    {FACULTY_OPTIONS.map((facultyItem) => (
                      <option key={facultyItem} value={facultyItem}>
                        {facultyItem}
                      </option>
                    ))}
                  </select>
                  {renderFieldError(createErrors.targetFaculty)}
                </label>
              )}

              {requiresYear(targetType) && (
                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Year</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      type="number"
                      min={1}
                      value={targetYear}
                      onChange={(e) => setTargetYear(Number(e.target.value))}
                      placeholder="Year"
                    />
                    {renderFieldError(createErrors.targetYear)}
                  </label>
                  {requiresSemester(targetType) && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Semester</span>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        type="number"
                        min={1}
                        value={targetSemester}
                        onChange={(e) => setTargetSemester(Number(e.target.value))}
                        placeholder="Semester"
                      />
                      {renderFieldError(createErrors.targetSemester)}
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={deleteEvent}
                disabled={deleting}
                type="button"
              >
                {deleting ? "Deleting..." : "Delete Event"}
              </button>
              <button
                className="rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                onClick={saveChanges}
                disabled={saving}
                type="button"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(6,34,38,0.98),rgba(15,23,42,0.98))] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">Add New Event</h2>
                <p className="mt-1 text-sm text-slate-300">Create a new event for the selected date and audience.</p>
              </div>
              <button
                className="rounded-lg border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/12"
                onClick={() => setShowCreateModal(false)}
                type="button"
              >
                Close
              </button>
            </div>

            {formError && <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{formError}</div>}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Title</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  value={title}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTitle(value);
                    setCreateErrors((current) => ({ ...current, title: validateEventTitle(value) }));
                  }}
                  placeholder="Event title"
                />
                {renderFieldError(createErrors.title)}
                <div className="mt-1 text-right text-xs text-slate-400">{title.length}/{EVENT_TITLE_MAX_LENGTH}</div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Location</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Event location"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Date & Time</span>
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Target Type</span>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as EventTargetType)}
                >
                  <option value="EVERYONE">Everyone</option>
                  <option value="STUDENTS_ALL">Students: All Faculties</option>
                  <option value="STUDENTS_FACULTY">Students: Specific Faculty</option>
                  <option value="STUDENTS_FACULTY_YEAR">Students: Faculty + Year</option>
                  <option value="STUDENTS_FACULTY_YEAR_SEMESTER">Students: Faculty + Year + Semester</option>
                  <option value="TUTORS_ALL">Tutors: All Faculties</option>
                  <option value="TUTORS_FACULTY">Tutors: Specific Faculty</option>
                  <option value="FACULTY">Legacy: Students Faculty</option>
                  <option value="YEAR_SEM">Legacy: Students Year + Semester</option>
                  <option value="FACULTY_YEAR_SEM">Legacy: Students Faculty + Year + Semester</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-300">Description</span>
                <textarea
                  className="w-full rounded-xl border border-white/10 bg-slate-950/35 p-2.5 text-sm text-white outline-none transition"
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDescription(value);
                    setCreateErrors((current) => ({ ...current, description: validateEventDescription(value) }));
                  }}
                  placeholder="Event description"
                />
                {renderFieldError(createErrors.description)}
                <div className="mt-1 text-right text-xs text-slate-400">{description.length}/{EVENT_DESCRIPTION_MAX_LENGTH}</div>
              </label>

              {requiresFaculty(targetType) && (
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Target Faculty</span>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={targetFaculty}
                    onChange={(e) => setTargetFaculty(e.target.value)}
                  >
                    <option value="">Select faculty</option>
                    {FACULTY_OPTIONS.map((facultyItem) => (
                      <option key={facultyItem} value={facultyItem}>
                        {facultyItem}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {requiresYear(targetType) && (
                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Year</span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      type="number"
                      min={1}
                      value={targetYear}
                      onChange={(e) => setTargetYear(Number(e.target.value))}
                      placeholder="Year"
                    />
                  </label>
                  {requiresSemester(targetType) && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Semester</span>
                      <input
                        className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        type="number"
                        min={1}
                        value={targetSemester}
                        onChange={(e) => setTargetSemester(Number(e.target.value))}
                        placeholder="Semester"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                className="rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-white/12"
                onClick={() => { setShowCreateModal(false); setCreateErrors({}); }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-xl border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-70"
                onClick={createEvent}
                disabled={creating}
                type="button"
              >
                {creating ? "Creating..." : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
