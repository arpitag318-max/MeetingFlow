import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Target,
  Clock,
  BarChart3,
  Users,
  Lightbulb,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from "lucide-react";
import { Meeting } from "../../types";

interface WeeklyFocusCapacityCardProps {
  meetings: Meeting[];
}

interface NormalizedEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  start: string;
  end: string;
  durationMinutes: number;
  meetUrl?: string;
}

interface DayAggregate {
  dayName: string; // "Mon", "Tue", etc.
  fullDayName: string; // "Monday", etc.
  dateLabel: string; // "Oct 5"
  dateKey: string; // "2026-10-05"
  dateObj: Date;
  isToday: boolean;
  meetingMinutes: number;
  meetingHours: number;
  meetingCount: number;
  events: NormalizedEvent[];
}

// Helpers
const getMondayOfWeek = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 is Sun, 1 is Mon
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const addDays = (d: Date, days: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDuration = (minutes: number): string => {
  const m = Math.round(minutes);
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
};

export const WeeklyFocusCapacityCard: React.FC<WeeklyFocusCapacityCardProps> = ({
  meetings = [],
}) => {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => formatDateKey(today), [today]);

  // Dynamic Week Selector (defaults to actual current week)
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // 1. Generate 7 days of the selected week (Mon to Sun)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekMonday, i));
  }, [currentWeekMonday]);

  // Is current week active?
  const isCurrentWeek = useMemo(() => {
    const curMon = getMondayOfWeek(today);
    return formatDateKey(curMon) === formatDateKey(currentWeekMonday);
  }, [today, currentWeekMonday]);

  // 2. Normalize Google Calendar events
  const normalizedEvents: NormalizedEvent[] = useMemo(() => {
    return (meetings || []).map((m) => {
      const s = new Date(m.startTime).getTime();
      const e = new Date(m.endTime).getTime();
      let durationMinutes = 0;
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
        durationMinutes = Math.round((e - s) / 60000);
      } else if (m.durationMinutes && m.durationMinutes > 0) {
        durationMinutes = m.durationMinutes;
      }

      const eventDate = new Date(m.startTime);
      const dateKey = !isNaN(eventDate.getTime()) ? formatDateKey(eventDate) : "";

      return {
        id: m.id,
        date: dateKey,
        title: m.title || "Untitled Meeting",
        start: m.startTime,
        end: m.endTime,
        durationMinutes,
        meetUrl: m.meetUrl,
      };
    });
  }, [meetings]);

  // 3. Aggregate events by day for the selected week
  const dailyData: DayAggregate[] = useMemo(() => {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const fullDayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    return weekDays.map((dayDate, idx) => {
      const dateKey = formatDateKey(dayDate);
      const dayEvents = normalizedEvents.filter((ev) => ev.date === dateKey);

      const meetingMinutes = dayEvents.reduce((acc, ev) => acc + ev.durationMinutes, 0);
      const meetingHours = Number((meetingMinutes / 60).toFixed(1));

      return {
        dayName: dayNames[idx],
        fullDayName: fullDayNames[idx],
        dateLabel: dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateKey,
        dateObj: dayDate,
        isToday: dateKey === todayKey,
        meetingMinutes,
        meetingHours,
        meetingCount: dayEvents.length,
        events: dayEvents,
      };
    });
  }, [weekDays, normalizedEvents, todayKey]);

  // 4. Calculate Unified Week Totals (Single Source of Truth)
  const weekTotals = useMemo(() => {
    const totalMeetingMinutes = dailyData.reduce((acc, d) => acc + d.meetingMinutes, 0);
    const totalMeetings = dailyData.reduce((acc, d) => acc + d.meetingCount, 0);
    const avgDuration = totalMeetings > 0 ? Math.round(totalMeetingMinutes / totalMeetings) : 0;

    // Peak day calculation
    let peakDay = dailyData[0];
    dailyData.forEach((d) => {
      if (d.meetingMinutes > peakDay.meetingMinutes) {
        peakDay = d;
      }
    });

    return {
      totalMeetingMinutes,
      totalMeetings,
      avgDuration,
      peakDayName: peakDay.meetingMinutes > 0 ? peakDay.dayName : "No meetings",
      peakFullDayName: peakDay.meetingMinutes > 0 ? peakDay.fullDayName : "None",
      peakDayMinutes: peakDay.meetingMinutes,
      peakDayHours: peakDay.meetingHours,
    };
  }, [dailyData]);

  // 5. Development Mode Data Pipeline Debug Logging
  if (process.env.NODE_ENV !== "production") {
    // Only logs in development for verification
    const weeklyTotalsLog: Record<string, string> = {};
    dailyData.forEach((d) => {
      weeklyTotalsLog[d.dayName] = `${d.meetingMinutes}m (${d.meetingHours}h across ${d.meetingCount} meetings)`;
    });
    console.debug("[WeeklyFocus Pipeline] Normalized Events in week:", normalizedEvents.length);
    console.debug("[WeeklyFocus Pipeline] Daily Totals:", weeklyTotalsLog);
    console.debug("[WeeklyFocus Pipeline] Week Summary:", {
      totalMeetingTime: formatDuration(weekTotals.totalMeetingMinutes),
      totalMeetings: weekTotals.totalMeetings,
      avgDuration: `${weekTotals.avgDuration} mins`,
      peakDay: `${weekTotals.peakDayName} (${formatDuration(weekTotals.peakDayMinutes)})`,
    });
  }

  // 6. Dynamic Y-Axis Scale
  // Calculate sensible scale based on real maximum daily minutes
  const maxDayMinutes = Math.max(...dailyData.map((d) => d.meetingMinutes), 0);

  const { maxScaleMinutes, yAxisTicks } = useMemo(() => {
    if (maxDayMinutes <= 0) {
      return {
        maxScaleMinutes: 60,
        yAxisTicks: [
          { value: 60, label: "1h" },
          { value: 45, label: "45m" },
          { value: 30, label: "30m" },
          { value: 15, label: "15m" },
          { value: 0, label: "0m" },
        ],
      };
    }

    if (maxDayMinutes <= 30) {
      return {
        maxScaleMinutes: 30,
        yAxisTicks: [
          { value: 30, label: "30m" },
          { value: 20, label: "20m" },
          { value: 10, label: "10m" },
          { value: 0, label: "0m" },
        ],
      };
    }

    if (maxDayMinutes <= 60) {
      return {
        maxScaleMinutes: 60,
        yAxisTicks: [
          { value: 60, label: "1h" },
          { value: 45, label: "45m" },
          { value: 30, label: "30m" },
          { value: 15, label: "15m" },
          { value: 0, label: "0m" },
        ],
      };
    }

    if (maxDayMinutes <= 120) {
      return {
        maxScaleMinutes: 120,
        yAxisTicks: [
          { value: 120, label: "2h" },
          { value: 90, label: "1h 30m" },
          { value: 60, label: "1h" },
          { value: 30, label: "30m" },
          { value: 0, label: "0m" },
        ],
      };
    }

    if (maxDayMinutes <= 240) {
      return {
        maxScaleMinutes: 240,
        yAxisTicks: [
          { value: 240, label: "4h" },
          { value: 180, label: "3h" },
          { value: 120, label: "2h" },
          { value: 60, label: "1h" },
          { value: 0, label: "0m" },
        ],
      };
    }

    // Greater than 4h: round to next whole hour ceiling
    const maxHoursCeil = Math.max(5, Math.ceil(maxDayMinutes / 60));
    const maxMins = maxHoursCeil * 60;
    const step = maxHoursCeil / 4;
    const ticks = [];
    for (let h = maxHoursCeil; h >= 0; h -= step) {
      ticks.push({
        value: h * 60,
        label: h === 0 ? "0m" : `${Number(h.toFixed(1))}h`,
      });
    }

    return {
      maxScaleMinutes: maxMins,
      yAxisTicks: ticks,
    };
  }, [maxDayMinutes]);

  // Week range label e.g. "Oct 5 - Oct 11, 2026"
  const weekRangeLabel = useMemo(() => {
    const startStr = weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = weekDays[6].toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  }, [weekDays]);

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 sm:p-6 shadow-subtle space-y-6">
      {/* 1. Header with dynamic navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F0FAF4] border border-[#D3F5E2] text-[#1D7B4B] flex items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-[#1D7B4B]" />
          </div>
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#E85555]">
              CAPACITY &amp; FOCUS
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#181D1A] leading-tight">
              Weekly Focus &amp; Meeting Hours
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Actual Google Calendar meeting load across the week.
            </p>
          </div>
        </div>

        {/* Week navigation: Prev (<), Range label / Today, Next (>) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl px-2 py-1 shadow-2xs">
          <button
            onClick={() => setCurrentWeekMonday((m) => addDays(m, -7))}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#181D1A] hover:bg-white transition-colors"
            aria-label="Previous week"
            title="Previous week"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-semibold text-[#181D1A] px-1.5">
            {weekRangeLabel}
          </span>

          <button
            onClick={() => setCurrentWeekMonday((m) => addDays(m, 7))}
            className="p-1 rounded-md text-[#6B7280] hover:text-[#181D1A] hover:bg-white transition-colors"
            aria-label="Next week"
            title="Next week"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {!isCurrentWeek && (
            <button
              onClick={() => setCurrentWeekMonday(getMondayOfWeek(today))}
              className="ml-1 px-2 py-0.5 text-[11px] font-semibold text-[#E85555] bg-white border border-[#FFD4CF] rounded-md hover:bg-[#FFF1EF] transition-colors"
              title="Return to current week"
            >
              Current
            </button>
          )}
        </div>
      </div>

      {/* 2. Legend */}
      <div className="flex items-center justify-between text-xs font-medium text-[#6B7280]">
        <div className="text-[11px] text-[#6B7280]">
          {weekTotals.totalMeetings > 0 ? (
            <span>
              {weekTotals.totalMeetings} meeting{weekTotals.totalMeetings === 1 ? "" : "s"} scheduled
            </span>
          ) : (
            <span className="italic">No meetings this week</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E85555]" />
          <span>Meeting time</span>
        </div>
      </div>

      {/* 3. Real Bar Chart with Rock-Solid Heights & Dynamic Y-Scale */}
      <div className="relative pt-2 pb-1">
        {/* Y Axis Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pr-2">
          {yAxisTicks.map((tick, i) => (
            <div key={i} className="flex items-center w-full">
              <span className="w-10 text-[10px] font-medium text-[#8C948F] text-right pr-2">
                {tick.label}
              </span>
              <div className="flex-1 h-[1px] bg-[#F0ECE4]" />
            </div>
          ))}
        </div>

        {/* 7 Columns for Mon - Sun */}
        <div className="grid grid-cols-7 gap-2 sm:gap-4 pl-12 h-48 sm:h-52 pb-12 relative z-10">
          {dailyData.map((d, i) => {
            // Precise proportional height percentage
            const barHeightPct =
              maxScaleMinutes > 0
                ? Math.min(100, Math.round((d.meetingMinutes / maxScaleMinutes) * 100))
                : 0;
            const isHovered = hoveredDayIndex === i;

            return (
              <div
                key={d.dateKey}
                onMouseEnter={() => setHoveredDayIndex(i)}
                onMouseLeave={() => setHoveredDayIndex(null)}
                className="flex flex-col items-center h-full relative group cursor-pointer"
              >
                {/* Interactive Tooltip on Hover */}
                {isHovered && (
                  <div className="absolute -top-12 z-30 bg-[#181D1A] text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-elevated whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-95">
                    <div className="font-bold">
                      {d.fullDayName}, {d.dateLabel}
                    </div>
                    <div className="text-[#FF9D9D]">
                      {d.meetingMinutes > 0
                        ? `${formatDuration(d.meetingMinutes)} • ${d.meetingCount} meeting${
                            d.meetingCount > 1 ? "s" : ""
                          }`
                        : "0m • No meetings"}
                    </div>
                    {/* Tooltip triangle */}
                    <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-[#181D1A] rotate-45" />
                  </div>
                )}

                {/* Explicit Height Track Container (Ensures CSS percentage heights compute properly) */}
                <div className="w-full flex-1 flex items-end justify-center">
                  <div className="w-8 sm:w-11 h-full flex items-end justify-center relative">
                    {barHeightPct > 0 ? (
                      <div
                        style={{ height: `${barHeightPct}%` }}
                        className={`w-full bg-[#E85555] rounded-t-lg transition-all duration-300 shadow-2xs ${
                          d.isToday ? "ring-2 ring-[#181D1A]/20" : ""
                        } group-hover:bg-[#D64444]`}
                      >
                        {/* Optional bar top highlight */}
                        <div className="w-full h-1 bg-white/20 rounded-t-lg" />
                      </div>
                    ) : (
                      /* Zero-data day: clean baseline indicator */
                      <div className="w-full h-[2px] bg-[#EAE4DC] rounded-full" />
                    )}
                  </div>
                </div>

                {/* Day label below */}
                <div className="mt-3 text-center select-none">
                  <div
                    className={`text-xs font-bold ${
                      d.isToday ? "text-[#E85555]" : "text-[#181D1A]"
                    }`}
                  >
                    {d.dayName}
                  </div>
                  <div className="text-[10px] font-medium text-[#8C948F]">
                    {d.dateLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Unified Analytical KPI Metric Blocks (Exact same dataset as graph) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2 border-t border-[#EAE4DC]">
        {/* Metric 1: Total Meeting Time */}
        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE4DC]/80">
          <div className="flex items-center gap-1.5 text-[#C46237] mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold text-[#6B7280]">Total Meeting Time</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-[#181D1A]">
            {formatDuration(weekTotals.totalMeetingMinutes)}
          </div>
          <div className="text-[10px] font-medium text-[#6B7280] mt-0.5">
            {weekTotals.totalMeetingMinutes > 0 ? "Across selected week" : "No meetings"}
          </div>
        </div>

        {/* Metric 2: Average Meeting Duration */}
        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE4DC]/80">
          <div className="flex items-center gap-1.5 text-[#E85555] mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold text-[#6B7280]">Avg Duration</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-[#181D1A]">
            {weekTotals.avgDuration} mins
          </div>
          <div className="text-[10px] font-medium text-[#6B7280] mt-0.5">
            {weekTotals.totalMeetings > 0 ? "Per scheduled session" : "0 meetings"}
          </div>
        </div>

        {/* Metric 3: Total Meetings */}
        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE4DC]/80">
          <div className="flex items-center gap-1.5 text-[#E85555] mb-1">
            <Users className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold text-[#6B7280]">Total Meetings</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-[#181D1A]">
            {weekTotals.totalMeetings} session{weekTotals.totalMeetings === 1 ? "" : "s"}
          </div>
          <div className="text-[10px] font-medium text-[#6B7280] mt-0.5">
            Confirmed on calendar
          </div>
        </div>

        {/* Metric 4: Peak Meeting Day & Duration */}
        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EAE4DC]/80">
          <div className="flex items-center gap-1.5 text-[#1D7B4B] mb-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold text-[#6B7280]">Peak Day</span>
          </div>
          <div className="text-base sm:text-lg font-bold text-[#181D1A]">
            {weekTotals.peakDayName}
          </div>
          <div className="text-[10px] font-medium text-[#6B7280] mt-0.5">
            {weekTotals.peakDayMinutes > 0
              ? `${formatDuration(weekTotals.peakDayMinutes)} scheduled`
              : "0m"}
          </div>
        </div>
      </div>

      {/* 5. Footer Insight / Truthful Summary */}
      <div className="flex items-center justify-between p-3 sm:p-3.5 bg-[#FFF9ED] border border-[#FBE5B0] rounded-xl">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="w-7 h-7 rounded-lg bg-[#FDE68A] text-[#B45309] flex items-center justify-center shrink-0">
            <Lightbulb className="w-4 h-4 text-[#B45309]" />
          </div>
          <p className="text-xs font-semibold text-[#181D1A] truncate">
            <span className="font-bold">Weekly Insight:</span>{" "}
            {weekTotals.totalMeetings > 0
              ? `${weekTotals.peakFullDayName} has the highest meeting load this week (${formatDuration(
                  weekTotals.peakDayMinutes
                )} across ${
                  dailyData.find((d) => d.dayName === weekTotals.peakDayName)?.meetingCount || 0
                } sessions).`
              : "No meetings scheduled for this week in your Google Calendar."}
          </p>
        </div>
        <Link
          to="/analytics"
          className="text-xs font-bold text-[#E85555] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>View Analytics</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
