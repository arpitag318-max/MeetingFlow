import { Request, Response } from 'express';
import { persistentDb } from '../db/index.js';
import { demoStore } from '../store/demo-store.js';
import { googleService } from '../services/google.service.js';

export const taskController = {
  // Get all tasks for the authenticated user
  getAll: (req: Request, res: Response) => {
    if (req.isDemoUser) {
      const { status, priority } = req.query;
      let tasks = demoStore.getUserTasks();
      if (status && typeof status === 'string' && status !== 'ALL') tasks = tasks.filter(t => t.status === status);
      if (priority && typeof priority === 'string' && priority !== 'ALL') tasks = tasks.filter(t => t.priority === priority);

      const todayStr = new Date().toISOString().split('T')[0];
      const dueToday = tasks.filter(t => t.dueDate === todayStr && t.status !== 'COMPLETED');
      const overdue = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'COMPLETED');
      const upcoming = tasks.filter(t => (!t.dueDate || t.dueDate > todayStr) && t.status !== 'COMPLETED');
      const completed = tasks.filter(t => t.status === 'COMPLETED');

      return res.json({
        success: true,
        tasks,
        groups: { dueToday, overdue, upcoming, completed },
        counts: { total: tasks.length, dueToday: dueToday.length, overdue: overdue.length, upcoming: upcoming.length, completed: completed.length },
        isRealMode: false
      });
    }

    // REAL MODE: User Isolation
    const userId = req.user?.id || 'anonymous';
    let tasks = persistentDb.getUserTasks(userId);

    const { status, priority } = req.query;
    if (status && typeof status === 'string' && status !== 'ALL') tasks = tasks.filter(t => t.status === status);
    if (priority && typeof priority === 'string' && priority !== 'ALL') tasks = tasks.filter(t => t.priority === priority);

    const todayStr = new Date().toISOString().split('T')[0];
    const dueToday = tasks.filter(t => t.dueDate === todayStr && t.status !== 'COMPLETED');
    const overdue = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'COMPLETED');
    const upcoming = tasks.filter(t => (!t.dueDate || t.dueDate > todayStr) && t.status !== 'COMPLETED');
    const completed = tasks.filter(t => t.status === 'COMPLETED');

    return res.json({
      success: true,
      tasks,
      groups: { dueToday, overdue, upcoming, completed },
      counts: { total: tasks.length, dueToday: dueToday.length, overdue: overdue.length, upcoming: upcoming.length, completed: completed.length },
      isRealMode: true
    });
  },

  // Update a task
  update: (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    if (req.isDemoUser) {
      const updated = demoStore.updateTask(id, updates);
      return res.json({ success: true, task: updated });
    }

    const updated = persistentDb.updateUserTask(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: `Task ${id} not found.` });
    }

    return res.json({ success: true, task: updated });
  },

  // Mark task as completed
  complete: (req: Request, res: Response) => {
    const { id } = req.params;

    if (req.isDemoUser) {
      const completed = demoStore.completeTask(id);
      return res.json({ success: true, message: 'Task marked as completed.', task: completed });
    }

    const completed = persistentDb.completeUserTask(id);
    if (!completed) {
      return res.status(404).json({ success: false, message: `Task ${id} not found.` });
    }

    return res.json({ success: true, message: 'Task marked as completed.', task: completed });
  },

  // Set real Google Calendar reminder
  setReminder: async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reminderAt } = req.body;

    if (!reminderAt) {
      return res.status(400).json({ success: false, message: 'reminderAt timestamp is required.' });
    }

    if (req.isDemoUser) {
      const updated = demoStore.setCalendarReminder(id, reminderAt);
      return res.json({
        success: true,
        message: 'Reminder simulated (Demo Mode).',
        task: updated
      });
    }

    // REAL MODE
    const task = persistentDb.getTaskById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: `Task ${id} not found.` });
    }

    const tokens = req.user?.googleTokens;
    if (!tokens?.access_token) {
      return res.status(400).json({
        success: false,
        message: 'Google account is not connected. Reconnect Google to create calendar reminders.'
      });
    }

    try {
      const result = await googleService.createLiveCalendarReminder(
        tokens,
        task.title,
        reminderAt,
        task.meetingTitle
      );

      const updated = persistentDb.updateUserTask(id, { reminderAt });

      return res.json({
        success: true,
        message: 'Google Calendar event reminder created successfully.',
        task: updated,
        eventId: result.eventId,
        eventUrl: result.eventUrl
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to create calendar reminder: ${err.message}`
      });
    }
  }
};
