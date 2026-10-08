import React, { useState, useEffect } from 'react';
import { useParams, Link, useOutletContext } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { Tabs, TabItem } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionItemCard } from '../components/tasks/ActionItemCard';
import { TranscriptViewer } from '../components/meetings/TranscriptViewer';
import { ProcessingStatus } from '../components/meetings/ProcessingStatus';
import { MeetingStatusBadge } from '../components/meetings/MeetingStatusBadge';
import { FollowUpSchedulingCard } from '../components/meetings/FollowUpSchedulingCard';
import { api } from '../api/client';
import { Meeting } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  formatDate,
  formatTimeRange,
  formatDuration
} from '../../src/utils/formatters';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  CheckSquare,
  Building,
  Layers
} from 'lucide-react';

export const MeetingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const { user, isDemoMode } = useAuth();
  const { success, error, info } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadMeeting = async () => {
    if (!id) return;
    try {
      const res = await api.meetings.getById(id);
      setMeeting(res.meeting);
    } catch (err: any) {
      error('Failed to load meeting details', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeeting();
  }, [id]);

  const handleProcessMeeting = async () => {
    if (!id || !meeting) return;

    // Check if upcoming (has not occurred or ended yet)
    const isUpcomingMeeting = meeting.status === 'SCHEDULED' && new Date(meeting.endTime).getTime() > Date.now();
    if (isUpcomingMeeting && !isDemoMode) {
      info(
        "Meeting Hasn't Occurred Yet",
        "Meeting hasn't occurred yet. Processing will be available after the meeting."
      );
      return;
    }

    setIsProcessing(true);
    try {
      const res = await api.meetings.process(id, isDemoMode);
      setMeeting(res.meeting);
      if (
        res.meeting.followUpScheduling &&
        (res.meeting.followUpScheduling.status === 'SCHEDULED' || res.meeting.followUpScheduling.status === 'CONFLICT_RESOLVED')
      ) {
        const isConflict = res.meeting.followUpScheduling.status === 'CONFLICT_RESOLVED';
        success(
          isConflict ? 'Follow-Up Conflict Resolved & Auto-Scheduled' : 'Follow-Up Auto-Scheduled',
          `Calendar event "${res.meeting.followUpScheduling.scheduledTitle}" booked with Google Meet.`
        );
      } else {
        success('Processing Complete', 'Gemini AI successfully extracted summary, decisions, and action items.');
      }
    } catch (err: any) {
      const msg = err.message || 'Processing failed';
      error('Processing Notice', msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 sm:p-8 space-y-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background p-6 sm:p-8">
        <ErrorState
          title="Meeting not found"
          message={`Unable to locate meeting with ID: ${id}`}
        />
      </div>
    );
  }

  const isCompleted = meeting.status === 'COMPLETED';
  const isOrganizer = meeting.organizerId === user?.id || meeting.organizerEmail === user?.email;
  const actionItems = meeting.actionItems || [];
  const decisions = meeting.decisions || [];
  const transcripts = meeting.transcripts || [];

  // Filter personal tasks from this meeting assigned to current logged in user
  const userIdentifier = user?.email?.toLowerCase() || user?.name?.toLowerCase() || 'rahul';
  const myActionItems = actionItems.filter(item => {
    if (user?.email && item.ownerEmail && item.ownerEmail.toLowerCase() === user.email.toLowerCase()) return true;
    if (user?.name && item.ownerName && item.ownerName.toLowerCase().includes(user.name.toLowerCase())) return true;
    return item.ownerName?.toLowerCase().includes(userIdentifier) || item.ownerEmail?.toLowerCase().includes(userIdentifier);
  });

  // Group action items by participant for Organizer View
  const itemsByParticipant: { [name: string]: typeof actionItems } = {};
  actionItems.forEach(item => {
    const owner = item.ownerName || 'Unassigned / Not Specified';
    if (!itemsByParticipant[owner]) itemsByParticipant[owner] = [];
    itemsByParticipant[owner].push(item);
  });

  const jiraLinkedItems = actionItems.filter(item => Boolean(item.jiraIssueKey));
  const jiraCandidateItems = actionItems.filter(item => !item.jiraIssueKey && item.jiraCandidate);

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'actions', label: 'Action Items', badge: actionItems.length },
    { id: 'mytodos', label: 'My To-Dos', badge: myActionItems.length },
    { id: 'jira', label: 'Jira Work', badge: jiraLinkedItems.length },
    { id: 'transcript', label: 'Transcript', badge: transcripts.length },
    { id: 'decisions', label: 'Decisions', badge: decisions.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        onOpenMobileMenu={openMobileMenu}
        title={meeting.title}
        subtitle={`${formatDate(meeting.startTime)} • ${formatDuration(meeting.durationMinutes)}`}
        action={
          <Link to="/meetings">
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              All Meetings
            </Button>
          </Link>
        }
      />

      <div className="w-full px-6 sm:px-8 lg:px-8 py-6 space-y-6">
        {/* Meeting Header Card */}
        <div className="bg-white rounded-2xl border border-[#EAE4DC] p-6 shadow-subtle">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <MeetingStatusBadge status={meeting.processingJob?.status || meeting.status} />
                <span className="text-xs font-mono text-[#6B7280] flex items-center gap-1 bg-[#FAF7F2] px-2.5 py-0.5 rounded-full border border-[#EAE4DC]">
                  <Clock className="w-3 h-3 text-[#8C948F]" />
                  {formatDuration(meeting.durationMinutes)}
                </span>
                {isOrganizer && (
                  <span className="text-[11px] font-semibold bg-[#F0FAF4] text-[#1D7B4B] px-2.5 py-0.5 rounded-full border border-[#D3F5E2]">
                    You are Organizer
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold text-[#181D1A] tracking-tight">
                {meeting.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6B7280] pt-1">
                <span className="flex items-center gap-1 font-medium text-[#181D1A]">
                  <Calendar className="w-3.5 h-3.5 text-[#8C948F]" />
                  {formatDate(meeting.startTime)}
                </span>
                <span className="text-[#EAE4DC]">•</span>
                <span>{formatTimeRange(meeting.startTime, meeting.endTime)}</span>
                <span className="text-[#EAE4DC]">•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#8C948F]" />
                  {meeting.participants.length} participants
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              {meeting.meetUrl && (
                <a
                  href={meeting.meetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex"
                >
                  <Button size="sm" variant="secondary" className="gap-1.5 text-xs">
                    <Video className="w-3.5 h-3.5 text-[#E85555]" />
                    Open Google Meet
                  </Button>
                </a>
              )}

              <Button
                size="sm"
                variant={isCompleted ? 'outline' : 'coral'}
                onClick={handleProcessMeeting}
                isLoading={isProcessing}
                className="gap-1.5 text-xs shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isCompleted ? 'Re-analyze with Gemini' : 'Process Meeting'}
              </Button>
            </div>
          </div>

          {/* Attendees List */}
          <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-secondary mr-1">Attendees:</span>
            {meeting.participants.map((p) => (
              <span
                key={p.id}
                className="text-xs px-2.5 py-1 rounded-lg bg-background border border-border/70 text-primary font-medium flex items-center gap-1"
              >
                {p.name}
                {p.role === 'organizer' && (
                  <span className="text-[10px] text-secondary/70 font-mono">(Org)</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Async Processing Status Indicator (if processing or uncompleted) */}
        {meeting.processingJob && meeting.processingJob.status !== 'COMPLETED' && (
          <ProcessingStatus
            job={meeting.processingJob}
            onRetry={handleProcessMeeting}
          />
        )}

        {/* Tab Navigation */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        <div className="space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* AI Follow-Up Scheduling Card */}
              {meeting.followUpScheduling && (
                <FollowUpSchedulingCard scheduling={meeting.followUpScheduling} />
              )}
              {/* AI Summary Card */}
              <div className="bg-surface rounded-2xl border border-border p-6 shadow-card">
                <div className="flex items-center gap-2 mb-3 text-accent-violet">
                  <div className="w-7 h-7 rounded-lg bg-accent-violet/12 flex items-center justify-center text-accent-violet">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-primary tracking-tight">AI EXECUTIVE SUMMARY</h3>
                </div>

                {meeting.summary ? (
                  <p className="text-sm text-primary/90 leading-relaxed font-sans font-normal">
                    {meeting.summary}
                  </p>
                ) : (
                  <p className="text-xs text-secondary italic">
                    AI summary will be generated once meeting processing is initiated.
                  </p>
                )}
              </div>

              {/* Key Discussions */}
              {meeting.keyDiscussions && meeting.keyDiscussions.length > 0 && (
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-secondary" />
                    <h3 className="text-sm font-bold text-primary tracking-tight">KEY DISCUSSIONS</h3>
                  </div>
                  <ul className="space-y-2.5">
                    {meeting.keyDiscussions.map((point, idx) => (
                      <li key={idx} className="text-xs text-primary/90 flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 mt-1.5" />
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confirmed Decisions Preview */}
              {decisions.length > 0 && (
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-accent-forest" />
                    <h3 className="text-sm font-bold text-primary tracking-tight">CONFIRMED DECISIONS</h3>
                  </div>
                  <div className="space-y-3">
                    {decisions.map((dec) => (
                      <div key={dec.id} className="p-3.5 rounded-xl bg-accent-forest/10 border border-accent-forest/25">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-primary">{dec.decision}</p>
                          {dec.timestamp && (
                            <span className="text-[11px] font-mono text-secondary bg-surface px-2 py-0.5 rounded border border-border">
                              {dec.timestamp}
                            </span>
                          )}
                        </div>
                        {dec.context && (
                          <p className="text-xs text-secondary mt-0.5">{dec.context}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Open Questions */}
              {meeting.openQuestions && meeting.openQuestions.length > 0 && (
                <div className="bg-surface rounded-2xl border border-border p-6 shadow-card">
                  <div className="flex items-center gap-2 mb-3">
                    <HelpCircle className="w-4 h-4 text-semantic-warning" />
                    <h3 className="text-sm font-bold text-primary tracking-tight">OPEN QUESTIONS FOR FOLLOW-UP</h3>
                  </div>
                  <ul className="space-y-2">
                    {meeting.openQuestions.map((q, idx) => (
                      <li key={idx} className="text-xs text-secondary flex items-start gap-2">
                        <span className="text-semantic-warning font-bold">?</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ACTION ITEMS (Including Meeting Organizer View) */}
          {activeTab === 'actions' && (
            <div className="space-y-6">
              {/* Meeting Organizer Visibility Breakdown */}
              {isOrganizer && Object.keys(itemsByParticipant).length > 0 && (
                <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Building className="w-4 h-4 text-secondary" />
                    <div>
                      <h4 className="text-sm font-bold text-primary tracking-tight">
                        ORGANIZER TEAM VISIBILITY
                      </h4>
                      <p className="text-xs text-secondary">
                        Action item allocation across confirmed meeting attendees
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(itemsByParticipant).map(([name, items]) => (
                      <div key={name} className="p-3 rounded-xl bg-background border border-border/80">
                        <p className="text-xs font-bold text-primary mb-2 flex items-center justify-between">
                          <span>{name}</span>
                          <span className="font-mono text-secondary text-[11px] bg-surface px-1.5 py-0.5 rounded border border-border">
                            {items.length} tasks
                          </span>
                        </p>
                        <ul className="space-y-1.5">
                          {items.map((it) => (
                            <li key={it.id} className="text-[11px] text-secondary flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">□</span>
                              <span className="truncate">{it.task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Action Items List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-primary">All Extracted Action Items</h4>
                  <span className="text-xs text-secondary font-mono">{actionItems.length} total</span>
                </div>

                {actionItems.length === 0 ? (
                  <EmptyState
                    icon={CheckSquare}
                    title="No action items yet"
                    description="Run meeting processing to automatically extract structured action items."
                    actionLabel="Process Meeting"
                    onAction={handleProcessMeeting}
                  />
                ) : (
                  actionItems.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      meetingId={meeting.id}
                      meetingTitle={meeting.title}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MY TO-DOS (Filtered strictly to current logged-in user) */}
          {activeTab === 'mytodos' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-accent-amber/10 border border-accent-amber/30 text-xs text-primary">
                <p className="font-semibold text-primary">User-Specific To-Dos</p>
                <p className="text-[11px] mt-0.5 text-secondary">
                  Showing only the tasks extracted by Gemini and assigned to your account ({user?.name || 'Rahul Sharma'}).
                </p>
              </div>

              {myActionItems.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="No personal tasks in this meeting"
                  description="You were not assigned any individual action items in this conference."
                />
              ) : (
                <div className="space-y-3">
                  {myActionItems.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      meetingId={meeting.id}
                      meetingTitle={meeting.title}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: JIRA WORK */}
          {activeTab === 'jira' && (
            <div className="space-y-4">
              {/* Header metrics */}
              <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0052CC]/10 border border-[#0052CC]/25 flex items-center justify-center text-[#0052CC]">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary">Jira Cloud Execution Sync</h4>
                      <p className="text-xs text-secondary">
                        {jiraLinkedItems.length} of {actionItems.length} action items linked to active Jira issues
                      </p>
                    </div>
                  </div>

                  <Link to="/integrations">
                    <Button size="sm" variant="outline" className="text-xs">
                      Jira Settings
                    </Button>
                  </Link>
                </div>

                {jiraCandidateItems.length > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-accent-amber/10 border border-accent-amber/25 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#946300] font-medium">
                      Gemini identified <strong className="font-bold">{jiraCandidateItems.length} additional action items</strong> recommended for Jira.
                    </span>
                    <button
                      onClick={() => setActiveTab('actions')}
                      className="text-xs font-semibold text-[#946300] hover:underline"
                    >
                      Review in Action Items →
                    </button>
                  </div>
                )}
              </div>

              {jiraLinkedItems.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No Jira issues linked to this meeting"
                  description="Push action items to your connected Jira project or link them to existing backlog issues."
                  actionLabel="View Action Items"
                  onAction={() => setActiveTab('actions')}
                />
              ) : (
                <div className="space-y-3">
                  {jiraLinkedItems.map((item) => (
                    <ActionItemCard
                      key={item.id}
                      item={item}
                      meetingId={meeting.id}
                      meetingTitle={meeting.title}
                      onJiraCreated={() => {
                        // refresh meeting state
                        loadMeeting();
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRANSCRIPT */}
          {activeTab === 'transcript' && (
            <div className="space-y-4">
              <TranscriptViewer transcripts={transcripts} />
            </div>
          )}

          {/* TAB 5: DECISIONS */}
          {activeTab === 'decisions' && (
            <div className="space-y-3">
              {decisions.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No decisions recorded"
                  description="No explicit decisions were agreed upon or extracted from this meeting transcript."
                />
              ) : (
                decisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="bg-surface rounded-2xl border border-border p-5 shadow-card"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-primary">{dec.decision}</h4>
                      {dec.timestamp && (
                        <span className="text-xs font-mono text-secondary bg-background px-2 py-0.5 rounded border border-border">
                          {dec.timestamp}
                        </span>
                      )}
                    </div>
                    {dec.context && (
                      <p className="text-xs text-secondary leading-relaxed">{dec.context}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
