import React from "react";
import { Link } from "react-router-dom";
import { Video, ArrowRight } from "lucide-react";
import { Meeting } from "../../types";

interface TodayScheduleCardProps {
  meetings: Meeting[];
  selectedDate: Date;
}

export const TodayScheduleCard: React.FC<TodayScheduleCardProps> = ({
  meetings,
  selectedDate,
}) => {
  // Filter meetings that occur on selectedDate
  const dayMeetings = meetings.filter((m) => {
    const d = new Date(m.startTime);
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.endTime).getTime());

  // Formatted date for header: "Mon, Oct 5, 2026"
  const dateHeader = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  const getDurationString = (m: Meeting) => {
    const s = new Date(m.startTime).getTime();
    const e = new Date(m.endTime).getTime();
    let mins = m.durationMinutes;
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
      mins = Math.round((e - s) / 60000);
    }
    if (!mins || mins <= 0) return "30 min";
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem === 0 ? `${hrs} hr` : `${hrs} hr ${rem}m`;
  };

  // Node colors matching the reference timeline
  const nodeColors = [
    { dot: "bg-[#E85555]", border: "border-[#FFD4CF]" }, // Coral
    { dot: "bg-[#D97706]", border: "border-[#FBE5B0]" }, // Amber
    { dot: "bg-[#1D7B4B]", border: "border-[#D3F5E2]" }, // Mint
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-subtle flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#EAE4DC]">
          <h3 className="text-base font-bold text-[#181D1A]">Today's Schedule</h3>
          <span className="text-xs font-medium text-[#6B7280]">{dateHeader}</span>
        </div>

        {/* Meeting List or Empty State */}
        {dayMeetings.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-[#FAF7F2] text-[#8C948F] flex items-center justify-center mx-auto mb-2">
              <Video className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#181D1A]">No meetings scheduled</p>
            <p className="text-[11px] text-[#6B7280] mt-1">
              Select another date or sync your Google Calendar.
            </p>
          </div>
        ) : (
          <div className="relative pt-4 space-y-5">
            {/* Continuous Vertical Timeline Line */}
            <div
              className="absolute left-[3px] top-6 bottom-6 w-[2px] bg-[#EAE4DC] -z-0"
              aria-hidden="true"
            />

            {dayMeetings.map((m, idx) => {
              const nodeColor = nodeColors[idx % nodeColors.length];
              const joinUrl = m.meetUrl;
              const participants = m.participants || [];
              const visibleParticipants = participants.slice(0, 3);
              const extraCount = participants.length > 3 ? participants.length - 3 : 0;

              return (
                <div key={m.id} className="relative flex items-start gap-3.5 z-10">
                  {/* Timeline Node Dot */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${nodeColor.dot} ring-4 ring-white shrink-0 mt-1.5`}
                  />

                  {/* Time column */}
                  <div className="w-16 shrink-0 text-left">
                    <div className="text-xs font-bold text-[#181D1A] leading-tight">
                      {formatTime(m.startTime)}
                    </div>
                    <div className="text-[11px] font-medium text-[#8C948F] leading-tight">
                      {formatTime(m.endTime)}
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        to={`/meetings/${m.id}`}
                        className="text-xs font-bold text-[#181D1A] hover:text-[#E85555] transition-colors truncate block leading-tight"
                      >
                        {m.title}
                      </Link>
                      {(m.title.toLowerCase().startsWith('follow-up') ||
                        (m.followUpScheduling &&
                          (m.followUpScheduling.status === 'SCHEDULED' ||
                            m.followUpScheduling.status === 'CONFLICT_RESOLVED'))) && (
                        <span className="text-[9px] font-bold text-[#1D7B4B] bg-[#F0FAF4] px-1.5 py-0.5 rounded border border-[#D3F5E2]">
                          Auto Follow-Up
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      {getDurationString(m)} • {m.meetUrl ? "Google Meet" : "Meeting"}
                    </p>

                    {/* Participant Avatars */}
                    {visibleParticipants.length > 0 && (
                      <div className="flex items-center -space-x-1 mt-2">
                        {visibleParticipants.map((p, pIdx) => (
                          <div
                            key={p.id || pIdx}
                            title={p.name}
                            className="w-5 h-5 rounded-full bg-[#E5A93C] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {extraCount > 0 && (
                          <span className="text-[10px] font-semibold text-[#8C948F] pl-2">
                            +{extraCount}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Join Button */}
                  <div className="shrink-0 self-center">
                    {joinUrl ? (
                      <a
                        href={joinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-[#E85555] hover:bg-[#D64444] rounded-lg shadow-2xs border border-[#DC4242] transition-colors"
                      >
                        Join
                      </a>
                    ) : (
                      <Link
                        to={`/meetings/${m.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-[#181D1A] bg-[#FAF7F2] hover:bg-[#EAE4DC] border border-[#EAE4DC] rounded-lg transition-colors"
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

      {/* View Full Schedule Button matching reference */}
      <div className="mt-5 pt-3 border-t border-[#EAE4DC]">
        <Link
          to="/meetings"
          className="w-full py-2.5 px-4 rounded-xl bg-[#FFF1EF] hover:bg-[#FFEAE7] border border-[#FFD4CF] text-[#E85555] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>View Full Schedule</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
