import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Meeting } from "../../types";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  ExternalLink,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { formatTimeRange } from "../../utils/formatters";

interface HeroCalendarSectionProps {
  nextMeeting: Meeting | null;
  upcomingMeetings: Meeting[];
  allMeetings?: Meeting[];
  isGoogleConnected: boolean;
  isRefreshingCalendar: boolean;
  onRefreshCalendar: () => Promise<void>;
  onConnectGoogle: () => Promise<void>;
  getMeetingCountdown?: (startTimeStr: string, endTimeStr?: string) => string;
}

// Google Meet 4-Color SVG Logo
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

export const HeroCalendarSection: React.FC<HeroCalendarSectionProps> = ({
  upcomingMeetings = [],
  allMeetings = [],
  isGoogleConnected,
  isRefreshingCalendar,
  onRefreshCalendar,
  onConnectGoogle
}) => {
  // Real-time ticking timer so countdowns update live without page reload
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // Calendar interactive month state & selected date state
  const [displayDate, setDisplayDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const now = new Date();
  const nowMs = now.getTime();

  const displayYear = displayDate.getFullYear();
  const displayMonth = displayDate.getMonth();
  const monthName = displayDate.toLocaleString("en-US", { month: "long" }).toUpperCase();

  const handlePrevMonth = () => {
    setDisplayDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleJumpToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setDisplayDate(today);
  };

  // Helper to compare dates ignoring time
  const isSameCalendarDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // 1. Calculate the Closest Upcoming Meeting (Next Session)
  const pool = allMeetings.length > 0 ? allMeetings : upcomingMeetings;
  const activeUpcomingMeetings = pool
    .filter((m) => new Date(m.endTime).getTime() > nowMs)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const closestMeeting: Meeting | null = activeUpcomingMeetings.length > 0 ? activeUpcomingMeetings[0] : null;

  // 2. Schedule for the currently selected date (defaults to today, or any clicked date)
  const isSelectedToday = isSameCalendarDay(selectedDate, now);

  const selectedDateSchedule = pool
    .filter((m) => isSameCalendarDay(new Date(m.startTime), selectedDate))
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const selectedDateFormatted = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });

  const selectedDateLabel = isSelectedToday
    ? "TODAY'S SCHEDULE"
    : `${selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()} SCHEDULE`;

  const isSelectedDate = (dayNum: number) => {
    return (
      selectedDate.getFullYear() === displayYear &&
      selectedDate.getMonth() === displayMonth &&
      selectedDate.getDate() === dayNum
    );
  };

  // 3. Dynamic countdown calculation
  const getDynamicCountdown = (startTimeStr: string, endTimeStr?: string): string => {
    try {
      const start = new Date(startTimeStr).getTime();
      const end = endTimeStr ? new Date(endTimeStr).getTime() : start + 30 * 60000;
      const current = Date.now();

      // If meeting is currently in progress
      if (current >= start && current <= end) {
        return "In progress";
      }

      if (current > end) {
        return "Completed";
      }

      const diffMs = start - current;
      const diffMins = Math.round(diffMs / (1000 * 60));

      if (diffMins <= 1) {
        return "Starts now";
      }
      if (diffMins < 60) {
        return `Starts in ${diffMins} min${diffMins === 1 ? "" : "s"}`;
      }

      const hours = Math.floor(diffMins / 60);
      const remMins = diffMins % 60;
      if (hours < 24) {
        return `Starts in ${hours}h${remMins > 0 ? ` ${remMins}m` : ""}`;
      }

      const days = Math.round(hours / 24);
      return `In ${days} day${days === 1 ? "" : "s"}`;
    } catch {
      return "Scheduled";
    }
  };

  // Mini Calendar Calculations
  const firstDay = new Date(displayYear, displayMonth, 1);
  const startingDayIndex = (firstDay.getDay() + 6) % 7; // Monday-based: 0=Mon, 6=Sun
  const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startingDayIndex; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  // Check if a calendar day contains real meetings
  const hasEventsOnDate = (dayNum: number) => {
    return pool.some((m) => {
      const d = new Date(m.startTime);
      return (
        d.getFullYear() === displayYear &&
        d.getMonth() === displayMonth &&
        d.getDate() === dayNum
      );
    });
  };

  // 3D Tilted Card Badge: dynamically derived from closest upcoming meeting start time
  const nextMeetingTimeBadge = closestMeeting
    ? new Date(closestMeeting.startTime).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      })
    : "Open";

  const hasMeetUrl = Boolean(closestMeeting?.meetUrl && closestMeeting.meetUrl.includes("meet.google.com"));

  return (
    <div className="w-full bg-gradient-to-r from-[#EFF5FF] via-[#EBF3FE] to-[#E3EEFD] border border-[#D0E2FF] rounded-[30px] p-6 sm:p-8 lg:p-9 shadow-[0_8px_32px_rgba(37,99,235,0.06)] relative overflow-hidden">
      {/* Soft circular background illumination behind center */}
      <div className="absolute top-1/2 left-[50%] -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-200/30 via-white/40 to-transparent blur-2xl pointer-events-none" />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* ========================================================================= */}
        {/* LEFT SECTION (7 COLS): DYNAMIC CLOSEST UPCOMING MEETING (NEXT SESSION)     */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6 relative min-h-[380px]">
          {/* Top Row: Calendar & Next Session Header Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white shadow-[0_2px_10px_rgba(26,115,232,0.12)] border border-blue-100/80 flex items-center justify-center text-[#1D4ED8]">
                <CalendarIcon className="w-5 h-5 text-[#1D4ED8]" strokeWidth={2.2} />
              </div>
              <span className="text-xs sm:text-[13px] font-extrabold tracking-[0.14em] uppercase text-[#1D4ED8]">
                CALENDAR & NEXT SESSION
              </span>
            </div>

            {/* Quick sync button in hero header */}
            <button
              type="button"
              onClick={onRefreshCalendar}
              disabled={isRefreshingCalendar}
              title="Sync Google Calendar"
              className="p-2 rounded-xl bg-white/80 hover:bg-white text-slate-500 hover:text-[#1D4ED8] border border-blue-100/60 shadow-2xs transition-colors active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCalendar ? "animate-spin text-[#1D4ED8]" : ""}`} />
              <span className="hidden sm:inline">{isRefreshingCalendar ? "Syncing..." : "Sync"}</span>
            </button>
          </div>

          {/* Dynamic Status / Countdown Pill */}
          <div>
            {closestMeeting ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D6E8FE] text-xs font-bold text-[#1E293B]">
                <Clock className="w-3.5 h-3.5 text-[#1D4ED8]" strokeWidth={2.2} />
                <span>{getDynamicCountdown(closestMeeting.startTime, closestMeeting.endTime)}</span>
              </div>
            ) : isGoogleConnected ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F0FE] text-xs font-bold text-[#1D4ED8]">
                <Clock className="w-3.5 h-3.5 text-[#1D4ED8]" strokeWidth={2.2} />
                <span>Schedule Clear • No Upcoming Sessions</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF3C7] text-xs font-bold text-[#92400E]">
                <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" strokeWidth={2.2} />
                <span>Google Calendar Not Connected</span>
              </div>
            )}
          </div>

          {/* Meeting Title */}
          <div className="max-w-md">
            {closestMeeting ? (
              <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-[#0F172A] tracking-[-0.03em] leading-tight break-words">
                {closestMeeting.title}
              </h2>
            ) : isGoogleConnected ? (
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight leading-tight">
                No upcoming meetings
              </h2>
            ) : (
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight leading-tight">
                Connect Google Calendar
              </h2>
            )}
          </div>

          {/* Time & Platform Row */}
          {closestMeeting ? (
            <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base font-bold text-[#0F172A]">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1D4ED8]" strokeWidth={2.2} />
                <span>{formatTimeRange(closestMeeting.startTime, closestMeeting.endTime)}</span>
              </div>
              <span className="text-slate-300 font-normal">|</span>
              {hasMeetUrl ? (
                <div className="flex items-center gap-2">
                  <GoogleMeetLogo className="w-4 h-4 shrink-0" />
                  <span>Google Meet</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                  <span>Calendar Event</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm font-medium text-slate-500">
              {isGoogleConnected
                ? "Your schedule has no upcoming sessions scheduled. Sync your Google Calendar or schedule a new event to view it here."
                : "Authorize your Google Workspace account to sync live calendar sessions, Google Meet links, and attendee lists."}
            </div>
          )}

          {/* Real Attendees Row - Never Fabricate Fake Stock Photos */}
          <div className="pt-0.5">
            {closestMeeting ? (
              closestMeeting.participants && closestMeeting.participants.length > 0 ? (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {closestMeeting.participants.slice(0, 4).map((p, idx) => {
                      const initial = (p.name || p.email || "?").charAt(0).toUpperCase();
                      const colors = [
                        "bg-[#1D4ED8] text-white",
                        "bg-[#0D9488] text-white",
                        "bg-[#7C3AED] text-white",
                        "bg-[#D97706] text-white"
                      ];
                      const colorClass = colors[idx % colors.length];
                      return (
                        <div
                          key={p.id || idx}
                          title={p.name ? `${p.name} (${p.email})` : p.email}
                          className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-bold text-xs shadow-xs font-mono ${colorClass}`}
                        >
                          {initial}
                        </div>
                      );
                    })}
                  </div>
                  {closestMeeting.participants.length > 4 && (
                    <span className="text-xs font-bold text-[#0F172A] ml-1.5">
                      +{closestMeeting.participants.length - 4}
                    </span>
                  )}
                  <span className="text-xs sm:text-sm font-semibold text-[#64748B] ml-1">
                    {closestMeeting.participants.length} confirmed attendee{closestMeeting.participants.length === 1 ? "" : "s"}
                  </span>
                </div>
              ) : (
                <span className="text-xs sm:text-sm font-semibold text-[#64748B]">
                  Attendee information unavailable
                </span>
              )
            ) : (
              <span className="text-xs sm:text-sm font-semibold text-[#64748B]">
                {isGoogleConnected ? "0 active attendees scheduled" : "Calendar access required"}
              </span>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            {closestMeeting ? (
              <>
                {closestMeeting.meetUrl ? (
                  <a
                    href={closestMeeting.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-sm shadow-[0_4px_16px_rgba(29,78,216,0.3)] active:scale-95 transition-all"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Google Meet</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80 ml-0.5" />
                  </a>
                ) : null}

                <Link
                  to={`/meetings/${closestMeeting.id}`}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 active:scale-95 transition-all"
                >
                  <span>Details</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            ) : isGoogleConnected ? (
              <>
                <button
                  type="button"
                  onClick={onRefreshCalendar}
                  disabled={isRefreshingCalendar}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-sm shadow-[0_4px_16px_rgba(29,78,216,0.3)] active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingCalendar ? "animate-spin" : ""}`} />
                  <span>{isRefreshingCalendar ? "Syncing..." : "Sync Calendar"}</span>
                </button>
                <a
                  href="https://calendar.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100 active:scale-95 transition-all"
                >
                  <span>Open Google Calendar</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </>
            ) : (
              <button
                type="button"
                onClick={onConnectGoogle}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-bold text-sm shadow-[0_4px_16px_rgba(29,78,216,0.3)] active:scale-95 transition-all"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Connect Google Calendar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3D FLOATING VISUAL COMPOSITION (CENTER LAYER)                             */}
          {/* ========================================================================= */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-64 h-64 pointer-events-none select-none hidden xl:block">
            {/* Curved Dashed Connector Line with Blue Dot */}
            <svg className="absolute -top-6 -left-12 w-48 h-36" viewBox="0 0 160 120" fill="none">
              <path
                d="M10 110 C 20 40, 95 20, 138 28"
                stroke="#60A5FA"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
              <circle cx="138" cy="28" r="4.5" fill="#1D4ED8" />
            </svg>

            {/* Floating Google Calendar 31 Badge */}
            <div className="absolute top-0 right-10 z-20 transform rotate-12 shadow-[0_12px_28px_rgba(37,99,235,0.18)] rounded-2xl bg-white p-2.5 border border-slate-100/90 transition-transform duration-500 hover:rotate-6">
              <div className="w-12 h-12 rounded-xl bg-white flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-full h-3 bg-[#1A73E8] rounded-t-md" />
                <div className="flex-1 flex items-center justify-center font-black text-[#1A73E8] text-lg font-mono">
                  31
                </div>
                {/* 4-color bottom bar */}
                <div className="w-full h-1 flex">
                  <div className="flex-1 bg-[#4285F4]" />
                  <div className="flex-1 bg-[#34A853]" />
                  <div className="flex-1 bg-[#FBBC05]" />
                  <div className="flex-1 bg-[#EA4335]" />
                </div>
              </div>
            </div>

            {/* Tilted 3D White Calendar Card with DYNAMIC start time Badge */}
            <div className="absolute top-10 left-2 z-10 w-52 h-44 rounded-3xl bg-white/95 backdrop-blur-md shadow-[0_16px_36px_rgba(37,99,235,0.12)] border border-white/80 p-4 transform -rotate-6">
              {/* Header skeleton */}
              <div className="flex items-center gap-1.5 mb-3 opacity-30">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <div className="w-16 h-2 rounded-full bg-blue-300" />
              </div>
              {/* Grid slots */}
              <div className="grid grid-cols-3 gap-2">
                <div className="h-8 rounded-lg bg-[#EFF6FF]" />
                <div className="h-8 rounded-lg bg-[#EFF6FF]" />
                <div className="h-8 rounded-lg bg-[#EFF6FF]" />
                <div className="h-8 rounded-lg bg-[#EFF6FF]" />
                {/* DYNAMIC Start Time Highlight Cell */}
                <div className="h-8 rounded-lg bg-[#1D4ED8] text-white font-black text-[10px] flex items-center justify-center shadow-md font-mono truncate px-1">
                  {nextMeetingTimeBadge}
                </div>
                <div className="h-8 rounded-lg bg-[#EFF6FF]" />
                <div className="h-8 rounded-lg bg-[#EFF6FF]" />
                <div className="h-8 rounded-lg bg-[#EFF6FF]" />
                <div className="h-8 rounded-lg bg-[#EFF6FF]" />
              </div>
            </div>

            {/* Floating Google Meet Mini Card in Foreground */}
            <div className="absolute bottom-5 right-2 z-30 transform translate-y-2 rounded-2xl bg-white p-3 shadow-[0_12px_28px_rgba(0,0,0,0.08)] border border-slate-100/90 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#1D4ED8]">
                <Video className="w-4 h-4 text-[#1D4ED8]" />
              </div>
              <div className="space-y-1.5">
                <div className="w-12 h-2 rounded-full bg-slate-200" />
                <div className="w-8 h-1.5 rounded-full bg-slate-100" />
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SECTION (5 COLS): FLOATING WHITE CALENDAR & TODAY'S SCHEDULE        */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 bg-white rounded-[26px] p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col justify-between space-y-5">
          {/* Calendar Top Navigation Header */}
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-[#1D4ED8]" strokeWidth={2.2} />
              <span className="text-xs sm:text-sm font-extrabold tracking-wider uppercase text-[#0F172A] font-mono">
                {monthName} {displayYear}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 rounded-md hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 rounded-md hover:text-[#0F172A] hover:bg-slate-100 transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleJumpToToday}
                title="Jump to today"
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all font-mono cursor-pointer active:scale-95 ${
                  isSelectedToday
                    ? "bg-[#E8F0FE] text-[#1D4ED8] border border-[#BFDBFE]"
                    : "bg-white hover:bg-[#E8F0FE] text-[#1D4ED8] border border-blue-200 shadow-2xs"
                }`}
              >
                TODAY: {now.getDate()}
              </button>
            </div>
          </div>

          {/* Month Calendar Grid with Real Event Indicators & Interactive Date Selection */}
          <div className="space-y-1.5 select-none">
            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekdays.map((w, idx) => (
                <span key={idx} className="text-xs font-bold text-slate-400">
                  {w}
                </span>
              ))}
            </div>

            {/* Days Grid - Every day is a clickable button to navigate to any date */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {days.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="w-7 h-7 mx-auto" />;
                }

                const isTodayDate =
                  now.getFullYear() === displayYear &&
                  now.getMonth() === displayMonth &&
                  day === now.getDate();

                const isSelected = isSelectedDate(day);
                const hasEvents = hasEventsOnDate(day);

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => setSelectedDate(new Date(displayYear, displayMonth, day))}
                    title={`${day} ${monthName} ${displayYear}${hasEvents ? " • Has scheduled meetings" : ""}`}
                    className={`w-7 h-7 mx-auto rounded-lg flex flex-col items-center justify-center text-xs font-mono transition-all relative cursor-pointer active:scale-95 focus:outline-none ${
                      isSelected
                        ? "bg-[#1D4ED8] text-white font-bold shadow-xs ring-2 ring-blue-300"
                        : isTodayDate
                        ? "border-2 border-[#1D4ED8] text-[#1D4ED8] font-bold hover:bg-blue-50"
                        : "text-[#334155] font-semibold hover:bg-slate-100 hover:text-[#0F172A]"
                    }`}
                  >
                    <span>{day}</span>
                    {hasEvents && (
                      <span
                        className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                          isSelected ? "bg-white" : "bg-[#1D4ED8]"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizontal Divider */}
          <div className="border-t border-slate-100 pt-3.5">
            {/* Dynamic Schedule Header */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0F172A]">
                  {selectedDateLabel}
                </span>
                {!isSelectedToday && (
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="text-[10px] font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                  >
                    (Back to Today)
                  </button>
                )}
              </div>
              <Link
                to="/meetings"
                className="text-xs font-bold text-[#1D4ED8] hover:underline flex items-center gap-1 transition-colors"
              >
                View Full Schedule →
              </Link>
            </div>

            {/* Schedule Timeline List - DYNAMIC FOR SELECTED DATE */}
            {selectedDateSchedule.length === 0 ? (
              <div className="py-7 text-center space-y-1.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-[#0F172A]">
                  {isSelectedToday
                    ? "No meetings scheduled today"
                    : `No meetings scheduled on ${selectedDateFormatted}`}
                </p>
                <p className="text-[11px] text-slate-400 font-medium max-w-xs mx-auto">
                  {isSelectedToday
                    ? (isGoogleConnected
                        ? "Your Google Calendar is completely clear for today."
                        : "Connect your Google account to automatically load today's schedule.")
                    : "No Google Calendar events scheduled for this date."}
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-3.5 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-[1.5px] before:bg-slate-200">
                {selectedDateSchedule.map((item, idx) => {
                  const isItemClosest = closestMeeting?.id === item.id;
                  const isItemEnded = new Date(item.endTime).getTime() < nowMs;
                  const isItemMeet = Boolean(item.meetUrl && item.meetUrl.includes("meet.google.com"));

                  return (
                    <div key={item.id || idx} className="relative flex items-center justify-between gap-3 group">
                      {/* Timeline Node Dot */}
                      {isItemClosest ? (
                        <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-[#1D4ED8] bg-white ring-4 ring-blue-50 shrink-0 z-10" />
                      ) : isItemEnded ? (
                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-slate-300 shrink-0 z-10" />
                      ) : (
                        <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#93C5FD] shrink-0 z-10" />
                      )}

                      {/* Meeting Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#0F172A] font-mono leading-tight">
                          {formatTimeRange(item.startTime, item.endTime)}
                        </p>
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          {item.title}
                        </p>
                      </div>

                      {/* Platform & Join Button (Only when URL exists!) */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {isItemMeet ? (
                          <GoogleMeetLogo className="w-4 h-4 shrink-0" />
                        ) : (
                          <Video className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}

                        {item.meetUrl ? (
                          <a
                            href={item.meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-1.5 rounded-full bg-[#EBF3FE] hover:bg-[#DBEAFE] text-[#1D4ED8] font-bold text-xs transition-colors shadow-2xs"
                          >
                            Join
                          </a>
                        ) : (
                          <Link
                            to={`/meetings/${item.id}`}
                            className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-colors"
                          >
                            Details
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
