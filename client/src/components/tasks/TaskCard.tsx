import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  Calendar,
  Layers,
  Bell
} from 'lucide-react';
import { UserTask } from '../../types';
import { formatShortDate, getPriorityStyles } from '../../utils/formatters';
import { JiraModal } from './JiraModal';
import { CalendarModal } from './CalendarModal';

interface TaskCardProps {
  task: UserTask;
  onToggleComplete: (id: string) => void;
  onJiraCreated?: (taskId: string, issueKey: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onJiraCreated
}) => {
  const [isJiraOpen, setIsJiraOpen] = useState(false);
  const [isCalOpen, setIsCalOpen] = useState(false);

  const isCompleted = task.status === 'COMPLETED';
  const priorityStyle = getPriorityStyles(task.priority);
  const todayStr = new Date().toISOString().split('T')[0];
  const isOverdue = task.dueDate && task.dueDate < todayStr && !isCompleted;

  return (
    <div
      className={`group rounded-2xl border p-4.5 transition-all duration-200 ${
        isCompleted
          ? 'border-[#EAE4DC] bg-[#FAF7F2]/60 opacity-75'
          : isOverdue
          ? 'border-[#FFD4CF] bg-[#FFFBF9] shadow-subtle'
          : 'border-[#EAE4DC] bg-white hover:border-[#E85555]/30 shadow-subtle'
      }`}
    >
      <div className="flex items-start gap-3.5">
        {/* Responsive Large Tap Target Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id)}
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            isCompleted
              ? 'bg-[#1D7B4B] border-[#1D7B4B] text-white'
              : 'border-[#C5BCB2] hover:border-[#E85555] bg-white'
          }`}
          aria-label={isCompleted ? 'Mark task as pending' : 'Mark task as completed'}
        >
          {isCompleted && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={`text-sm font-semibold text-primary transition-all leading-snug ${
                isCompleted ? 'line-through text-secondary' : ''
              }`}
            >
              {task.title}
            </h4>

            {/* Priority Badge */}
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${priorityStyle.bg}`}
            >
              {task.priority}
            </span>
          </div>

          {/* Meeting Origin & Due Date Metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-secondary">
            {task.meetingTitle && (
              <span className="flex items-center gap-1 truncate text-primary/80">
                <span className="text-secondary/60">From:</span>
                {task.meetingId ? (
                  <Link
                    to={`/meetings/${task.meetingId}`}
                    className="hover:underline font-medium truncate"
                  >
                    {task.meetingTitle}
                  </Link>
                ) : (
                  <span className="font-medium truncate">{task.meetingTitle}</span>
                )}
              </span>
            )}

            {task.dueDate && (
              <span
                className={`flex items-center gap-1 font-mono ${
                  isOverdue ? 'text-accent-coral font-semibold' : 'text-secondary'
                }`}
              >
                <Calendar className="w-3 h-3" />
                {isOverdue ? `Overdue (${formatShortDate(task.dueDate)})` : formatShortDate(task.dueDate)}
              </span>
            )}

            {task.reminderAt && (
              <span className="flex items-center gap-1 text-[#236346] bg-accent-forest/15 px-2 py-0.5 rounded border border-accent-forest/30 text-[11px] font-medium">
                <Bell className="w-2.5 h-2.5" />
                Reminder set
              </span>
            )}
          </div>

          {/* Action Row: Jira & Calendar Trigger Buttons */}
          <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {task.jiraIssueKey ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-accent-cobalt/10 text-accent-cobalt border border-accent-cobalt/25">
                  <Layers className="w-3 h-3" />
                  {task.jiraIssueKey}
                </span>
              ) : (
                <button
                  onClick={() => setIsJiraOpen(true)}
                  className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded hover:bg-background transition-colors"
                >
                  <Layers className="w-3 h-3 text-secondary/70" />
                  + Jira
                </button>
              )}

              {!task.reminderAt && (
                <button
                  onClick={() => setIsCalOpen(true)}
                  className="text-xs text-secondary hover:text-primary flex items-center gap-1 px-2 py-0.5 rounded hover:bg-background transition-colors"
                >
                  <Calendar className="w-3 h-3 text-secondary/70" />
                  + Reminder
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Jira Modal */}
      <JiraModal
        isOpen={isJiraOpen}
        onClose={() => setIsJiraOpen(false)}
        taskId={task.id}
        meetingId={task.meetingId}
        initialSummary={task.title}
        initialPriority={task.priority}
        initialDueDate={task.dueDate}
        onCreated={(key) => {
          if (onJiraCreated) onJiraCreated(task.id, key);
        }}
      />

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalOpen}
        onClose={() => setIsCalOpen(false)}
        taskId={task.id}
        taskTitle={task.title}
        meetingTitle={task.meetingTitle}
        initialDate={task.dueDate}
      />
    </div>
  );
};
