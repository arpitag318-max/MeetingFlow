import React from "react";
import { Meeting } from "../../types";
import { Calendar as CalendarIcon } from "lucide-react";

interface MiniCalendarProps {
  upcomingMeetings?: Meeting[];
  className?: string;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  upcomingMeetings = [],
  className = ""
}) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const currentDay = now.getDate();

  const monthName = now.toLocaleString("en-US", { month: "long" }).toUpperCase();

  // Calculate first day of month (Monday-based: 0=Mon, 6=Sun)
  const firstDay = new Date(year, month, 1);
  const startingDayIndex = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Find meeting days in current month
  const meetingDays = new Set(
    upcomingMeetings
      .filter((m) => {
        try {
          const d = new Date(m.startTime);
          return d.getMonth() === month && d.getFullYear() === year;
        } catch {
          return false;
        }
      })
      .map((m) => new Date(m.startTime).getDate())
  );

  const days = [];
  // Leading empty slots
  for (let i = 0; i < startingDayIndex; i++) {
    days.push(null);
  }
  // Days of month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className={`bg-white/95 rounded-2xl border border-[#BFDBFE] p-4 shadow-xs select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#BFDBFE]/80">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-3.5 h-3.5 text-[#1D4ED8]" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-[#0F1715]">
            {monthName} {year}
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1D4ED8]/10 text-[#1D4ED8] border border-[#1D4ED8]/20 font-mono">
          TODAY: {currentDay}
        </span>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekdays.map((w, idx) => (
          <span key={idx} className="text-[10px] font-bold text-secondary/70">
            {w}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="w-7 h-7" />;
          }

          const isToday = day === currentDay;
          const hasMeeting = meetingDays.has(day);

          return (
            <div
              key={`day-${day}`}
              className={`w-7 h-7 mx-auto rounded-lg flex flex-col items-center justify-center relative text-xs transition-all ${
                isToday
                  ? "bg-[#1D4ED8] text-white font-bold shadow-xs"
                  : hasMeeting
                  ? "bg-[#1D4ED8]/10 text-[#0F1715] font-bold hover:bg-[#1D4ED8]/20"
                  : "text-[#0F1715]/80 hover:bg-black/5 font-medium"
              }`}
            >
              <span>{day}</span>
              {hasMeeting && !isToday && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[#1D4ED8]" />
              )}
              {isToday && hasMeeting && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
