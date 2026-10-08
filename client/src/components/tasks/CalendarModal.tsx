import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Calendar } from 'lucide-react';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId?: string;
  taskTitle: string;
  meetingTitle?: string;
  initialDate?: string | null;
  onScheduled?: (reminderAt: string) => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  meetingTitle,
  initialDate,
  onScheduled,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = initialDate || tomorrow.toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDateStr);
  const [time, setTime] = useState('09:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const reminderIso = new Date(`${date}T${time}:00`).toISOString();

      if (taskId) {
        await api.tasks.setReminder(taskId, reminderIso);
      } else {
        await api.calendar.createReminder({
          taskTitle,
          reminderAt: reminderIso,
          meetingTitle,
        });
      }

      success(
        'Calendar Reminder Scheduled',
        `Google Calendar event scheduled for ${date} at ${time}.`
      );

      if (onScheduled) {
        onScheduled(reminderIso);
      }
      onClose();
    } catch (err: any) {
      error('Failed to schedule reminder', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Google Calendar Reminder"
      description="Schedule a focused work block and reminder alert in Google Calendar."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-background border border-border/80 text-xs">
          <span className="text-secondary font-medium">Task:</span>
          <p className="font-semibold text-primary mt-0.5">{taskTitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Reminder Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary mb-1">
              Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-background border border-border rounded-lg text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Add to Calendar
          </Button>
        </div>
      </form>
    </Modal>
  );
};
