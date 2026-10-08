import React from 'react';
import { Video, Calendar, Clock, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Users, Quote } from 'lucide-react';
import { FollowUpSchedulingResult } from '../../types';
import { Button } from '../ui/Button';

interface FollowUpSchedulingCardProps {
  scheduling?: FollowUpSchedulingResult;
}

export const FollowUpSchedulingCard: React.FC<FollowUpSchedulingCardProps> = ({ scheduling }) => {
  if (!scheduling) return null;

  const {
    status,
    scheduledMeetUrl,
    scheduledTitle,
    requestedTime,
    actualStartTime,
    actualEndTime,
    conflictDetected,
    conflictReason,
    attendees = [],
    sourceText,
    sourceTimestamp,
    confidence
  } = scheduling;

  if (status === 'NO_INTENT_DETECTED') {
    return (
      <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-subtle">
        <div className="flex items-center gap-2.5 text-[#6B7280]">
          <div className="w-7 h-7 rounded-lg bg-[#FAF7F2] border border-[#EAE4DC] flex items-center justify-center text-[#8C948F]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#181D1A]">AI Follow-Up Scheduling</h4>
            <p className="text-xs text-[#6B7280] mt-0.5">
              No follow-up meeting was requested or agreed upon in the transcript.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Format date and time
  const formatDateTime = (startIso?: string, endIso?: string) => {
    if (!startIso) return 'Date TBD';
    const s = new Date(startIso);
    const dateStr = s.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const startTimeStr = s.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    if (!endIso) return `${dateStr} • ${startTimeStr}`;
    const e = new Date(endIso);
    const endTimeStr = e.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} • ${startTimeStr} - ${endTimeStr}`;
  };

  const formatTimeOnly = (isoOrTime?: string) => {
    if (!isoOrTime) return '';
    if (isoOrTime.includes('T')) {
      const d = new Date(isoOrTime);
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    // HH:MM
    const [h, m] = isoOrTime.split(':');
    let hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    if (hours > 12) hours -= 12;
    if (hours === 0) hours = 12;
    return `${hours}:${m || '00'} ${ampm}`;
  };

  const isConflictResolved = status === 'CONFLICT_RESOLVED' || conflictDetected;

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-6 shadow-subtle space-y-5">
      {/* Header with Title and Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE4DC]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFF1EF] border border-[#FFD4CF] flex items-center justify-center text-[#E85555]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#181D1A] tracking-tight">
                AI AUTOMATIC FOLLOW-UP SCHEDULING
              </h3>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#6B7280] border border-[#EAE4DC]">
                Zero-Click
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Detected from transcript, verified against Google Calendar, and scheduled automatically
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isConflictResolved ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FFF6F0] text-[#C46237] border border-[#FFE3D5]">
              <AlertCircle className="w-3.5 h-3.5" />
              Conflict Resolved & Rescheduled
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F0FAF4] text-[#1D7B4B] border border-[#D3F5E2]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Auto-Scheduled
            </span>
          )}
        </div>
      </div>

      {/* Main Follow-up Overview Card */}
      <div className="bg-[#FAF7F2] rounded-xl border border-[#EAE4DC] p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#8C948F] uppercase tracking-wider">
              Follow-Up Session
            </span>
            <h4 className="text-base font-extrabold text-[#181D1A]">
              {scheduledTitle || 'Follow-up Meeting'}
            </h4>
            <div className="flex items-center gap-2 text-xs text-[#181D1A] pt-1">
              <Calendar className="w-4 h-4 text-[#E85555]" />
              <span className="font-semibold">
                {formatDateTime(actualStartTime, actualEndTime)}
              </span>
            </div>
          </div>

          {/* Google Meet Join CTA */}
          {scheduledMeetUrl && (
            <div className="shrink-0">
              <a href={scheduledMeetUrl} target="_blank" rel="noreferrer">
                <Button size="sm" variant="coral" className="gap-2 text-xs shadow-sm px-4">
                  <Video className="w-3.5 h-3.5" />
                  Join Google Meet
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Conflict Resolution Banner (if time shifted) */}
        {isConflictResolved && (
          <div className="bg-white rounded-lg border border-[#FFE3D5] p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#C46237] font-semibold">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                Requested: <span className="underline decoration-dotted">{formatTimeOnly(requestedTime)}</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-[#8C948F]" />
              <span className="bg-[#FFF1EF] px-2 py-0.5 rounded text-[#E85555] font-bold">
                Moved to: {formatTimeOnly(actualStartTime)}
              </span>
              <span className="text-[11px] text-[#6B7280] font-normal hidden md:inline">
                (mutual availability)
              </span>
            </div>
            {conflictReason && (
              <span className="text-[11px] text-[#6B7280] italic">
                {conflictReason}
              </span>
            )}
          </div>
        )}

        {/* Invited Attendees */}
        {attendees.length > 0 && (
          <div className="pt-2 border-t border-[#EAE4DC] flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-[#6B7280] flex items-center gap-1 mr-1">
              <Users className="w-3.5 h-3.5 text-[#8C948F]" />
              Attendees ({attendees.length}):
            </span>
            {attendees.map((email, idx) => (
              <span
                key={idx}
                className="text-[11px] font-medium bg-white text-[#181D1A] px-2.5 py-0.5 rounded-md border border-[#EAE4DC]"
              >
                {email}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Transcript Evidence Quote */}
      {sourceText && (
        <div className="bg-[#FFFDFB] rounded-xl border border-[#EAE4DC] p-4 flex items-start gap-3">
          <Quote className="w-4 h-4 text-[#E85555] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-medium text-[#181D1A] italic leading-relaxed">
              &ldquo;{sourceText}&rdquo;
            </p>
            <div className="flex items-center gap-3 text-[11px] text-[#8C948F] pt-0.5">
              {sourceTimestamp && (
                <span className="font-mono bg-[#FAF7F2] px-1.5 py-0.5 rounded border border-[#EAE4DC] text-[#6B7280]">
                  Spoken at {sourceTimestamp}
                </span>
              )}
              {confidence && (
                <span>
                  Confidence: <strong className="capitalize text-[#181D1A]">{confidence}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
