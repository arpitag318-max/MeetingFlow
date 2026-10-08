import React from "react";
import { Clock, CheckCircle2 } from "lucide-react";
import { Meeting } from "../../types";

interface TodayFocusCardProps {
  todayMeetings?: Meeting[];
  selectedDate?: Date;
  allMeetings?: Meeting[];
}

export const TodayFocusCard: React.FC<TodayFocusCardProps> = ({
  todayMeetings = [],
  selectedDate,
  allMeetings = [],
}) => {
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

  const activeMeetings = React.useMemo(() => {
    if (isSelectedToday) return todayMeetings;
    return allMeetings.filter((m) => {
      const d = new Date(m.startTime);
      return (
        d.getDate() === activeDate.getDate() &&
        d.getMonth() === activeDate.getMonth() &&
        d.getFullYear() === activeDate.getFullYear()
      );
    });
  }, [isSelectedToday, todayMeetings, allMeetings, activeDate]);

  // Calculate real meeting duration for this day
  const totalMeetingMins = activeMeetings.reduce((acc, m) => {
    const s = new Date(m.startTime).getTime();
    const e = new Date(m.endTime).getTime();
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
      return acc + Math.round((e - s) / 60000);
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

  const meetingCount = activeMeetings.length;
  const googleMeetCount = activeMeetings.filter((m) => !!m.meetUrl).length;

  // SVG circular dial indicator (scale proportional to 4h standard day baseline, max 100%)
  const baselineMaxMins = 240; // 4 hours
  const fillPercent = Math.min(100, Math.round((totalMeetingMins / baselineMaxMins) * 100));
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    totalMeetingMins > 0
      ? circumference - (fillPercent / 100) * circumference
      : circumference;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-subtle space-y-4">
      {/* Title */}
      <h3 className="text-sm font-bold text-[#181D1A]">
        {isSelectedToday ? "Today's Meeting Load" : `Meeting Load · ${selectedDateLabel}`}
      </h3>

      {/* Ring Gauge showing actual meeting time */}
      <div className="flex items-center gap-4 py-1">
        {/* Circular SVG Ring */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
            {/* Background track */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="#F0ECE4"
              strokeWidth="7"
              fill="transparent"
            />
            {/* Coral Load Arc */}
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="#E85555"
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold text-[#181D1A] leading-none">
              {formatDuration(totalMeetingMins)}
            </span>
            <span className="text-[10px] font-medium text-[#6B7280] mt-0.5">
              Scheduled
            </span>
          </div>
        </div>

        {/* Real Stats on the right */}
        <div className="space-y-1">
          <div className="text-xs text-[#6B7280] font-medium">
            {isSelectedToday ? "Today's Schedule" : `${selectedDateLabel} Schedule`}
          </div>
          <div className="text-base font-bold text-[#181D1A]">
            {meetingCount} session{meetingCount === 1 ? "" : "s"}
          </div>
          <div className="text-xs font-semibold text-[#E85555]">
            {googleMeetCount > 0 ? `${googleMeetCount} Google Meet` : "Calendar event"}
          </div>
        </div>
      </div>

      {/* Status banner strictly based on real calendar status */}
      {meetingCount === 0 ? (
        <div className="p-3 bg-[#F0FAF4] border border-[#D3F5E2] rounded-xl flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[#BBF1D2] text-[#1D7B4B] flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1D7B4B]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#1D7B4B]">
              {isSelectedToday ? "Calendar Clear Today" : `Calendar Clear (${selectedDateLabel})`}
            </p>
            <p className="text-[11px] text-[#2F7D5A] mt-0.5 leading-tight">
              {isSelectedToday
                ? "No meetings scheduled in your connected Google Calendar."
                : `No meetings scheduled for ${selectedDateLabel}.`}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl flex items-start gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[#FFF1EF] text-[#E85555] flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-[#E85555]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#181D1A]">
              {meetingCount} Meeting{meetingCount > 1 ? "s" : ""} on Schedule
            </p>
            <p className="text-[11px] text-[#6B7280] mt-0.5 leading-tight">
              Totaling {formatDuration(totalMeetingMins)} of scheduled conference time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
