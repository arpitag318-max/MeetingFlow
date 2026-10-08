import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../api/client';
import { JiraIssueLink } from '../types';
import { useToast } from '../context/ToastContext';
import {
  Layers,
  Search,
  ExternalLink,
  RefreshCw,
  Unlink,
  ArrowUpRight,
  Calendar,
  User,
  Settings2
} from 'lucide-react';

export const JiraWorkPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [issues, setIssues] = useState<JiraIssueLink[]>([]);
  const [metrics, setMetrics] = useState({
    totalLinked: 0,
    openCount: 0,
    inProgressCount: 0,
    doneCount: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('ALL');
  const [syncingKeys, setSyncingKeys] = useState<{ [key: string]: boolean }>({});

  const loadLinkedWork = async (showToast = false) => {
    try {
      const res = await api.jira.getLinkedWork();
      setIssues(res.issues || []);
      setMetrics(res.metrics || { totalLinked: 0, openCount: 0, inProgressCount: 0, doneCount: 0 });
      if (showToast) {
        success('Jira Work Refreshed', `Synchronized ${res.issues.length} linked issues.`);
      }
    } catch (err: any) {
      error('Failed to load Jira work', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinkedWork();
  }, []);

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
      await loadLinkedWork(true);
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleSyncSingle = async (issueKey: string) => {
    setSyncingKeys(prev => ({ ...prev, [issueKey]: true }));
    try {
      const res = await api.jira.syncIssue(issueKey);
      if (res.link) {
        success(`Synced ${issueKey}`, `Current status: ${res.link.status}`);
        setIssues(prev => prev.map(i => i.jiraIssueKey === issueKey ? { ...i, ...res.link } : i));
      }
    } catch (err: any) {
      error(`Sync Failed for ${issueKey}`, err.message);
    } finally {
      setSyncingKeys(prev => ({ ...prev, [issueKey]: false }));
    }
  };

  const handleUnlink = async (actionItemId: string, meetingId?: string, issueKey?: string) => {
    if (!window.confirm(`Unlink Jira issue ${issueKey || ''} from its meeting action item?`)) return;

    try {
      await api.jira.unlinkIssue(actionItemId, meetingId || '');
      success('Unlinked Issue', 'The connection has been removed.');
      await loadLinkedWork();
    } catch (err: any) {
      error('Unlink Failed', err.message);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const matchesSearch =
      issue.jiraIssueKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.meetingTitle || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const cat = (issue.statusCategory || issue.status || '').toLowerCase();
    if (statusFilter === 'TODO') {
      return cat.includes('to do') || cat.includes('todo') || cat === 'open';
    }
    if (statusFilter === 'IN_PROGRESS') {
      return cat.includes('in progress') || cat.includes('progress');
    }
    if (statusFilter === 'DONE') {
      return cat.includes('done') || cat.includes('closed') || cat.includes('resolved');
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        onOpenMobileMenu={openMobileMenu}
        title="Jira Execution"
        subtitle="Live synchronization of meeting action items in Atlassian Jira Cloud"
        action={
          <div className="flex items-center gap-2">
            <Link to="/integrations">
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Settings2 className="w-3.5 h-3.5" />
                Integration Settings
              </Button>
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSyncAll}
              isLoading={isSyncingAll}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync All
            </Button>
          </div>
        }
      />

      <div className="w-full px-6 sm:px-8 lg:px-8 py-6 space-y-6">
        {/* Real KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
            <span className="text-xs font-semibold text-secondary">Total Linked</span>
            <p className="text-2xl font-bold text-primary font-mono mt-1">{metrics.totalLinked}</p>
            <span className="text-[11px] text-secondary mt-1 block">From meetings</span>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
            <span className="text-xs font-semibold text-secondary">To Do / Open</span>
            <p className="text-2xl font-bold text-primary font-mono mt-1">{metrics.openCount}</p>
            <span className="text-[11px] text-secondary mt-1 block">Pending in Jira</span>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
            <span className="text-xs font-semibold text-accent-cobalt">In Progress</span>
            <p className="text-2xl font-bold text-accent-cobalt font-mono mt-1">{metrics.inProgressCount}</p>
            <span className="text-[11px] text-secondary mt-1 block">Actively worked</span>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-5 shadow-card">
            <span className="text-xs font-semibold text-accent-forest">Done / Resolved</span>
            <p className="text-2xl font-bold text-accent-forest font-mono mt-1">{metrics.doneCount}</p>
            <span className="text-[11px] text-secondary mt-1 block">Closed in Jira</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-surface rounded-2xl border border-border p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by issue key, summary, or meeting title..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-xl text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-background'
                  : 'bg-background text-secondary hover:text-primary border border-border'
              }`}
            >
              All ({issues.length})
            </button>
            <button
              onClick={() => setStatusFilter('TODO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'TODO'
                  ? 'bg-primary text-background'
                  : 'bg-background text-secondary hover:text-primary border border-border'
              }`}
            >
              To Do ({metrics.openCount})
            </button>
            <button
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-accent-cobalt text-white'
                  : 'bg-background text-secondary hover:text-primary border border-border'
              }`}
            >
              In Progress ({metrics.inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter('DONE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === 'DONE'
                  ? 'bg-accent-forest text-white'
                  : 'bg-background text-secondary hover:text-primary border border-border'
              }`}
            >
              Done ({metrics.doneCount})
            </button>
          </div>
        </div>

        {/* Content Table / Cards */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        ) : filteredIssues.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={issues.length === 0 ? 'No Jira work linked yet' : 'No issues match your filter'}
            description={
              issues.length === 0
                ? 'When you extract action items from meetings, push them to Jira Cloud to track their delivery here.'
                : 'Try adjusting your search terms or status filter.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredIssues.map((issue) => {
              const isDone = (issue.statusCategory || issue.status || '').toLowerCase().includes('done');
              const isInProgress = (issue.statusCategory || issue.status || '').toLowerCase().includes('in progress');
              const isSyncing = Boolean(syncingKeys[issue.jiraIssueKey]);

              return (
                <div
                  key={issue.id}
                  className="bg-surface rounded-2xl border border-border p-4 shadow-card hover:border-primary/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={issue.jiraUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-[#0052CC] hover:underline flex items-center gap-1 bg-[#0052CC]/8 px-2 py-0.5 rounded-md border border-[#0052CC]/20"
                      >
                        {issue.jiraIssueKey}
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          isDone
                            ? 'bg-accent-forest/15 text-accent-forest border-accent-forest/30'
                            : isInProgress
                            ? 'bg-accent-cobalt/15 text-accent-cobalt border-accent-cobalt/30'
                            : 'bg-background text-secondary border-border'
                        }`}
                      >
                        {issue.status || 'To Do'}
                      </span>

                      <span className="text-[10px] text-secondary font-medium px-2 py-0.5 rounded bg-background border border-border/70">
                        {issue.linkType === 'matched' ? 'Matched Existing' : 'Created from Meeting'}
                      </span>
                    </div>

                    <h4 className="text-sm font-semibold text-primary leading-snug">
                      {issue.summary || 'Meeting Action Item'}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-secondary pt-0.5">
                      {issue.meetingTitle && (
                        <span className="flex items-center gap-1">
                          <span className="text-secondary/60">Meeting:</span>
                          {issue.meetingId ? (
                            <Link
                              to={`/meetings/${issue.meetingId}`}
                              className="font-medium text-primary hover:underline truncate max-w-xs"
                            >
                              {issue.meetingTitle}
                            </Link>
                          ) : (
                            <span className="font-medium text-primary truncate max-w-xs">
                              {issue.meetingTitle}
                            </span>
                          )}
                        </span>
                      )}

                      {issue.assigneeName && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-secondary/60" />
                          <span>{issue.assigneeName}</span>
                        </span>
                      )}

                      {issue.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-secondary/60" />
                          <span className="font-mono">{issue.dueDate}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncSingle(issue.jiraIssueKey)}
                      isLoading={isSyncing}
                      className="text-xs h-8 px-2.5 gap-1"
                      title="Sync current status from Jira Cloud"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Sync
                    </Button>

                    <a
                      href={issue.jiraUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="secondary" className="text-xs h-8 px-2.5 gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        View in Jira
                      </Button>
                    </a>

                    <button
                      onClick={() => handleUnlink(issue.actionItemId, issue.meetingId, issue.jiraIssueKey)}
                      className="text-secondary hover:text-semantic-danger p-1.5 rounded-lg border border-border/60 hover:border-semantic-danger/40 transition-colors"
                      title="Unlink from meeting"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
