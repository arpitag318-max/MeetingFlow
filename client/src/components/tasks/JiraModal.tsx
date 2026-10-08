import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface JiraModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string;
  actionItemId?: string;
  meetingId?: string;
  initialSummary: string;
  initialPriority?: string;
  initialDueDate?: string | null;
  onCreated?: (issueKey: string, issueUrl: string) => void;
}

export const JiraModal: React.FC<JiraModalProps> = ({
  isOpen,
  onClose,
  taskId: _taskId,
  actionItemId,
  meetingId,
  initialSummary,
  initialPriority = 'MEDIUM',
  initialDueDate,
  onCreated,
}) => {
  const [summary, setSummary] = useState(initialSummary);
  const [description, setDescription] = useState(`Created from MeetingFlow action item.\nMeeting ID: ${meetingId || 'General'}`);
  const [priority, setPriority] = useState(initialPriority);
  const [dueDate, setDueDate] = useState(initialDueDate || '');
  const [projectKey, setProjectKey] = useState('MF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.jira.createIssue({
        actionItemId,
        meetingId,
        summary,
        description,
        priority,
        dueDate: dueDate || null,
        projectKey,
      });

      success(
        `Jira Issue ${res.issueKey} Created`,
        `Task successfully synced to Jira project ${projectKey}.`
      );

      if (onCreated) {
        onCreated(res.issueKey, res.issueUrl);
      }
      onClose();
    } catch (err: any) {
      error('Failed to create Jira issue', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Jira Issue"
      description="Sync this action item directly into your Jira backlog or sprint."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Project Key
          </label>
          <input
            type="text"
            value={projectKey}
            onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
            placeholder="e.g. MF, PROJ"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Summary / Issue Title
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-primary mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Create Issue in Jira
          </Button>
        </div>
      </form>
    </Modal>
  );
};
