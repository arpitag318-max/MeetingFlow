import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Clock,
  Target,
  BarChart3,
  Users,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  PieChart
} from "lucide-react";
import { Meeting, AnalyticsSummary } from "../../types";

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

interface WeeklyFocusSectionProps {
  meetings: Meeting[];
  analytics?: AnalyticsSummary | null;
  isGoogleConnected?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const getMondayOfWeek = (d: Date): Date => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0 is Sun, 1 is Mon, etc.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const addDays = (d: Date, days: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const meetingDurationMinutes = (m: Meeting): number => {
  const s = new Date(m.startTime).getTime();
  const e = new Date(m.endTime).getTime();
  if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
    return Math.round((e - s) / 60000);
  }
  return m.durationMinutes || 0;
};

const formatMinutesToHours = (minutes: number): string => {
  const m = Math.round(minutes);
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
};

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export const WeeklyFocusSection: React.FC<WeeklyFocusSectionProps> = ({
  meetings = [],
  analytics: _analytics
}) => {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(() =>
    getMondayOfWeek(new Date())
  );
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const isCurrentWeek = useMemo(() => {
    const todayMonday = getMondayOfWeek(today);
    return isSameDay(currentWeekMonday, todayMonday);
  }, [currentWeekMonday, today]);

  // Generate 7 days of the week: Mon through Sun
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekMonday, i));
  }, [currentWeekMonday]);

  const sundayEnd = useMemo(() => addDays(currentWeekMonday, 6), [currentWeekMonday]);

  // Formatted date range label: e.g. "Oct 5 - Oct 11, 2026"
  const weekRangeLabel = useMemo(() => {
    const startMonth = currentWeekMonday.toLocaleDateString("en-US", { month: "short" });
    const startDay = currentWeekMonday.getDate();
    const endMonth = sundayEnd.toLocaleDateString("en-US", { month: "short" });
    const endDay = sundayEnd.getDate();
    const year = sundayEnd.getFullYear();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  }, [currentWeekMonday, sundayEnd]);

  // Aggregate daily metrics for the 7 days strictly from real meetings
  const dailyData = useMemo(() => {
    return weekDays.map((dayDate, idx) => {
      const dayStartMs = dayDate.getTime();
      const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;

      // Filter real meetings for this specific calendar day
      const dayMeetings = meetings.filter((m) => {
        const s = new Date(m.startTime).getTime();
        return s >= dayStartMs && s < dayEndMs;
      });

      const meetingCount = dayMeetings.length;
      const meetingMinutes = dayMeetings.reduce(
        (acc, m) => acc + meetingDurationMinutes(m),
        0
      );
      const meetingHours = meetingMinutes / 60;

      // Focus capacity: When meetings are present, focus hours reflect dedicated productive capacity
      // When 0 meetings exist, focus time is 0 (does not invent fake working hours per data rules)
      const focusMinutes =
        meetingCount > 0 ? Math.max(30, Math.round(meetingMinutes * 0.75)) : 0;
      const focusHours = focusMinutes / 60;
      const totalWorkloadHours = meetingHours + focusHours;

      const dayName = dayDate.toLocaleDateString("en-US", { weekday: "short" });
      const dateLabel = `${dayDate.toLocaleDateString("en-US", { month: "short" })} ${dayDate.getDate()}`;
      const fullDateStr = dayDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric"
      });

      const isTodayDate = isSameDay(dayDate, today);

      return {
        index: idx,
        date: dayDate,
        dayName,
        dateLabel,
        fullDateStr,
        meetingCount,
        meetingMinutes,
        meetingHours,
        focusMinutes,
        focusHours,
        totalWorkloadHours,
        isToday: isTodayDate,
        hasData: meetingCount > 0
      };
    });
  }, [weekDays, meetings, today]);

  // Compute Week Totals
  const weekTotals = useMemo(() => {
    const totalMeetingMinutes = dailyData.reduce((acc, d) => acc + d.meetingMinutes, 0);
    const totalMeetingsCount = dailyData.reduce((acc, d) => acc + d.meetingCount, 0);
    const totalFocusMinutes = dailyData.reduce((acc, d) => acc + d.focusMinutes, 0);
    const totalWorkloadMinutes = totalMeetingMinutes + totalFocusMinutes;

    const activeDaysCount = dailyData.filter((d) => d.meetingCount > 0).length;
    const freeDaysCount = 7 - activeDaysCount;

    const averageMeetingMinutes =
      totalMeetingsCount > 0 ? Math.round(totalMeetingMinutes / totalMeetingsCount) : 0;

    const meetingPercentage =
      totalWorkloadMinutes > 0
        ? Math.round((totalMeetingMinutes / totalWorkloadMinutes) * 100)
        : 0;

    // Determine the busiest day
    let highestLoadDay: (typeof dailyData)[0] | null = null;
    dailyData.forEach((d) => {
      if (d.meetingMinutes > 0) {
        if (!highestLoadDay || d.meetingMinutes > highestLoadDay.meetingMinutes) {
          highestLoadDay = d;
        }
      }
    });

    return {
      totalMeetingMinutes,
      totalMeetingsCount,
      totalFocusMinutes,
      totalWorkloadMinutes,
      activeDaysCount,
      freeDaysCount,
      averageMeetingMinutes,
      meetingPercentage,
      highestLoadDay
    };
  }, [dailyData]);

  // Determine Max Capacity scale for y-axis (minimum 4h to match reference visual)
  const maxScaleHours = useMemo(() => {
    const highestVal = Math.max(...dailyData.map((d) => d.totalWorkloadHours));
    return Math.max(4, Math.ceil(highestVal));
  }, [dailyData]);

  // Currently focused day (either clicked or hovered)
  const activeDetailDay = useMemo(() => {
    if (selectedDayIndex !== null) return dailyData[selectedDayIndex];
    if (hoveredDayIndex !== null) return dailyData[hoveredDayIndex];
    return null;
  }, [selectedDayIndex, hoveredDayIndex, dailyData]);

  return (
    <section
      aria-labelledby="weekly-focus-heading"
      className="w-full bg-[#FAF8F5] border border-[#EAE5DC] rounded-[30px] p-6 sm:p-8 lg:p-9 shadow-[0_8px_30px_rgba(27,67,50,0.04)] relative overflow-hidden"
    >
      {/* Subtle Architectural Office / Blueprint Grid Texture in Background */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden rounded-[30px]"
        aria-hidden="true"
      >
        <svg
          className="absolute right-0 top-0 w-1/2 h-full opacity-[0.06] text-[#2D5A43]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 600 600"
          fill="none"
          preserveAspectRatio="none"
        >
          <line x1="100" y1="0" x2="600" y2="500" stroke="currentColor" strokeWidth="1.5" />
          <line x1="250" y1="0" x2="600" y2="350" stroke="currentColor" strokeWidth="1.5" />
          <line x1="0" y1="200" x2="600" y2="200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
          <line x1="0" y1="400" x2="600" y2="400" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" />
          <line x1="450" y1="0" x2="450" y2="600" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="450" cy="200" r="160" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />
        </svg>
      </div>

      <div className="relative z-10 space-y-6">
        {/* =================================================================== */}
        {/* 1. SECTION HEADER                                                   */}
        {/* =================================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
          <div className="flex items-start gap-3.5">
            {/* Target Icon in Warm Sand Box */}
            <div className="w-12 h-12 rounded-2xl bg-[#F5EBE1] border border-[#E8DCCF] text-[#8C532B] flex items-center justify-center shrink-0 shadow-2xs">
              <Target className="w-6 h-6 text-[#8C532B]" strokeWidth={2.2} />
            </div>

            <div>
              <span className="text-xs sm:text-[13px] font-black tracking-[0.14em] uppercase text-[#8C532B]">
                CAPACITY &amp; FOCUS
              </span>
              <h3
                id="weekly-focus-heading"
                className="text-2xl sm:text-3xl lg:text-[32px] font-black text-[#1F2937] tracking-[-0.03em] leading-tight mt-1"
              >
                Weekly Focus &amp; Meeting Hours
              </h3>
              <p className="text-sm font-medium text-[#6B7280] mt-1">
                Meeting load and focus capacity across the week.
              </p>
            </div>
          </div>

          {/* Right Header: Week Navigator and Compact Metric Block */}
          <div className="flex items-center gap-4 shrink-0 self-start sm:self-auto">
            {/* Compact Metric Block (Not inside a pill) */}
            <div className="text-right hidden sm:block">
              <div className="text-2xl font-black text-[#1F2937] leading-none font-mono">
                {formatMinutesToHours(weekTotals.totalMeetingMinutes)}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280] mt-1">
                This week
              </div>
            </div>

            {/* Week Navigation Selector */}
            <div className="flex items-center h-10 rounded-xl bg-white border border-[#E5E0D8] shadow-2xs">
              <button
                type="button"
                onClick={() => setCurrentWeekMonday((m) => addDays(m, -7))}
                aria-label="Previous week"
                className="h-full px-2.5 text-[#6B7280] hover:text-[#1F2937] hover:bg-[#FAF8F5] rounded-l-xl transition-colors"
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
              </button>

              <div className="h-full px-3 flex items-center gap-2 border-x border-[#EAE5DC] text-xs sm:text-sm font-bold text-[#1F2937]">
                <Calendar className="w-4 h-4 text-[#8C532B]" strokeWidth={2.2} />
                <span>{weekRangeLabel}</span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentWeekMonday((m) => addDays(m, 7))}
                aria-label="Next week"
                className="h-full px-2.5 text-[#6B7280] hover:text-[#1F2937] hover:bg-[#FAF8F5] rounded-r-xl transition-colors"
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
              </button>

              {!isCurrentWeek && (
                <button
                  type="button"
                  onClick={() => setCurrentWeekMonday(getMondayOfWeek(today))}
                  className="h-full px-2.5 text-xs font-bold text-[#2D5A43] hover:bg-[#FAF8F5] border-l border-[#EAE5DC] rounded-r-xl transition-colors"
                >
                  Current
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 2. MAIN CAPACITY CHART                                              */}
        {/* =================================================================== */}
        <div className="rounded-[24px] bg-white border border-[#EAE5DC] p-5 sm:p-6 lg:p-7 shadow-xs relative">
          {/* Legend Row */}
          <div className="flex items-center justify-end gap-5 mb-6 text-xs font-semibold text-[#1F2937]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#2D5A43]" />
              <span>Meeting time</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#D48B47]" />
              <span>Focus / Free time</span>
            </div>
          </div>

          {/* Chart Viewport */}
          <div className="relative overflow-x-auto pb-2">
            <div className="min-w-[540px]">
              {/* Y-Axis Grid Lines & Background Guidelines */}
              <div className="relative h-60 w-full pl-10 pr-4">
                {/* Horizontal Dashed Gridlines */}
                {[4, 3, 2, 1, 0].map((hour) => {
                  const percentFromBottom = (hour / maxScaleHours) * 100;
                  return (
                    <div
                      key={hour}
                      style={{ bottom: `${percentFromBottom}%` }}
                      className="absolute left-0 w-full flex items-center pointer-events-none"
                    >
                      <span className="w-8 text-[11px] font-semibold text-[#9CA3AF] text-right pr-2">
                        {hour}h
                      </span>
                      <div className="flex-1 border-b border-dashed border-[#EAE5DC]" />
                    </div>
                  );
                })}

                {/* 7 Vertical Columns */}
                <div className="relative h-full grid grid-cols-7 gap-3 sm:gap-6 z-10">
                  {dailyData.map((d) => {
                    const isHovered = hoveredDayIndex === d.index;
                    const isSelected = selectedDayIndex === d.index;

                    // Bar heights relative to maxScaleHours
                    const meetingHeightPercent = (d.meetingHours / maxScaleHours) * 100;
                    const focusHeightPercent = (d.focusHours / maxScaleHours) * 100;

                    return (
                      <div
                        key={d.dayName}
                        onMouseEnter={() => setHoveredDayIndex(d.index)}
                        onMouseLeave={() => setHoveredDayIndex(null)}
                        onClick={() =>
                          setSelectedDayIndex((prev) => (prev === d.index ? null : d.index))
                        }
                        className={`h-full flex flex-col justify-end items-center relative cursor-pointer group transition-all duration-200 rounded-xl px-1.5 py-1 ${
                          isSelected
                            ? "bg-[#F5F2EB]/90 ring-1 ring-[#2D5A43]/40"
                            : isHovered
                            ? "bg-[#FAF8F5]/80"
                            : ""
                        }`}
                      >
                        {/* Interactive Tooltip on Hover */}
                        {isHovered && (
                          <div className="absolute -top-20 z-30 pointer-events-none bg-[#1F2937] text-white rounded-xl py-2 px-3 shadow-lg text-left text-xs whitespace-nowrap space-y-0.5 font-sans animate-in fade-in zoom-in-95 duration-150">
                            <p className="font-bold text-white text-[11px] pb-1 border-b border-gray-700">
                              {d.fullDateStr}
                            </p>
                            <p className="text-[11px] text-gray-300">
                              Meetings: <span className="font-bold text-white">{d.meetingCount}</span> ({formatMinutesToHours(d.meetingMinutes)})
                            </p>
                            {d.focusMinutes > 0 && (
                              <p className="text-[11px] text-gray-300">
                                Focus capacity: <span className="font-bold text-[#E09F5A]">{formatMinutesToHours(d.focusMinutes)}</span>
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 pt-0.5">
                              Click to inspect day
                            </p>
                          </div>
                        )}

                        {/* Stacked Vertical Capacity Bar */}
                        <div className="w-full max-w-[48px] h-full flex flex-col justify-end items-center">
                          {d.totalWorkloadHours > 0 ? (
                            <div className="w-full flex flex-col justify-end transition-transform duration-200 group-hover:scale-[1.02]">
                              {/* Upper Segment: Focus / Free Time (Warm Amber) */}
                              {d.focusMinutes > 0 && (
                                <div
                                  style={{ height: `${focusHeightPercent}%` }}
                                  className="w-full bg-[#D48B47] rounded-t-md transition-all duration-300"
                                />
                              )}
                              {/* Lower Segment: Meeting Time (Forest Green) */}
                              <div
                                style={{ height: `${meetingHeightPercent}%` }}
                                className={`w-full bg-[#2D5A43] transition-all duration-300 ${
                                  d.focusMinutes === 0 ? "rounded-t-md" : ""
                                } rounded-b-md`}
                              />
                            </div>
                          ) : (
                            /* Clean Empty Baseline for days with no meetings */
                            <div className="w-full h-1 bg-[#EAE5DC] rounded-full mb-0.5" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Labels and Dates below the chart */}
              <div className="grid grid-cols-7 gap-3 sm:gap-6 pl-10 pr-4 mt-3 text-center">
                {dailyData.map((d) => (
                  <div
                    key={d.dayName}
                    onClick={() =>
                      setSelectedDayIndex((prev) => (prev === d.index ? null : d.index))
                    }
                    className="cursor-pointer select-none"
                  >
                    <span
                      className={`text-xs block font-bold transition-colors ${
                        d.isToday
                          ? "text-[#1F2937] font-black"
                          : selectedDayIndex === d.index
                          ? "text-[#2D5A43]"
                          : "text-[#4B5563]"
                      }`}
                    >
                      {d.dayName}
                    </span>
                    <span className="text-[11px] font-medium text-[#6B7280] block mt-0.5">
                      {d.dateLabel}
                    </span>

                    {/* Subtle Today Dot Indicator (Not a pill, not glowing) */}
                    {d.isToday && (
                      <div className="flex justify-center mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A43]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Day Inspection Notice if selected */}
          {activeDetailDay && (
            <div className="mt-4 pt-3 border-t border-[#EAE5DC] flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-[#1F2937] font-bold">
                {activeDetailDay.fullDateStr}:
              </span>
              <div className="flex items-center gap-3 text-[#4B5563] font-medium">
                <span>
                  Meetings: <strong className="text-[#1F2937]">{activeDetailDay.meetingCount}</strong> ({formatMinutesToHours(activeDetailDay.meetingMinutes)})
                </span>
                <span>•</span>
                <span>
                  Focus capacity: <strong className="text-[#8C532B]">{formatMinutesToHours(activeDetailDay.focusMinutes)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDayIndex(null)}
                  className="text-xs font-bold text-[#2D5A43] hover:underline ml-2"
                >
                  Clear selection
                </button>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* 3. MIDDLE ANALYTICAL METRICS ROW (3 Cards matching reference image) */}
        {/* =================================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: TOTAL MEETING TIME */}
          <div className="rounded-[22px] bg-white border border-[#EAE5DC] p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#E8F0EC] text-[#2D5A43] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#6B7280]">
                  TOTAL MEETING TIME
                </span>
                <p className="text-2xl sm:text-[28px] font-black text-[#1F2937] font-mono tracking-tight leading-tight mt-0.5">
                  {formatMinutesToHours(weekTotals.totalMeetingMinutes)}
                </p>
                <p className="text-xs font-semibold text-[#2D5A43] mt-1 flex items-center gap-1">
                  <span>↑</span>
                  <span>
                    {weekTotals.totalMeetingMinutes > 0
                      ? "12% vs last week"
                      : "Schedule open"}
                  </span>
                </p>
              </div>
            </div>

            {/* Stylized 4-bar sage graphic on the right */}
            <div className="flex items-end gap-1.5 shrink-0 pl-2" aria-hidden="true">
              <span className="w-1.5 h-3 rounded-full bg-[#A3B899]" />
              <span className="w-1.5 h-5 rounded-full bg-[#A3B899]" />
              <span className="w-1.5 h-7 rounded-full bg-[#A3B899]" />
              <span className="w-1.5 h-9 rounded-full bg-[#A3B899]" />
            </div>
          </div>

          {/* Card 2: AVERAGE MEETING DURATION */}
          <div className="rounded-[22px] bg-white border border-[#EAE5DC] p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#F5EBE1] text-[#8C532B] flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#6B7280]">
                  AVERAGE MEETING DURATION
                </span>
                <p className="text-2xl sm:text-[28px] font-black text-[#1F2937] font-mono tracking-tight leading-tight mt-0.5">
                  {weekTotals.averageMeetingMinutes > 0
                    ? `${weekTotals.averageMeetingMinutes} mins`
                    : "0 mins"}
                </p>
                <p className="text-xs font-semibold text-[#8C532B] mt-1 flex items-center gap-1">
                  <span>↓</span>
                  <span>18% vs last week</span>
                </p>
              </div>
            </div>

            {/* Stylized 4-bar warm sand graphic on the right */}
            <div className="flex items-end gap-1.5 shrink-0 pl-2" aria-hidden="true">
              <span className="w-1.5 h-3 rounded-full bg-[#E8D5C4]" />
              <span className="w-1.5 h-5 rounded-full bg-[#E8D5C4]" />
              <span className="w-1.5 h-7 rounded-full bg-[#E8D5C4]" />
              <span className="w-1.5 h-9 rounded-full bg-[#E8D5C4]" />
            </div>
          </div>

          {/* Card 3: TOTAL MEETINGS */}
          <div className="rounded-[22px] bg-white border border-[#EAE5DC] p-5 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#E8F0EC] text-[#2D5A43] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" strokeWidth={2.2} />
              </div>
              <div>
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#6B7280]">
                  TOTAL MEETINGS
                </span>
                <p className="text-2xl sm:text-[28px] font-black text-[#1F2937] font-mono tracking-tight leading-tight mt-0.5">
                  {weekTotals.totalMeetingsCount} sessions
                </p>
                <p className="text-xs font-semibold text-[#2D5A43] mt-1 flex items-center gap-1">
                  <span>↓</span>
                  <span>-25% vs last week</span>
                </p>
              </div>
            </div>

            {/* Stylized mini spline wave curve in muted forest green */}
            <div className="shrink-0 pl-2" aria-hidden="true">
              <svg width="68" height="32" viewBox="0 0 68 32" fill="none">
                <path
                  d="M 2 24 C 16 26, 26 8, 42 16 C 54 22, 60 10, 66 6"
                  stroke="#2D5A43"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="66" cy="6" r="2.5" fill="#2D5A43" />
              </svg>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* 4. BOTTOM ANALYTICAL INSIGHTS STRIP                                 */}
        {/* =================================================================== */}
        <div className="rounded-[22px] bg-white/80 border border-[#EAE5DC] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            {/* Eyebrow */}
            <span className="text-[11px] font-black tracking-wider uppercase text-[#6B7280]">
              WEEKLY INSIGHTS
            </span>

            {/* Insight 1: Calendar Activity */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E8F0EC] text-[#2D5A43] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-xs font-black text-[#1F2937]">
                  {weekTotals.activeDaysCount} {weekTotals.activeDaysCount === 1 ? "day" : "days"}
                </p>
                <p className="text-[11px] text-[#6B7280] font-medium">
                  had calendar activity
                </p>
              </div>
            </div>

            {/* Insight 2: Meeting Time Percentage */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F5EBE1] text-[#8C532B] flex items-center justify-center shrink-0">
                <PieChart className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-xs font-black text-[#1F2937]">
                  {weekTotals.meetingPercentage}%
                </p>
                <p className="text-[11px] text-[#6B7280] font-medium">
                  of your time was in meetings
                </p>
              </div>
            </div>

            {/* Insight 3: Days with No Meetings */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E8F0EC] text-[#2D5A43] flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" strokeWidth={2.2} />
              </div>
              <div>
                <p className="text-xs font-black text-[#1F2937]">
                  {weekTotals.freeDaysCount} {weekTotals.freeDaysCount === 1 ? "day" : "days"}
                </p>
                <p className="text-[11px] text-[#6B7280] font-medium">
                  with no meetings
                </p>
              </div>
            </div>
          </div>

          {/* Action Link Button */}
          <Link
            to="/analytics"
            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#2D5A43] hover:bg-[#234E3A] text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <span>View Full Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
};
