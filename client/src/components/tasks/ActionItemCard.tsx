import React, { useState } from 'react';
import {
  Check,
  Calendar,
  Clock,
  Layers,
  User,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  Link2,
  RefreshCw,
  Unlink
} from 'lucide-react';
import { ActionItem } from '../../types';
import { formatShortDate, getPriorityStyles } from '../../utils/formatters';
import { JiraLinkModal } from '../jira/JiraLinkModal';
import { CalendarModal } from './CalendarModal';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface ActionItemCardProps {
  item: ActionItem;
  meetingTitle?: string;
  meetingId: string;
  onToggleStatus?: (id: string) => void;
  onJiraCreated?: (itemKey: string) => void;
}

export const ActionItemCard: React.FC<ActionItemCardProps> = ({
  item,
  meetingTitle,
  meetingId,
  onToggleStatus,
  onJiraCreated
}) => {
  const { success, error, info } = useToast();
  const [isCompleted, setIsCompleted] = useState(item.status === 'COMPLETED');
  const [jiraKey, setJiraKey] = useState<string | null>(item.jiraIssueKey || null);
  const [jiraUrl, setJiraUrl] = useState<string | null>(item.jiraIssueUrl || null);
  const [jiraStatus, setJiraStatus] = useState<string | null>(item.jiraStatus || null);
  const [jiraLinkType, setJiraLinkType] = useState<string | null>(item.jiraLinkType || null);

  const [isCalOpen, setIsCalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [duplicateMatchData, setDuplicateMatchData] = useState<any | null>(null);

  const [isProcessingJira, setIsProcessingJira] = useState(false);
  const [isSyncingJira, setIsSyncingJira] = useState(false);

  const priorityStyle = getPriorityStyles(item.priority);

  const handleToggle = () => {
    setIsCompleted(!isCompleted);
    if (onToggleStatus) onToggleStatus(item.id);
  };

  /**
   * Intelligently creates a Jira issue:
   * 1. Checks for semantic duplicates first
   * 2. If duplicate found -> opens duplicate resolution modal
   * 3. If no duplicate -> directly creates the issue in user's configured Jira project
   */
  const handleCreateJira = async () => {
    setIsProcessingJira(true);
    try {
      // Step 1: Semantic duplicate detection
      const matchRes = await api.jira.matchIssue(item.task);

      if (matchRes.matchType === 'EXISTING_ISSUE_MATCH' && matchRes.matchedIssue) {
        // Potential duplicate detected
        setDuplicateMatchData(matchRes);
        setIsLinkModalOpen(true);
        setIsProcessingJira(false);
        return;
      }

      // Step 2: No duplicate detected -> proceed with issue creation
      await executeCreateIssue();
    } catch (err: any) {
      error('Jira Operation Failed', err.message);
      setIsProcessingJira(false);
    }
  };

  const executeCreateIssue = async () => {
    setIsProcessingJira(true);
    try {
      const res = await api.jira.createIssue({
        actionItemId: item.id,
        meetingId,
        meetingTitle,
        summary: item.task,
        dueDate: item.dueDate,
        priority: item.priority,
        ownerName: item.ownerName || undefined
      });

      setJiraKey(res.issueKey);
      setJiraUrl(res.issueUrl);
      setJiraStatus(res.status || 'To Do');
      setJiraLinkType('created');

      success(
        `Jira Issue ${res.issueKey} Created`,
        `Synced to your Jira Cloud project with status ${res.status || 'To Do'}.`
      );

      if (onJiraCreated) onJiraCreated(res.issueKey);
    } catch (err: any) {
      error('Failed to create Jira issue', err.message);
    } finally {
      setIsProcessingJira(false);
    }
  };

  const handleSyncJira = async () => {
    if (!jiraKey) return;
    setIsSyncingJira(true);
    try {
      const res = await api.jira.syncIssue(jiraKey);
      if (res.link?.status) {
        setJiraStatus(res.link.status);
        success(`Synced ${jiraKey}`, `Current Jira status: ${res.link.status}`);
      } else {
        info('Jira Sync', `Status is up to date.`);
      }
    } catch (err: any) {
      error('Sync Failed', err.message);
    } finally {
      setIsSyncingJira(false);
    }
  };

  const handleUnlinkJira = async () => {
    if (!window.confirm(`Unlink this action item from Jira issue ${jiraKey}?`)) return;

    try {
      await api.jira.unlinkIssue(item.id, meetingId);
      setJiraKey(null);
      setJiraUrl(null);
      setJiraStatus(null);
      setJiraLinkType(null);
      success('Unlinked from Jira', 'The connection has been removed.');
    } catch (err: any) {
      error('Unlink Failed', err.message);
    }
  };

  const handleLinkedFromModal = (key: string, url: string) => {
    setJiraKey(key);
    setJiraUrl(url);
    setJiraLinkType('manually_linked');
    setDuplicateMatchData(null);
    if (onJiraCreated) onJiraCreated(key);
  };

  return (
    <div
      className={`bg-surface rounded-2xl border p-4 transition-all duration-200 ${
        isCompleted
          ? 'border-border/60 bg-surface/50 opacity-70'
          : 'border-border hover:border-primary/20 shadow-card'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Toggle Checkbox */}
        <button
          onClick={handleToggle}
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            isCompleted
              ? 'bg-semantic-success border-semantic-success text-white'
              : 'border-border hover:border-primary bg-background'
          }`}
          aria-label={isCompleted ? 'Mark pending' : 'Mark completed'}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        {/* Action Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-semibold text-primary leading-snug ${
                isCompleted ? 'line-through text-secondary' : ''
              }`}
            >
              {item.task}
            </h4>

            {/* Priority Badge */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${priorityStyle.bg}`}
            >
              {item.priority}
            </span>
          </div>

          {/* Details Row: Owner, Due Date, Timestamp, Confidence */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-secondary">
            {/* Owner */}
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-secondary/70" />
              <span className="text-secondary/60">Owner:</span>
              <span className={`font-medium ${item.ownerName ? 'text-primary' : 'text-secondary/50 italic'}`}>
                {item.ownerName || 'Not specified'}
              </span>
            </span>

            {/* Due Date */}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-secondary/70" />
              <span className="text-secondary/60">Due:</span>
              <span className={`font-mono ${item.dueDate ? 'text-primary font-medium' : 'text-secondary/50 italic'}`}>
                {formatShortDate(item.dueDate)}
              </span>
            </span>

            {/* Source Timestamp */}
            {item.sourceTimestamp && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-secondary bg-background px-2 py-0.5 rounded border border-border/70">
                <Clock className="w-3 h-3 text-secondary/70" />
                {item.sourceTimestamp}
              </span>
            )}

            {/* Confidence Metric */}
            {item.confidence && (
              <span
                className={`flex items-center gap-1 text-[11px] ${
                  item.confidence === 'high' ? 'text-semantic-success' : 'text-semantic-warning'
                }`}
                title="AI Extraction Confidence"
              >
                <ShieldCheck className="w-3 h-3" />
                {item.confidence} confidence
              </span>
            )}
          </div>

          {/* AI Jira Recommendation Pill (if not yet linked & recommended) */}
          {!jiraKey && item.jiraCandidate && (
            <div className="mt-2.5 p-2 rounded-xl bg-accent-amber/10 border border-accent-amber/25 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-[#946300]">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">AI Recommended for Jira</span>
                {item.jiraConfidence && (
                  <span className="text-[10px] font-mono bg-accent-amber/20 px-1.5 py-0.2 rounded font-bold">
                    {Math.round(item.jiraConfidence * 100)}%
                  </span>
                )}
                {item.jiraReason && (
                  <span className="hidden sm:inline text-secondary/80 text-[11px] truncate max-w-xs">
                    — {item.jiraReason}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Tools & Jira State */}
          <div className="mt-3 pt-2.5 border-t border-border/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {jiraKey ? (
                /* Linked Jira Issue Badge & Actions */
                <div className="flex items-center gap-1.5 bg-[#0052CC]/8 border border-[#0052CC]/25 px-2.5 py-1 rounded-xl">
                  <Layers className="w-3.5 h-3.5 text-[#0052CC]" />
                  <a
                    href={jiraUrl || `https://jira.atlassian.com/browse/${jiraKey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-bold text-[#0052CC] hover:underline flex items-center gap-1"
                  >
                    {jiraKey}
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {jiraStatus && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white text-secondary border border-border">
                      {jiraStatus}
                    </span>
                  )}

                  {jiraLinkType === 'matched' && (
                    <span className="text-[10px] font-semibold text-accent-forest bg-accent-forest/10 px-1 rounded">
                      Linked
                    </span>
                  )}

                  {/* Sync status */}
                  <button
                    onClick={handleSyncJira}
                    disabled={isSyncingJira}
                    className="text-secondary hover:text-primary p-0.5 rounded transition-colors ml-1"
                    title="Sync Jira Status"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingJira ? 'animate-spin' : ''}`} />
                  </button>

                  {/* Unlink */}
                  <button
                    onClick={handleUnlinkJira}
                    className="text-secondary hover:text-semantic-danger p-0.5 rounded transition-colors"
                    title="Unlink from Jira"
                  >
                    <Unlink className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                /* Unlinked Actions: Create in Jira & Link Existing */
                <>
                  <button
                    onClick={handleCreateJira}
                    disabled={isProcessingJira}
                    className="text-xs text-primary font-medium hover:bg-surface-hover flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors"
                  >
                    {isProcessingJira ? (
                      <RefreshCw className="w-3 h-3 text-[#0052CC] animate-spin" />
                    ) : (
                      <Layers className="w-3 h-3 text-[#0052CC]" />
                    )}
                    {item.jiraCandidate ? 'Push to Jira' : 'Create in Jira'}
                  </button>

                  <button
                    onClick={() => {
                      setDuplicateMatchData(null);
                      setIsLinkModalOpen(true);
                    }}
                    className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-1 rounded-lg bg-background border border-border/70 hover:border-border transition-colors"
                    title="Link to existing Jira issue"
                  >
                    <Link2 className="w-3 h-3 text-secondary/70" />
                    Link Existing
                  </button>
                </>
              )}

              <button
                onClick={() => setIsCalOpen(true)}
                className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2.5 py-1 rounded bg-background border border-border/80 hover:border-primary/30 transition-colors"
              >
                <Calendar className="w-3 h-3 text-secondary/70" />
                Add Reminder
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Jira Link / Duplicate Resolution Modal */}
      <JiraLinkModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setDuplicateMatchData(null);
        }}
        actionItemId={item.id}
        actionItemTitle={item.task}
        meetingId={meetingId}
        meetingTitle={meetingTitle}
        duplicateMatch={duplicateMatchData}
        onLinked={handleLinkedFromModal}
        onProceedCreateNew={executeCreateIssue}
      />

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalOpen}
        onClose={() => setIsCalOpen(false)}
        taskTitle={item.task}
        meetingTitle={meetingTitle}
        initialDate={item.dueDate}
      />
    </div>
  );
};
