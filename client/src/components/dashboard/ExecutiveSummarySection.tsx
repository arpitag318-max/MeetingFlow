import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Clock,
  ListChecks,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Video,
  Activity,
  FileText,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { Meeting, UserTask } from "../../types";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

interface ExecutiveSummarySectionProps {
  meetings: Meeting[];
  tasks: UserTask[];
  isGoogleConnected: boolean;
}

/* -------------------------------------------------------------------------- */
/* Google Meet 4-Color Logo (Matches Calendar & Next Session)                  */
/* -------------------------------------------------------------------------- */

const GoogleMeetLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 87.5 72" fill="none">
    <path d="M49.5 36l8.8-12.7c1.8-2.6 5.6-2.8 7.6-.4l17.8 20.8c2 2.3 2 5.8 0 8.1L65.9 72.6c-2 2.3-5.8 2.2-7.6-.4L49.5 59.5V36z" fill="#00832d" />
    <path d="M0 56.4C0 64.9 6.9 71.8 15.4 71.8h34.1V36H0v20.4z" fill="#0066da" />
    <path d="M49.5 0v36H0V15.4C0 6.9 6.9 0 15.4 0h34.1z" fill="#ea4335" />
    <path d="M49.5 36H0v20.4h49.5V36z" fill="#2684fc" />
    <path d="M83.7 52.3l-17.8-20.8c-2-2.3-5.8-2.2-7.6.4L49.5 44.6V72h16.4c8.5 0 15.4-6.9 15.4-15.4v-4.3z" fill="#00ac47" />
    <path d="M65.9 0H49.5v27.4l8.8-12.7c1.8-2.6 5.6-2.8 7.6-.4l17.8 20.8c.8.9 1.3 2 1.3 3.1V15.4C85 6.9 78.1 0 69.6 0z" fill="#ffba00" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const isSameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInputValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseLocalDay = (val: string): Date => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    const [y, m, d] = val.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return startOfDay(new Date(val));
};

const formatDuration = (minutes: number): string => {
  const m = Math.round(minutes);
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
};

const formatClockTime = (d: Date): string => {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
};

const meetingDurationMinutes = (m: Meeting): number => {
  const s = new Date(m.startTime).getTime();
  const e = new Date(m.endTime).getTime();
  if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
    return Math.round((e - s) / 60000);
  }
  return m.durationMinutes || 0;
};

const isGoogleMeet = (m: Meeting): boolean => {
  return Boolean(m.meetUrl || m.meetCode || m.description?.toLowerCase().includes("meet.google.com"));
};

