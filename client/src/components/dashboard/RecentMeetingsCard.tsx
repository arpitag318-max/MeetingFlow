import React from "react";
import { Link } from "react-router-dom";
import { Video, Users, FileText, ChevronRight, ArrowRight } from "lucide-react";
import { Meeting } from "../../types";

interface RecentMeetingsCardProps {
  recentMeetings: Meeting[];
  allMeetings: Meeting[];
}

export const RecentMeetingsCard: React.FC<RecentMeetingsCardProps> = ({
  recentMeetings,
  allMeetings,
}) => {
  // If recent completed meetings are empty, pick past meetings from allMeetings
  const meetingsToShow = (() => {
    if (recentMeetings.length > 0) return recentMeetings.slice(0, 3);
    const past = allMeetings
      .filter((m) => new Date(m.startTime).getTime() < Date.now())
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 3);
    if (past.length > 0) return past;
    return allMeetings.slice(0, 3);
  })();

  const iconConfigs = [
    {
      bg: "bg-[#FFF1EF]",
      border: "border-[#FFD4CF]",
      color: "text-[#E85555]",
      icon: Video,
    },
    {
      bg: "bg-[#FFF6F0]",
      border: "border-[#FFE3D5]",
      color: "text-[#C46237]",
      icon: Users,
    },
    {
      bg: "bg-[#FFF1EF]",
      border: "border-[#FFD4CF]",
      color: "text-[#E85555]",
      icon: FileText,
    },
  ];

  const formatMeetingSub = (m: Meeting) => {
    const d = new Date(m.startTime);
    const dateStr = !isNaN(d.getTime())
      ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recent";
    const durationMins = m.durationMinutes || 30;
    const durationStr =
      durationMins >= 60 ? `${Math.round(durationMins / 60)} hr` : `${durationMins} min`;
    return `${dateStr} • ${durationStr}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-subtle space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#181D1A]">Recent Meetings</h3>
        <Link
          to="/meetings"
          className="text-xs font-bold text-[#E85555] hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* List */}
      {meetingsToShow.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#6B7280]">
          No recent meetings found.
        </div>
      ) : (
        <div className="space-y-3">
          {meetingsToShow.map((m, idx) => {
            const conf = iconConfigs[idx % iconConfigs.length];
            const Icon = conf.icon;

            return (
              <Link
                key={m.id}
                to={`/meetings/${m.id}`}
                className="flex items-center justify-between p-2 rounded-xl hover:bg-[#FAF7F2] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-9 h-9 rounded-xl ${conf.bg} border ${conf.border} ${conf.color} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-xs font-bold text-[#181D1A] group-hover:text-[#E85555] transition-colors truncate">
                        {m.title}
                      </p>
                      {m.followUpScheduling &&
                        (m.followUpScheduling.status === 'SCHEDULED' ||
                          m.followUpScheduling.status === 'CONFLICT_RESOLVED') && (
                          <span className="text-[9px] font-bold text-[#1D7B4B] bg-[#F0FAF4] px-1.5 py-0.5 rounded border border-[#D3F5E2] shrink-0">
                            Follow-Up Booked
                          </span>
                        )}
                    </div>
                    <p className="text-[11px] text-[#8C948F] mt-0.5">
                      {formatMeetingSub(m)}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#8C948F] group-hover:text-[#181D1A] transition-colors shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
