import { Request, Response } from 'express';
import { demoStore } from '../store/demo-store.js';
import { persistentDb } from '../db/index.js';
import { googleService } from '../services/google.service.js';

export const calendarController = {
  // Get upcoming calendar events (Real Mode or Demo Mode)
  getEvents: async (req: Request, res: Response) => {
    if (req.isDemoUser) {
      const upcoming = demoStore.getUpcomingMeetings().map(m => ({
        id: m.googleEventId || m.id,
        meetingId: m.id,
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime,
        durationMinutes: m.durationMinutes,
        meetUrl: m.meetUrl,
        organizer: m.organizerName,
        attendeeCount: m.participants.length
      }));

      return res.json({
        success: true,
        events: upcoming,
        isRealMode: false
      });
    }

    // REAL MODE - Never leak demo store
    if (!req.user) {
      return res.json({
        success: true,
        events: [],
        isRealMode: true,
        isGoogleConnected: false,
        message: 'Sign in to access your calendar events.'
      });
    }

    const tokens = req.user.googleTokens;
    if (tokens?.access_token && (tokens.refresh_token || tokens.scope?.includes('calendar'))) {
      try {
        const live = await googleService.fetchLiveCalendarEvents(tokens, req.user.id);
        persistentDb.syncGoogleCalendarMeetings(req.user.id, live);
      } catch (err: any) {
        console.warn('[CalendarController] Live sync notice in getEvents:', err.message);
      }
    }

    const stored = persistentDb.getMeetingsForUser(req.user.id)
      .filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS')
      .map(m => ({
        id: m.googleEventId || m.id,
        meetingId: m.id,
        title: m.title,
        startTime: m.startTime,
        endTime: m.endTime,
        durationMinutes: m.durationMinutes,
        meetUrl: m.meetUrl,
        organizer: m.organizerName,
        attendeeCount: m.participants.length
      }));

    return res.json({
      success: true,
      events: stored,
      isRealMode: true,
      isGoogleConnected: Boolean(tokens?.access_token && (tokens.refresh_token || tokens.scope?.includes('calendar')))
    });
  },

  // Comprehensive Live Diagnostics for Google Calendar Sync
  getDiagnostics: async (req: Request, res: Response) => {
    const isDemo = Boolean(req.isDemoUser);
    const currentUser = req.user;
    const tokens = currentUser?.googleTokens;

    let apiTest: any = null;
    if (tokens) {
      apiTest = await googleService.testLiveCalendarConnection(tokens);
    } else {
      apiTest = {
        status: 'NO_TOKENS',
        success: false,
        message: 'No Google OAuth tokens stored on the server for this user.'
      };
    }

    const userStoredMeetings = currentUser ? persistentDb.getMeetingsForUser(currentUser.id) : [];

    return res.json({
      timestamp: new Date().toISOString(),
      isRealMode: !isDemo,
      googleOauthConfigured: googleService.isConfigured(),
      currentUser: currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        hasGoogleTokens: Boolean(currentUser.googleTokens),
        tokenExpiry: currentUser.googleTokens?.expiry_date ? new Date(currentUser.googleTokens.expiry_date).toISOString() : null,
        isTokenExpired: currentUser.googleTokens?.expiry_date ? currentUser.googleTokens.expiry_date < Date.now() : null,
        hasRefreshToken: Boolean(currentUser.googleTokens?.refresh_token),
        scopes: currentUser.googleTokens?.scope ? currentUser.googleTokens.scope.split(' ') : []
      } : null,
      googleCalendarApiTest: apiTest,
      databasePersistence: {
        totalStoredMeetingsForUser: userStoredMeetings.length,
        scheduledMeetingsCount: userStoredMeetings.filter(m => m.status === 'SCHEDULED').length,
        inProgressMeetingsCount: userStoredMeetings.filter(m => m.status === 'IN_PROGRESS').length,
        completedMeetingsCount: userStoredMeetings.filter(m => m.status === 'COMPLETED').length,
        sampleMeetings: userStoredMeetings.slice(0, 5).map(m => ({
          id: m.id,
          googleEventId: m.googleEventId,
          title: m.title,
          startTime: m.startTime,
          endTime: m.endTime,
          status: m.status,
          meetUrl: m.meetUrl
        }))
      }
    });
  },

  // Create calendar reminder
  createReminder: async (req: Request, res: Response) => {
    const { taskTitle, reminderAt, meetingTitle, taskId } = req.body;

    if (!taskTitle || !reminderAt) {
      return res.status(400).json({ success: false, message: 'taskTitle and reminderAt are required.' });
    }

    if (req.isDemoUser) {
      return res.json({
        success: true,
        message: 'Calendar reminder scheduled (Demo Mode Simulated).',
        eventId: `sim-${Date.now()}`
      });
    }

    const tokens = req.user?.googleTokens || persistentDb.getUserWithGoogleTokens()?.googleTokens;
    if (!tokens?.access_token && !tokens?.refresh_token) {
      return res.status(400).json({
        success: false,
        message: 'Google account is not connected. Reconnect Google to create calendar reminders.'
      });
    }

    try {
      const result = await googleService.createLiveCalendarReminder(
        tokens,
        taskTitle,
        reminderAt,
        meetingTitle
      );

      return res.json({
        ...result,
        message: 'Google Calendar event reminder created.'
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Failed to create calendar reminder: ${err.message}`
      });
    }
  }
};