const isMeetingProcessed = (m: Meeting): boolean => {
  return m.processingJob?.status === "COMPLETED" || Boolean(m.summary);
};

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export const ExecutiveSummarySection: React.FC<ExecutiveSummarySectionProps> = ({
  meetings = [],
  tasks = [],
  isGoogleConnected
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const dateInputRef = useRef<HTMLInputElement>(null);

  const today = startOfDay(new Date());
  const isSelectedToday = isSameCalendarDay(selectedDate, today);

  const handleOpenNativePicker = () => {
    const el = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!el) return;
    try {
      if (el.showPicker) el.showPicker();
      else el.focus();
    } catch {
      el.focus();
    }
  };

  /* ------------------------- 1. Filtered Data for Day ----------------------- */
  const summaryData = useMemo(() => {
    const dayStartMs = startOfDay(selectedDate).getTime();
    const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

    // Filter unique meetings for selected calendar date
    const seenIds = new Set<string>();
    const dayMeetings = meetings
      .filter((m) => {
        if (!m.id || seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        const s = new Date(m.startTime).getTime();
        return s >= dayStartMs && s < dayEndMs;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Metric 1: Meetings count
    const totalMeetings = dayMeetings.length;
    const googleMeetMeetings = dayMeetings.filter(isGoogleMeet);
    const googleMeetCount = googleMeetMeetings.length;
    const externalCount = totalMeetings - googleMeetCount;

    // Metric 2: Meeting time
    const totalDurationMins = dayMeetings.reduce((sum, m) => sum + meetingDurationMinutes(m), 0);
    const avgDurationMins = totalMeetings > 0 ? Math.round(totalDurationMins / totalMeetings) : 0;

    // Longest meeting
    let longestMeeting: Meeting | null = null;
    let longestDuration = 0;
    dayMeetings.forEach((m) => {
      const dur = meetingDurationMinutes(m);
      if (dur > longestDuration) {
        longestDuration = dur;
        longestMeeting = m;
      }
    });

    const googleMeetDuration = googleMeetMeetings.reduce((sum, m) => sum + meetingDurationMinutes(m), 0);
    const externalDuration = Math.max(0, totalDurationMins - googleMeetDuration);

    // Metric 3: Action items
    const processedMeetingsToday = dayMeetings.filter(isMeetingProcessed);

    // Open action items (pending/in-progress)
    const openTasks = tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
    const openTasksAssignedToUser = openTasks.length;

    // Metric 4: Overdue tasks as of selected date
    const overdueTasks = tasks.filter((t) => {
      if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
      if (!t.dueDate) return false;
      const dueTime = parseLocalDay(t.dueDate).getTime();
      return dueTime < dayStartMs;
    });
    const overdueCount = overdueTasks.length;

    // Task Health Status Breakdown (real action items)
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
    const totalTasksCount = tasks.filter((t) => t.status !== "CANCELLED").length;

    const dueSoonTasks = tasks.filter((t) => {
      if (t.status === "COMPLETED" || t.status === "CANCELLED") return false;
      if (!t.dueDate) return false;
      const d = parseLocalDay(t.dueDate).getTime();
      return d >= dayStartMs && d <= dayStartMs + 3 * 24 * 60 * 60 * 1000;
    });

    const taskBreakdown = {
      total: totalTasksCount,
      open: openTasks.length,
      completed: completedTasks.length,
      dueSoon: dueSoonTasks.length,
      overdue: overdueCount,
      overdueTasksList: overdueTasks.slice(0, 3)
    };

    // Action Extraction Analytics Across All Processed Meetings
    const allProcessedMeetings = meetings
      .filter((m, idx, arr) => arr.findIndex((x) => x.id === m.id) === idx)
      .filter((m) => isMeetingProcessed(m) && new Date(m.startTime).getTime() <= dayEndMs)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const totalExtractedActions = allProcessedMeetings.reduce(
      (sum, m) => sum + (m.actionItems?.length || 0),
      0
    );
    const extractionDensity =
      allProcessedMeetings.length > 0
        ? (totalExtractedActions / allProcessedMeetings.length).toFixed(1)
        : null;

    // -------------------------------------------------------------------------
    // DYNAMIC TIMELINE (NO 9 AM - 5 PM ASSUMPTION!)
    // -------------------------------------------------------------------------
    let timelineBlocks: {
      id: string;
      title: string;
      startTimeStr: string;
      endTimeStr: string;
      durationMinutes: number;
      isMeet: boolean;
      meetUrl?: string;
      leftPercent: number;
      widthPercent: number;
    }[] = [];
    let timelineTimeTicks: { label: string; percent: number }[] = [];

    if (dayMeetings.length > 0) {
      const allStartTimes = dayMeetings.map((m) => new Date(m.startTime).getTime());
      const allEndTimes = dayMeetings.map((m) => new Date(m.endTime).getTime());
      const earliestStart = Math.min(...allStartTimes);
      const latestEnd = Math.max(...allEndTimes);

      // Pad timeline by 30 mins on each side
      let paddedStart = earliestStart - 30 * 60 * 1000;
      let paddedEnd = latestEnd + 30 * 60 * 1000;

      // Ensure a comfortable minimum visible window of at least 2.5 hours
      const minWindowMs = 2.5 * 60 * 60 * 1000;
      if (paddedEnd - paddedStart < minWindowMs) {
        const mid = (earliestStart + latestEnd) / 2;
        paddedStart = mid - minWindowMs / 2;
        paddedEnd = mid + minWindowMs / 2;
      }

      // Keep within the current calendar day
      const timelineStartMs = Math.max(dayStartMs, paddedStart);
      const timelineEndMs = Math.min(dayEndMs, paddedEnd);
      const totalSpanMs = Math.max(1, timelineEndMs - timelineStartMs);

      // Position each real meeting block chronologically
      timelineBlocks = dayMeetings.map((m) => {
        const sTime = new Date(m.startTime).getTime();
        const eTime = new Date(m.endTime).getTime();
        const left = Math.max(0, ((sTime - timelineStartMs) / totalSpanMs) * 100);
        const rawWidth = ((eTime - sTime) / totalSpanMs) * 100;
        const width = Math.max(8, Math.min(100 - left, rawWidth));

        return {
          id: m.id,
          title: m.title,
          startTimeStr: formatClockTime(new Date(m.startTime)),
          endTimeStr: formatClockTime(new Date(m.endTime)),
          durationMinutes: meetingDurationMinutes(m),
          isMeet: isGoogleMeet(m),
          meetUrl: m.meetUrl,
          leftPercent: left,
          widthPercent: width
        };
      });

      // Generate 4-6 clean, distributed time ticks along the dynamic timeline span
      const tickStepMins = totalSpanMs > 6 * 60 * 60 * 1000 ? 60 : 30;
      const firstTickDate = new Date(timelineStartMs);
      firstTickDate.setMinutes(
        Math.ceil(firstTickDate.getMinutes() / tickStepMins) * tickStepMins,
        0,
        0
      );

      let currTickTime = firstTickDate.getTime();
      while (currTickTime <= timelineEndMs) {
        const percent = ((currTickTime - timelineStartMs) / totalSpanMs) * 100;
        if (percent >= 2 && percent <= 98) {
          timelineTimeTicks.push({
            label: formatClockTime(new Date(currTickTime)),
            percent
          });
        }
        currTickTime += tickStepMins * 60 * 1000;
      }
    }

    return {
      dayMeetings,
      totalMeetings,
      googleMeetCount,
      externalCount,
      totalDurationMins,
      avgDurationMins,
      longestMeeting,
      longestDuration,
      googleMeetDuration,
      externalDuration,
      processedMeetingsTodayCount: processedMeetingsToday.length,
      openTasksAssignedToUser,
      overdueCount,
      taskBreakdown,
      allProcessedMeetings,
      totalExtractedActions,
      extractionDensity,
      timelineBlocks,
      timelineTimeTicks
    };
  }, [meetings, tasks, selectedDate]);

  // Selected date formatted text: e.g. "Sun, Oct 4, 2026"
  const formattedSelectedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <section
      aria-labelledby="executive-summary-heading"
      className="w-full bg-gradient-to-r from-[#EFF6FF] via-[#F4F1FE] to-[#FFF0F4] border border-[#DCE4F5] rounded-[30px] p-6 sm:p-8 lg:p-9 shadow-[0_12px_40px_rgba(59,130,246,0.05)] relative overflow-hidden"
    >
      {/* Aurora / Ribbon Silk Wave Background Elements (Matches user reference) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[30px]" aria-hidden="true">
        {/* Ambient radial glows */}
        <div className="absolute -top-24 -left-20 w-[480px] h-[360px] rounded-full bg-[#93C5FD]/35 blur-[90px]" />
        <div className="absolute -top-20 left-1/3 w-[520px] h-[380px] rounded-full bg-[#DDD6FE]/45 blur-[100px]" />
        <div className="absolute -top-28 right-0 w-[460px] h-[360px] rounded-full bg-[#FECDD3]/40 blur-[90px]" />
        <div className="absolute top-1/2 right-1/4 w-[380px] h-[300px] rounded-full bg-[#E9D5FF]/30 blur-[90px]" />

        {/* Flowing Ribbon Wave SVG */}
        <svg
          className="absolute inset-0 w-full h-full object-cover"
          viewBox="0 0 1440 600"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="silkWave1" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.5" />
              <stop offset="40%" stopColor="#C4B5FD" stopOpacity="0.45" />
              <stop offset="75%" stopColor="#DDD6FE" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FBCFE8" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="silkWave2" x1="20%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#DDD6FE" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#E9D5FF" stopOpacity="0.5" />
              <stop offset="85%" stopColor="#FED7AA" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#FECDD3" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="silkStroke1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.25" />
              <stop offset="45%" stopColor="#A78BFA" stopOpacity="0.4" />
              <stop offset="85%" stopColor="#F472B6" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Silk Ribbon Path 1 */}
          <path
            d="M 120 0 C 320 80, 520 180, 780 140 C 1040 100, 1220 50, 1440 80 L 1440 0 Z"
            fill="url(#silkWave1)"
          />
          {/* Silk Ribbon Path 2 */}
          <path
            d="M 340 0 C 520 130, 720 170, 940 110 C 1140 50, 1310 90, 1440 30 L 1440 0 Z"
            fill="url(#silkWave2)"
          />
          {/* Subtle Highlight Crest */}
          <path
            d="M 120 0 C 320 80, 520 180, 780 140 C 1040 100, 1220 50, 1440 80"
            stroke="url(#silkStroke1)"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      <div className="relative z-10 space-y-6">
        {/* =================================================================== */}
        {/* 1. EXECUTIVE SUMMARY HEADER                                         */}
        {/* =================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] shrink-0" />
              <span className="text-xs sm:text-[13px] font-black tracking-[0.14em] uppercase text-[#2563EB]">
                OPERATIONS &amp; WORKLOAD
              </span>
            </div>
            <h2
              id="executive-summary-heading"
              className="text-2xl sm:text-3xl lg:text-[34px] font-black text-[#0F172A] tracking-[-0.03em] leading-tight mt-1.5"
            >
              Today’s Executive Summary
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-1">
              A live view of today’s meetings, workload and follow-ups.
            </p>
          </div>

          {/* Dynamic Date Switcher on Top-Right */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {!isSelectedToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className="h-10 px-3.5 rounded-xl text-xs font-bold text-[#2563EB] bg-white hover:bg-blue-50 border border-blue-200/80 shadow-2xs transition-colors"
              >
                Today
              </button>
            )}

            <div className="flex items-center h-10 rounded-2xl bg-white/95 backdrop-blur-sm border border-slate-200/80 shadow-xs">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, -1))}
                aria-label="Previous day"
                className="h-full px-3 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50/50 rounded-l-2xl transition-colors"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
              </button>

              <div className="relative h-full border-x border-slate-100">
                <button
                  type="button"
                  onClick={handleOpenNativePicker}
                  aria-label={`Selected date ${formattedSelectedDate}. Click to choose another date`}
                  className="h-full flex items-center gap-2 px-3 text-xs sm:text-sm font-bold text-[#0F172A] hover:bg-blue-50/50 transition-colors"
                >
                  <CalendarDays className="w-4 h-4 text-[#2563EB]" strokeWidth={2.2} />
                  <span>{formattedSelectedDate}</span>
                </button>
                <input
                  ref={dateInputRef}
                  type="date"
                  tabIndex={-1}
                  aria-hidden="true"
                  value={toDateInputValue(selectedDate)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(parseLocalDay(e.target.value));
                    }
                  }}
                  className="absolute bottom-0 left-0 w-full h-0 opacity-0 pointer-events-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate((d) => addDays(d, 1))}
                aria-label="Next day"
                className="h-full px-3 text-slate-500 hover:text-[#2563EB] hover:bg-blue-50/50 rounded-r-2xl transition-colors"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. TOP 4 KPI CARDS (Matching user reference layout & graphics)     */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Meetings */}
          <Link
            to="/meetings"
            className="group rounded-[22px] bg-white/85 backdrop-blur-md border border-blue-200/70 hover:border-blue-300 p-5 shadow-[0_2px_12px_rgba(37,99,235,0.04)] hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between min-h-[142px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100/70 text-[#2563EB] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="text-[13px] font-bold text-slate-800">
                  Meetings
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl sm:text-[34px] font-black text-[#0F172A] tracking-tight leading-none">
                  {summaryData.totalMeetings}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-2 truncate">
                  {summaryData.totalMeetings > 0
                    ? `${summaryData.googleMeetCount} Google Meet · ${summaryData.externalCount} External`
                    : isGoogleConnected
                    ? "No meetings today"
                    : "Google Calendar not connected"}
                </p>
              </div>

              {/* Stylized 4-bar blue graphic matching reference */}
              <div className="flex items-end gap-1.5 shrink-0 pl-2 pb-0.5" aria-hidden="true">
                <span className="w-1.5 h-3 rounded-full bg-[#93C5FD]" />
                <span className="w-1.5 h-5 rounded-full bg-[#93C5FD]" />
                <span className="w-1.5 h-7 rounded-full bg-[#93C5FD]" />
                <span className="w-1.5 h-9 rounded-full bg-[#93C5FD]" />
              </div>
            </div>
          </Link>

          {/* Card 2: Meeting Time */}
          <Link
            to="/analytics"
            className="group rounded-[22px] bg-white/85 backdrop-blur-md border border-emerald-200/60 hover:border-emerald-300 p-5 shadow-[0_2px_12px_rgba(16,185,129,0.04)] hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between min-h-[142px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="text-[13px] font-bold text-slate-800">
                  Meeting time
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-3xl sm:text-[34px] font-black text-[#0F172A] tracking-tight leading-none">
                  {formatDuration(summaryData.totalDurationMins)}
                </p>
                <p className="text-xs font-semibold text-slate-500 mt-2 truncate">
                  {summaryData.totalDurationMins > 0 ? "Scheduled meeting time" : "No scheduled meeting time"}
                </p>
              </div>

              {/* Soft green wave / mountain graphic matching reference */}
              <div className="shrink-0 pl-2 pb-0.5" aria-hidden="true">
                <svg width="76" height="38" viewBox="0 0 76 38" fill="none" className="shrink-0">
                  <defs>
                    <linearGradient id="greenWaveFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#86EFAC" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#86EFAC" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 32 C 14 30, 20 18, 30 14 C 40 10, 48 24, 56 16 C 64 8, 70 4, 76 10 L 76 38 L 0 38 Z"
                    fill="url(#greenWaveFill)"
                  />
                  <path
                    d="M 0 32 C 14 30, 20 18, 30 14 C 40 10, 48 24, 56 16 C 64 8, 70 4, 76 10"
                    stroke="#4ADE80"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </Link>

          {/* Card 3: Action Items */}
          <Link
            to="/tasks"
            className="group rounded-[22px] bg-white/85 backdrop-blur-md border border-amber-200/60 hover:border-amber-300 p-5 shadow-[0_2px_12px_rgba(245,158,11,0.04)] hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between min-h-[142px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
                  <ListChecks className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="text-[13px] font-bold text-slate-800">
                  Action items
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="mt-4">
              <p className="text-3xl sm:text-[34px] font-black text-[#0F172A] tracking-tight leading-none">
                {summaryData.openTasksAssignedToUser}
              </p>
              <p className="text-xs font-semibold text-slate-500 mt-2 truncate">
                {summaryData.openTasksAssignedToUser > 0
                  ? `${summaryData.openTasksAssignedToUser} assigned to you`
                  : summaryData.allProcessedMeetings.length === 0
                  ? "No processed meetings yet"
                  : "No open action items"}
              </p>
            </div>
          </Link>

          {/* Card 4: Overdue */}
          <Link
            to="/tasks"
            className="group rounded-[22px] bg-white/85 backdrop-blur-md border border-rose-200/60 hover:border-rose-300 p-5 shadow-[0_2px_12px_rgba(244,63,94,0.04)] hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between min-h-[142px]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    summaryData.overdueCount > 0
                      ? "bg-rose-100/80 text-rose-600"
                      : "bg-rose-50 text-rose-500"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <span className="text-[13px] font-bold text-slate-800">
                  Overdue
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="mt-4">
              <p className="text-3xl sm:text-[34px] font-black text-[#0F172A] tracking-tight leading-none">
                {summaryData.overdueCount}
              </p>
              <p
                className={`text-xs font-semibold mt-2 truncate ${
                  summaryData.overdueCount > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {summaryData.overdueCount > 0
                  ? `${summaryData.overdueCount} needs attention`
                  : "All on track"}
              </p>
            </div>
          </Link>
        </div>

        {/* =================================================================== */}
        {/* 3. TODAY'S MEETING TIMELINE                                         */}
        {/* =================================================================== */}
        <div className="rounded-[24px] bg-white border border-blue-100/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(37,99,235,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1D4ED8]" strokeWidth={2.2} />
                <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                  Today’s Meeting Timeline
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological calendar schedule from your actual events.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8]" />
                <span>Google Meet</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span>Calendar Event</span>
              </span>
            </div>
          </div>

          {/* Dynamic Track Area */}
          {summaryData.dayMeetings.length === 0 ? (
            <div className="py-10 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
              <Clock className="w-7 h-7 text-slate-400 mx-auto mb-2" strokeWidth={1.8} />
              <p className="text-sm font-bold text-[#0F172A]">No meetings scheduled today</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Your calendar is clear. Scheduled events from Google Calendar will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dynamic Horizontal Timeline Bar */}
              <div className="relative h-14 w-full bg-gradient-to-r from-slate-100 via-blue-50/40 to-slate-100 rounded-xl border border-slate-200/80 overflow-hidden flex items-center p-1.5">
                {/* Real Meeting Blocks positioned chronologically */}
                {summaryData.timelineBlocks.map((block) => (
                  <div
                    key={block.id}
                    style={{
                      left: `${block.leftPercent}%`,
                      width: `${block.widthPercent}%`
                    }}
                    className={`h-full absolute rounded-lg px-3 py-1 shadow-xs flex items-center justify-between gap-2 overflow-hidden transition-all duration-200 cursor-pointer ${
                      block.isMeet
                        ? "bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white hover:brightness-110"
                        : "bg-gradient-to-r from-slate-700 to-slate-800 text-white hover:brightness-110"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {block.isMeet ? (
                        <div className="w-5 h-5 rounded-md bg-white p-0.5 shrink-0 flex items-center justify-center">
                          <GoogleMeetLogo className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <Video className="w-3.5 h-3.5 text-white/80 shrink-0" strokeWidth={2.2} />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight truncate">{block.title}</p>
                        <p className="text-[10px] text-white/80 leading-tight">
                          {block.startTimeStr} – {block.endTimeStr} ({block.durationMinutes}m)
                        </p>
                      </div>
                    </div>

                    {block.meetUrl && (
                      <a
                        href={block.meetUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-0.5 rounded-md bg-white text-[#1D4ED8] hover:bg-blue-50 text-[10px] font-bold shrink-0 transition-colors shadow-2xs hidden sm:flex items-center gap-1"
                      >
                        Join <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Dynamic Time Markers beneath timeline */}
              {summaryData.timelineTimeTicks.length > 0 && (
                <div className="relative h-4 text-[10px] font-bold text-slate-400">
                  {summaryData.timelineTimeTicks.map((tick, i) => (
                    <span
                      key={i}
                      style={{ left: `${tick.percent}%` }}
                      className="absolute top-0 -translate-x-1/2 whitespace-nowrap"
                    >
                      {tick.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Meeting Cards Beneath Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                {summaryData.dayMeetings.map((meeting) => {
                  const hasMeet = isGoogleMeet(meeting);
                  return (
                    <div
                      key={meeting.id}
                      className="p-3.5 rounded-xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {hasMeet ? (
                            <GoogleMeetLogo className="w-4 h-4 shrink-0" />
                          ) : (
                            <CalendarDays className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2.2} />
                          )}
                          <span className="text-xs font-bold text-[#0F172A] truncate">
                            {meeting.title}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500">
                          {formatClockTime(new Date(meeting.startTime))} –{" "}
                          {formatClockTime(new Date(meeting.endTime))} (
                          {meetingDurationMinutes(meeting)} mins)
                        </p>
                      </div>

                      {hasMeet && meeting.meetUrl && (
                        <a
                          href={meeting.meetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-[11px] font-bold shrink-0 transition-colors shadow-2xs flex items-center gap-1"
                        >
                          Join <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 4. ROW 3: TIME & SESSION SUMMARY + TASK HEALTH                      */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Time & Session Summary (Span 6 - Data-Driven Card, No Donut) */}
          <div className="lg:col-span-6 rounded-[24px] bg-white border border-blue-100/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(37,99,235,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-8 h-8 rounded-lg bg-[#E8F0FE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" strokeWidth={2.2} />
                </div>
                <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                  Time &amp; Session Summary
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Meeting duration metrics from your actual calendar events.
              </p>
            </div>

            {summaryData.totalMeetings === 0 ? (
              <div className="py-8 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 my-auto">
                <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" strokeWidth={1.8} />
                <p className="text-xs font-bold text-slate-700">No meeting time scheduled today</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Scheduled calendar events will be summarized here.
                </p>
              </div>
            ) : (
              <div className="space-y-4 my-auto py-2">
                {/* 4 Essential Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      TOTAL TIME
                    </p>
                    <p className="text-lg font-black text-[#0F172A] mt-0.5">
                      {formatDuration(summaryData.totalDurationMins)}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      MEETINGS
                    </p>
                    <p className="text-lg font-black text-[#0F172A] mt-0.5">
                      {summaryData.totalMeetings}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      AVG DURATION
                    </p>
                    <p className="text-lg font-black text-[#0F172A] mt-0.5">
                      {summaryData.avgDurationMins}m
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                      LONGEST
                    </p>
                    <p className="text-lg font-black text-[#0F172A] mt-0.5">
                      {summaryData.longestDuration}m
                    </p>
                  </div>
                </div>

                {/* Horizontal Duration Proportion */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1.5">
                    <span>Platform Distribution</span>
                    <span className="font-bold text-[#0F172A]">
                      {summaryData.totalMeetings} total event{summaryData.totalMeetings === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex gap-0.5">
                    <div
                      style={{
                        width: `${(summaryData.googleMeetDuration / Math.max(1, summaryData.totalDurationMins)) * 100}%`
                      }}
                      className="bg-[#1D4ED8] h-full rounded-l-full"
                      title="Google Meet"
                    />
                    <div
                      style={{
                        width: `${(summaryData.externalDuration / Math.max(1, summaryData.totalDurationMins)) * 100}%`
                      }}
                      className="bg-slate-400 h-full rounded-r-full"
                      title="Other Calendar Events"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-1.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1D4ED8]" />
                      Google Meet ({formatDuration(summaryData.googleMeetDuration)})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Other Events ({formatDuration(summaryData.externalDuration)})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Task Health Status (Span 6) */}
          <div className="lg:col-span-6 rounded-[24px] bg-white border border-blue-100/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(37,99,235,0.04)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#E8F0FE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                    <Activity className="w-4 h-4" strokeWidth={2.2} />
                  </div>
                  <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                    Task Health
                  </h3>
                </div>
                <Link
                  to="/tasks"
                  className="text-xs font-bold text-[#1D4ED8] hover:underline"
                >
                  View Tasks →
                </Link>
              </div>
              <p className="text-xs text-slate-500">
                Real-time tracking of extracted action items and deliverables.
              </p>
            </div>

            {summaryData.taskBreakdown.total === 0 ? (
              <div className="py-8 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 my-auto">
                <CheckCircle2 className="w-6 h-6 text-slate-400 mx-auto mb-1.5" strokeWidth={1.8} />
                <p className="text-xs font-bold text-slate-700">No action items yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Process a completed meeting to extract action items.
                </p>
              </div>
            ) : (
              <div className="space-y-4 my-auto py-2">
                {/* 3 Core Status Metrics */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      OPEN
                    </p>
                    <p className="text-lg font-black text-[#1D4ED8] mt-0.5">
                      {summaryData.taskBreakdown.open}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      COMPLETED
                    </p>
                    <p className="text-lg font-black text-[#059669] mt-0.5">
                      {summaryData.taskBreakdown.completed}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8FAFC] border border-slate-200/80">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      OVERDUE
                    </p>
                    <p
                      className={`text-lg font-black mt-0.5 ${
                        summaryData.taskBreakdown.overdue > 0 ? "text-[#DC2626]" : "text-slate-700"
                      }`}
                    >
                      {summaryData.taskBreakdown.overdue}
                    </p>
                  </div>
                </div>

                {/* Real Task Status Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex gap-0.5">
                  <div
                    style={{
                      width: `${(summaryData.taskBreakdown.completed / summaryData.taskBreakdown.total) * 100}%`
                    }}
                    className="bg-[#059669] h-full"
                    title="Completed"
                  />
                  <div
                    style={{
                      width: `${(summaryData.taskBreakdown.open / summaryData.taskBreakdown.total) * 100}%`
                    }}
                    className="bg-[#1D4ED8] h-full"
                    title="Open"
                  />
                  <div
                    style={{
                      width: `${(summaryData.taskBreakdown.overdue / summaryData.taskBreakdown.total) * 100}%`
                    }}
                    className="bg-[#DC2626] h-full"
                    title="Overdue"
                  />
                </div>

                {/* Overdue alert if applicable */}
                {summaryData.taskBreakdown.overdue > 0 && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-between text-xs text-[#DC2626] font-semibold">
                    <span>{summaryData.taskBreakdown.overdue} action item(s) require attention</span>
                    <Link to="/tasks" className="underline hover:no-underline font-bold">
                      Resolve →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* =================================================================== */}
        {/* 5. ROW 4: ACTION EXTRACTION INTELLIGENCE                            */}
        {/* =================================================================== */}
        <div className="rounded-[24px] bg-white border border-blue-100/90 p-5 sm:p-6 shadow-[0_2px_12px_rgba(37,99,235,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#E8F0FE] text-[#1D4ED8] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                  Action Extraction
                </h3>
                <p className="text-xs text-slate-500">
                  AI deliverables extracted from completed meetings.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#1D4ED8]/10 text-[#1D4ED8] border border-blue-200 self-start sm:self-auto font-mono">
              <Sparkles className="w-3 h-3 text-[#1D4ED8]" />
              Gemini Powered
            </span>
          </div>

          {summaryData.allProcessedMeetings.length === 0 ? (
            <div className="py-8 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
              <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1.5" strokeWidth={1.8} />
              <p className="text-xs font-bold text-slate-700">No processed meetings yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-md mx-auto">
                Process a completed meeting to extract action items.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  EXTRACTION DENSITY
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#0F172A]">
                    {summaryData.extractionDensity}
                  </span>
                  <span className="text-xs font-bold text-slate-600">actions / meeting</span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 pt-1">
                  Based on {summaryData.allProcessedMeetings.length} processed meeting
                  {summaryData.allProcessedMeetings.length === 1 ? "" : "s"} ·{" "}
                  {summaryData.totalExtractedActions} total action
                  {summaryData.totalExtractedActions === 1 ? "" : "s"}
                </p>
              </div>

              <div className="md:col-span-8 space-y-2">
                <p className="text-xs font-bold text-slate-700">Recently Processed Meetings</p>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {summaryData.allProcessedMeetings.slice(0, 3).map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-semibold"
                    >
                      <span className="font-bold text-[#0F172A] truncate pr-2">
                        {meeting.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[#1D4ED8] font-bold text-[10px] shrink-0 font-mono shadow-2xs">
                        {meeting.actionItems?.length || 0} actions
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
