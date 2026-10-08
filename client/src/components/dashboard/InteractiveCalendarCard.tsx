import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Meeting } from "../../types";

interface InteractiveCalendarCardProps {
  meetings: Meeting[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

export const InteractiveCalendarCard: React.FC<InteractiveCalendarCardProps> = ({
  meetings,
  selectedDate,
  onSelectDate,
}) => {
  const [viewDate, setViewDate] = useState<Date>(() => new Date(selectedDate));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(today);
  };

  // Month name e.g. "October 2026"
  const monthYearLabel = viewDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Calculate days in month and starting weekday
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon...
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Map meetings to date string keys (YYYY-M-D)
  const meetingDateMap = new Set<string>();
  meetings.forEach((m) => {
    const d = new Date(m.startTime);
    if (!isNaN(d.getTime())) {
      meetingDateMap.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  });

  const isToday = (d: number, m: number, y: number) => {
    const today = new Date();
    return today.getDate() === d && today.getMonth() === m && today.getFullYear() === y;
  };

  const isSelected = (d: number, m: number, y: number) => {
    return (
      selectedDate.getDate() === d &&
      selectedDate.getMonth() === m &&
      selectedDate.getFullYear() === y
    );
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Grid dates construction
  const calendarCells = [];

  // Trailing days from prev month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i;
    const prevMonthIdx = month - 1;
    const targetDate = new Date(year, prevMonthIdx, dayNum);
    calendarCells.push({
      day: dayNum,
      month: prevMonthIdx,
      year: prevMonthIdx < 0 ? year - 1 : year,
      isCurrentMonth: false,
      dateObj: targetDate,
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const targetDate = new Date(year, month, d);
    calendarCells.push({
      day: d,
      month,
      year,
      isCurrentMonth: true,
      dateObj: targetDate,
    });
  }

  // Next month fill up to complete 35 or 42 cells
  const remainingCells = 35 - calendarCells.length;
  const fillCount = remainingCells >= 0 ? remainingCells : 42 - calendarCells.length;
  for (let d = 1; d <= fillCount; d++) {
    const nextMonthIdx = month + 1;
    const targetDate = new Date(year, nextMonthIdx, d);
    calendarCells.push({
      day: d,
      month: nextMonthIdx,
      year: nextMonthIdx > 11 ? year + 1 : year,
      isCurrentMonth: false,
      dateObj: targetDate,
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-subtle">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-bold text-[#181D1A]">
          {monthYearLabel}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#181D1A] hover:bg-[#FAF7F2] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            aria-label="Next month"
            className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#181D1A] hover:bg-[#FAF7F2] transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleGoToday}
            className="ml-1 px-2.5 py-1 text-xs font-semibold text-[#181D1A] bg-[#FAF7F2] border border-[#EAE4DC] hover:bg-[#F3ECE0] rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2 text-center">
        {weekdays.map((w) => (
          <span key={w} className="text-[11px] font-semibold text-[#8C948F]">
            {w}
          </span>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1.5 text-center">
        {calendarCells.map((cell, idx) => {
          const selected = isSelected(cell.day, cell.month, cell.year);
          const today = isToday(cell.day, cell.month, cell.year);
          const hasMeetings = meetingDateMap.has(`${cell.year}-${cell.month}-${cell.day}`);

          return (
            <button
              key={idx}
              onClick={() => onSelectDate(cell.dateObj)}
              className="flex flex-col items-center justify-center p-1 rounded-full group relative focus:outline-none"
            >
              <div
                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                  selected
                    ? "bg-[#E85555] text-white shadow-sm"
                    : today
                    ? "bg-[#FFF1EF] text-[#E85555] border border-[#FFD4CF]"
                    : cell.isCurrentMonth
                    ? "text-[#181D1A] group-hover:bg-[#FAF7F2]"
                    : "text-[#B3B9B4]"
                }`}
              >
                {cell.day}
              </div>

              {/* Event indicator dot */}
              <div className="h-1 flex items-center justify-center mt-0.5">
                {hasMeetings && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selected ? "bg-[#E85555]" : "bg-[#E85555]"
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
