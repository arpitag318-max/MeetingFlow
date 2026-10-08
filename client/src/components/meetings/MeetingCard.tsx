import React from 'react';
import { Link } from 'react-router-dom';
import { Video, Clock, Users, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { Meeting } from '../../types';
import { MeetingStatusBadge } from './MeetingStatusBadge';
import { formatShortDate, formatTimeRange, formatDuration } from '../../utils/formatters';
import { Button } from '../ui/Button';

interface MeetingCardProps {
  meeting: Meeting;
  onProcess?: (id: string) => void;
  isProcessing?: boolean;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  onProcess,
  isProcessing
}) => {
  const isCompleted = meeting.status === 'COMPLETED';
  const actionItemCount = meeting.actionItems?.length || 0;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 hover:border-[#E85555]/30 hover:shadow-card transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Card Header: Status & Duration */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <MeetingStatusBadge status={meeting.processingJob?.status || meeting.status} />
          <span className="text-xs text-[#6B7280] font-mono flex items-center gap-1 bg-[#FAF7F2] px-2.5 py-1 rounded-full border border-[#EAE4DC]">
            <Clock className="w-3.5 h-3.5 text-[#8C948F]" />
            {formatDuration(meeting.durationMinutes)}
          </span>
        </div>

        {/* Meeting Title */}
        <Link
          to={`/meetings/${meeting.id}`}
          className="block group-hover:text-[#E85555] transition-colors mb-2"
        >
          <h3 className="font-bold text-base text-[#181D1A] line-clamp-1 group-hover:underline decoration-[#EAE4DC]">
            {meeting.title}
          </h3>
        </Link>

        {/* Date & Time */}
        <p className="text-xs text-[#6B7280] mb-3">
          <span className="font-medium text-[#181D1A]">{formatShortDate(meeting.startTime)}</span>
          <span className="mx-1.5">•</span>
          <span>{formatTimeRange(meeting.startTime, meeting.endTime)}</span>
        </p>

        {/* Metadata: Attendees & Organizer */}
        <div className="flex items-center gap-3 text-xs text-[#6B7280] pt-2 border-t border-[#F0ECE4]">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#8C948F]" />
            <span>{meeting.participants.length} attendees</span>
          </div>
          <span className="text-[#EAE4DC]">•</span>
          <span className="truncate">Org: {meeting.organizerName.split(' ')[0]}</span>
        </div>
      </div>

      {/* Card Footer: Summary / Action Items or Quick Actions */}
      <div className="mt-4 pt-3 border-t border-[#F0ECE4] flex items-center justify-between gap-2">
        {isCompleted ? (
          <>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1D7B4B] flex items-center gap-1.5 bg-[#F0FAF4] px-2.5 py-0.5 rounded-full border border-[#D3F5E2]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1D7B4B]" />
                {actionItemCount} actions
              </span>
            </div>
            <Link
              to={`/meetings/${meeting.id}`}
              className="text-xs font-semibold text-[#181D1A] hover:text-[#E85555] flex items-center gap-1 transition-colors"
            >
              View Analysis
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </>
        ) : (
          <>
            {meeting.meetUrl ? (
              <a
                href={meeting.meetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-[#181D1A] flex items-center gap-1.5 hover:text-[#E85555] hover:underline"
              >
                <Video className="w-3.5 h-3.5 text-[#E85555]" />
                Open Meet
              </a>
            ) : (
              <span className="text-xs text-[#6B7280]">Scheduled</span>
            )}

            {onProcess && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onProcess(meeting.id)}
                isLoading={isProcessing}
                className="text-xs py-1 px-3 border-[#FFD4CF] hover:border-[#E85555] text-[#E85555] bg-[#FFF1EF]"
              >
                <Sparkles className="w-3 h-3 text-[#E85555] mr-1" />
                Process AI
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
