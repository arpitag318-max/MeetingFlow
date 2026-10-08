import React from 'react';
import { Badge } from '../ui/Badge';
import { MeetingStatus, ProcessingStatus } from '../../types';

export const MeetingStatusBadge: React.FC<{ status: MeetingStatus | ProcessingStatus }> = ({ status }) => {
  switch (status) {
    case 'COMPLETED':
      return (
        <Badge variant="forest" size="sm" className="font-semibold gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-forest" />
          Completed
        </Badge>
      );
    case 'PROCESSING':
    case 'ANALYZING':
      return (
        <Badge variant="violet" size="sm" className="font-semibold gap-1.5 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-violet animate-ping" />
          Analyzing AI
        </Badge>
      );
    case 'TRANSCRIPT_FETCHED':
      return (
        <Badge variant="cobalt" size="sm" className="font-semibold gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cobalt" />
          Transcript Ready
        </Badge>
      );
    case 'TRANSCRIPT_PENDING':
      return (
        <Badge variant="amber" size="sm" className="font-semibold gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
          Transcript Pending
        </Badge>
      );
    case 'IN_PROGRESS':
      return (
        <Badge variant="amber" size="sm" className="font-semibold gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
          In Progress
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="coral" size="sm" className="font-semibold gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-coral" />
          Failed
        </Badge>
      );
    case 'SCHEDULED':
    default:
      return (
        <Badge variant="cobalt" size="sm" className="font-semibold gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cobalt" />
          Upcoming
        </Badge>
      );
  }
};
