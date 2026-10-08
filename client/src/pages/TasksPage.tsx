import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { TaskCard } from '../components/tasks/TaskCard';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { api } from '../api/client';
import { UserTask } from '../types';
import { useToast } from '../context/ToastContext';
import {
  Layers,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';

export const TasksPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [groups, setGroups] = useState<{
    dueToday: UserTask[];
    overdue: UserTask[];
    upcoming: UserTask[];
    completed: UserTask[];
  }>({
    dueToday: [],
    overdue: [],
    upcoming: [],
    completed: []
  });
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);

  const loadTasks = async () => {
    try {
      const res = await api.tasks.getAll({
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined
      });
      setTasks(res.tasks);
      setGroups(res.groups);
    } catch (err: any) {
      error('Failed to load tasks', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [selectedPriority]);

  const handleToggleComplete = async (id: string) => {
    try {
      await api.tasks.complete(id);
      success('Task Completed', 'Marked as completed.');
      await loadTasks();
    } catch (err: any) {
      error('Failed to complete task', err.message);
    }
  };

  const handleBulkCreateJira = async () => {
    const unmappedTasks = tasks.filter(t => !t.jiraIssueKey && t.status !== 'COMPLETED');
    if (unmappedTasks.length === 0) {
      success('All Tasks Synced', 'Every open task already has an associated Jira ticket.');
      return;
    }

    setIsBulkSyncing(true);
    try {
      const items = unmappedTasks.map(t => ({
        summary: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        projectKey: 'MF'
      }));

      const res = await api.jira.createBulk(items);
      success('Bulk Jira Sync Complete', `Created ${res.createdCount} issue(s) in Jira.`);
      await loadTasks();
    } catch (err: any) {
      error('Bulk Jira Sync Failed', err.message);
    } finally {
      setIsBulkSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        onOpenMobileMenu={openMobileMenu}
        title="My To-Dos"
        subtitle="User-specific action items extracted from your meetings"
        action={
          <Button
            size="sm"
            variant="secondary"
            onClick={handleBulkCreateJira}
            isLoading={isBulkSyncing}
            className="gap-1.5 text-xs shadow-sm bg-white"
          >
            <Layers className="w-3.5 h-3.5 text-[#755C91]" />
            Create All Confirmed in Jira
          </Button>
        }
      />

      <div className="w-full px-6 sm:px-8 lg:px-8 py-6 space-y-8">
        {/* Filters */}
        <div className="flex items-center justify-between gap-3 p-1.5 bg-white rounded-xl border border-[#EAE4DC] shadow-subtle w-fit">
          <span className="text-xs font-semibold text-[#6B7280] px-2">Priority:</span>
          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${
                selectedPriority === p
                  ? 'bg-[#E85555] text-white shadow-2xs'
                  : 'text-[#6B7280] hover:text-[#181D1A]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. DUE TODAY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent-amber" />
                  <h3 className="text-sm font-bold text-primary tracking-tight">DUE TODAY</h3>
                </div>
                <span className="text-xs font-mono text-secondary bg-surface px-2.5 py-0.5 rounded-full border border-border">
                  {groups.dueToday.length}
                </span>
              </div>

              {groups.dueToday.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border bg-surface/40 text-xs text-secondary text-center">
                  No tasks due today.
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.dueToday.map(task => (
                    <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} />
                  ))}
                </div>
              )}
            </div>

            {/* 2. OVERDUE */}
            {groups.overdue.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-coral" />
                    <h3 className="text-sm font-bold text-primary tracking-tight">OVERDUE</h3>
                  </div>
                  <span className="text-xs font-mono text-accent-coral font-bold bg-accent-coral/15 px-2.5 py-0.5 rounded-full border border-accent-coral/30">
                    {groups.overdue.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {groups.overdue.map(task => (
                    <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} />
                  ))}
                </div>
              </div>
            )}

            {/* 3. UPCOMING */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent-cobalt" />
                  <h3 className="text-sm font-bold text-primary tracking-tight">UPCOMING TASKS</h3>
                </div>
                <span className="text-xs font-mono text-secondary bg-surface px-2.5 py-0.5 rounded-full border border-border">
                  {groups.upcoming.length}
                </span>
              </div>

              {groups.upcoming.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-border bg-surface/40 text-xs text-secondary text-center">
                  No upcoming tasks.
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.upcoming.map(task => (
                    <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} />
                  ))}
                </div>
              )}
            </div>

            {/* 4. COMPLETED */}
            {groups.completed.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-semantic-success" />
                    <h3 className="text-sm font-bold text-primary tracking-tight">COMPLETED</h3>
                  </div>
                  <span className="text-xs font-mono text-secondary bg-surface px-2 py-0.5 rounded border border-border">
                    {groups.completed.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {groups.completed.map(task => (
                    <TaskCard key={task.id} task={task} onToggleComplete={handleToggleComplete} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
