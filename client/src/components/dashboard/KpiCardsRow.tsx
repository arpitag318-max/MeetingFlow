import React from "react";
import { Calendar, Clock, CheckSquare, FileText, ArrowUp, ArrowDown, Check, AlertCircle } from "lucide-react";
import { Meeting, UserTask, AnalyticsSummary } from "../../types";

interface KpiCardsRowProps {
  meetings: Meeting[];
  todayMeetings: Meeting[];
  tasks: UserTask[];
  selectedDate?: Date;
  onResetDateToToday?: () => void;
  analytics?: AnalyticsSummary | null;
}

export const KpiCardsRow: React.FC<KpiCardsRowProps> = ({
  meetings = [],
  todayMeetings = [],
  tasks = [],
  selectedDate,
  onResetDateToToday,
  analytics: _analytics,
}) => {
  // Check if selected date is today
  const isSelectedToday = React.useMemo(() => {
    if (!selectedDate) return true;
    const today = new Date();
    return (
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()
    );
  }, [selectedDate]);

  const activeDate = selectedDate || new Date();
  const selectedDateLabel = activeDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // Calculate meetings for the active date (selected date or today)
  const activeDateMeetings = React.useMemo(() => {
    if (isSelectedToday) {
      return todayMeetings;
    }
    return meetings.filter((m) => {
      const d = new Date(m.startTime);
      return (
        d.getDate() === activeDate.getDate() &&
        d.getMonth() === activeDate.getMonth() &&
        d.getFullYear() === activeDate.getFullYear()
      );
    });
  }, [meetings, todayMeetings, activeDate, isSelectedToday]);

  // 1. MEETINGS COUNT
  const meetingsCount = activeDateMeetings.length;
  const googleMeetCount = activeDateMeetings.filter((m) => !!m.meetUrl).length;
  const calendarOnlyCount = meetingsCount - googleMeetCount;

  let meetingsSecondaryText = isSelectedToday
    ? "No meetings scheduled"
    : `No meetings on ${selectedDateLabel}`;

  if (meetingsCount > 0) {
    if (googleMeetCount > 0 && calendarOnlyCount > 0) {
      meetingsSecondaryText = `${googleMeetCount} Google Meet · ${calendarOnlyCount} Calendar event${calendarOnlyCount > 1 ? "s" : ""}`;
    } else if (googleMeetCount > 0) {
      meetingsSecondaryText = `${googleMeetCount} Google Meet${googleMeetCount > 1 ? "s" : ""}`;
    } else {
      meetingsSecondaryText = `${calendarOnlyCount} Calendar event${calendarOnlyCount > 1 ? "s" : ""}`;
    }
  }

  // Historical meeting comparison (strictly calculated from actual previous week same day)
  const prevWeekSameDay = new Date(activeDate);
  prevWeekSameDay.setDate(prevWeekSameDay.getDate() - 7);

  const prevWeekMeetings = meetings.filter((m) => {
    const d = new Date(m.startTime);
    return (
      d.getDate() === prevWeekSameDay.getDate() &&
      d.getMonth() === prevWeekSameDay.getMonth() &&
      d.getFullYear() === prevWeekSameDay.getFullYear()
    );
  });

  let meetingComparison: { text: string; isPositive: boolean } | null = null;
  if (prevWeekMeetings.length > 0) {
    const diff = meetingsCount - prevWeekMeetings.length;
    const pct = Math.round((diff / prevWeekMeetings.length) * 100);
    meetingComparison = {
      text: `${pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`} vs last week`,
      isPositive: pct >= 0,
    };
  }

  // 2. TOTAL MEETING TIME
  const totalMeetingMinutes = activeDateMeetings.reduce((acc, m) => {
    const start = new Date(m.startTime).getTime();
    const end = new Date(m.endTime).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return acc + Math.round((end - start) / 60000);
    }
    return acc + (m.durationMinutes || 0);
  }, 0);

  const formatDuration = (mins: number) => {
    if (mins <= 0) return "0m";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const timeSecondaryText =
    totalMeetingMinutes > 0
      ? isSelectedToday
        ? "Scheduled today"
        : `Scheduled for ${selectedDateLabel}`
      : "No time scheduled";

  // Historical time comparison
  const prevWeekMinutes = prevWeekMeetings.reduce((acc, m) => {
    const start = new Date(m.startTime).getTime();
    const end = new Date(m.endTime).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return acc + Math.round((end - start) / 60000);
    }
    return acc + (m.durationMinutes || 0);
  }, 0);

  let timeComparison: { text: string; isPositive: boolean } | null = null;
  if (prevWeekMinutes > 0) {
    const diff = totalMeetingMinutes - prevWeekMinutes;
    const pct = Math.round((diff / prevWeekMinutes) * 100);
    timeComparison = {
      text: `${pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`} vs last week`,
      isPositive: pct >= 0,
    };
  }

  // 3. ACTION ITEMS
  const openTasksCount = tasks.filter((t) => t.status !== "COMPLETED").length;
  const completedMeetingsCount = meetings.filter((m) => m.status === "COMPLETED").length;

  let tasksSecondaryText = "No action items";
  if (completedMeetingsCount === 0 && openTasksCount === 0) {
    tasksSecondaryText = "No processed meetings yet";
  } else if (openTasksCount === 0) {
    tasksSecondaryText = "No action items";
  } else {
    tasksSecondaryText = `${openTasksCount} open action item${openTasksCount > 1 ? "s" : ""}`;
  }

  // 4. OVERDUE
  const overdueTasksCount = tasks.filter((t) => {
    if (t.status === "COMPLETED" || !t.dueDate) return false;
    return new Date(t.dueDate).getTime() < Date.now();
  }).length;

  const overdueSecondaryText = overdueTasksCount === 0 ? "All on track" : "Needs attention";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 relative z-10">
      {/* 1. Meetings Today / Selected Date */}
      <div className="bg-white rounded-2xl border border-[#EAE4DC] p-4.5 sm:p-5 shadow-subtle hover:shadow-card transition-all flex items-center justify-between">
        <div className="flex items-start gap-3.5 min-w-0 pr-2">
          <div className="w-11 h-11 rounded-xl bg-[#FFF1EF] border border-[#FFD4CF] text-[#E85555] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-[#E85555]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#6B7280]">
                {isSelectedToday ? "Meetings Today" : `Meetings (${selectedDateLabel})`}
              </span>
              {!isSelectedToday && onResetDateToToday && (
                <button
                  onClick={onResetDateToToday}
                  title="Return to today"
                  className="text-[10px] text-[#E85555] hover:underline font-semibold"
                >
                  (Today)
                </button>
              )}
            </div>
            <div className="text-2xl sm:text-[28px] font-bold text-[#181D1A] leading-tight mt-0.5 font-sans">
              {meetingsCount}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] truncate mt-1">
              {meetingsSecondaryText}
            </div>
            {meetingComparison && (
              <div
                className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${
                  meetingComparison.isPositive ? "text-[#E85555]" : "text-[#1D7B4B]"
                }`}
              >
                {meetingComparison.isPositive ? (
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                )}
                <span>{meetingComparison.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Subtle Data-Driven Status Badge (No fake trend bars) */}
        <div className="shrink-0 self-center pl-2">
          {meetingsCount > 0 ? (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FFF1EF] text-[#E85555] border border-[#FFD4CF]">
              {meetingsCount} session{meetingsCount > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF7F2] text-[#8C948F] border border-[#EAE4DC]">
              Clear
            </span>
          )}
        </div>
      </div>

      {/* 2. Total Meeting Time */}
      <div className="bg-white rounded-2xl border border-[#EAE4DC] p-4.5 sm:p-5 shadow-subtle hover:shadow-card transition-all flex items-center justify-between">
        <div className="flex items-start gap-3.5 min-w-0 pr-2">
          <div className="w-11 h-11 rounded-xl bg-[#FFF6F0] border border-[#FFE3D5] text-[#C46237] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#C46237]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#6B7280]">
              {isSelectedToday ? "Total Meeting Time" : `Meeting Time (${selectedDateLabel})`}
            </span>
            <div className="text-2xl sm:text-[28px] font-bold text-[#181D1A] leading-tight mt-0.5 font-sans">
              {formatDuration(totalMeetingMinutes)}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] truncate mt-1">
              {timeSecondaryText}
            </div>
            {timeComparison && (
              <div
                className={`flex items-center gap-1 text-[11px] font-semibold mt-1 ${
                  timeComparison.isPositive ? "text-[#E85555]" : "text-[#1D7B4B]"
                }`}
              >
                {timeComparison.isPositive ? (
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <ArrowDown className="w-3 h-3 stroke-[2.5]" />
                )}
                <span>{timeComparison.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Subtle Data-Driven Indicator */}
        <div className="shrink-0 self-center pl-2">
          {totalMeetingMinutes > 0 ? (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FFF6F0] text-[#C46237] border border-[#FFE3D5]">
              {formatDuration(totalMeetingMinutes)}
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF7F2] text-[#8C948F] border border-[#EAE4DC]">
              0m
            </span>
          )}
        </div>
      </div>

      {/* 3. Action Items */}
      <div className="bg-white rounded-2xl border border-[#EAE4DC] p-4.5 sm:p-5 shadow-subtle hover:shadow-card transition-all flex items-center justify-between">
        <div className="flex items-start gap-3.5 min-w-0 pr-2">
          <div className="w-11 h-11 rounded-xl bg-[#F0FAF4] border border-[#D3F5E2] text-[#1D7B4B] flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5 text-[#1D7B4B]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#6B7280]">Action Items</span>
            <div className="text-2xl sm:text-[28px] font-bold text-[#181D1A] leading-tight mt-0.5 font-sans">
              {openTasksCount}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] truncate mt-1">
              {tasksSecondaryText}
            </div>
          </div>
        </div>

        {/* Subtle Data-Driven Indicator */}
        <div className="shrink-0 self-center pl-2">
          {openTasksCount > 0 ? (
            <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#F0FAF4] text-[#1D7B4B] border border-[#D3F5E2]">
              {openTasksCount} open
            </span>
          ) : (
            <span className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF7F2] text-[#8C948F] border border-[#EAE4DC]">
              0 open
            </span>
          )}
        </div>
      </div>

      {/* 4. Overdue */}
      <div className="bg-white rounded-2xl border border-[#EAE4DC] p-4.5 sm:p-5 shadow-subtle hover:shadow-card transition-all flex items-center justify-between">
        <div className="flex items-start gap-3.5 min-w-0 pr-2">
          <div className="w-11 h-11 rounded-xl bg-[#FEF9EC] border border-[#FBE5B0] text-[#B45309] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-[#B45309]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-[#6B7280]">Overdue</span>
            <div className="text-2xl sm:text-[28px] font-bold text-[#181D1A] leading-tight mt-0.5 font-sans">
              {overdueTasksCount}
            </div>
            <div className="text-[11px] font-medium text-[#6B7280] truncate mt-1">
              {overdueSecondaryText}
            </div>
          </div>
        </div>

        {/* Subtle Data-Driven Indicator */}
        <div className="shrink-0 self-center pl-2">
          {overdueTasksCount === 0 ? (
            <div className="w-7 h-7 rounded-full bg-[#F0FAF4] border border-[#D3F5E2] text-[#1D7B4B] flex items-center justify-center">
              <Check className="w-4 h-4 stroke-[2.5]" />
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              <span>{overdueTasksCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
