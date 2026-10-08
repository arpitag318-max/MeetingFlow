import { Request, Response } from 'express';
import { persistentDb } from '../db/index.js';
import { demoStore } from '../store/demo-store.js';
import { meetingService } from '../services/meeting.service.js';
import { googleService } from '../services/google.service.js';

export const meetingController = {
  // Get upcoming meetings (Real Google Calendar or isolated Demo Store)
  getUpcoming: async (req: Request, res: Response) => {
    if (req.isDemoUser) {
      const upcoming = demoStore.getUpcomingMeetings();
      return res.json({
        success: true,
        meetings: upcoming,
        count: upcoming.length,
        isRealMode: false
      });
    }

    // REAL MODE
    if (!req.user) {
      return res.json({
        success: true,
        meetings: [],
        count: 0,
        isRealMode: true,
        isGoogleConnected: false,
        message: 'Sign in with Google to view your upcoming calendar meetings.'
      });
    }

    const tokens = req.user.googleTokens;
    const isTokenCalendarCapable = Boolean(
      tokens?.refresh_token ||
      (tokens?.scope && (tokens.scope.includes('calendar') || tokens.scope.includes('meetings')))
    );

    if (tokens?.access_token && isTokenCalendarCapable) {
      try {
        // Sync live Google Calendar events into persistent database
        const liveMeetings = await googleService.fetchLiveCalendarEvents(tokens, req.user.id);
        const storedMeetings = persistentDb.syncGoogleCalendarMeetings(req.user.id, liveMeetings);
        // Include BOTH SCHEDULED and IN_PROGRESS meetings
        const upcoming = storedMeetings.filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');
        return res.json({
          success: true,
          meetings: upcoming,
          count: upcoming.length,
          isRealMode: true,
          isGoogleConnected: true
        });
      } catch (err: any) {
        console.error('Failed to sync live Google Calendar:', err);
        // Fall back to database stored meetings for this user
        const stored = persistentDb.getMeetingsForUser(req.user.id).filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');
        return res.json({
          success: false,
          meetings: stored,
          count: stored.length,
          isRealMode: true,
          isGoogleConnected: false,
          warning: err.message,
          message: err.message
        });
      }
    }

    // Google not connected yet for this user
    const stored = persistentDb.getMeetingsForUser(req.user.id).filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');
    return res.json({
      success: true,
      meetings: stored,
      count: stored.length,
      isRealMode: true,
      isGoogleConnected: false,
      message: 'Connect your Google account to sync your live calendar meetings.'
    });
  },

  // Get all meetings for authenticated user
  getAll: (req: Request, res: Response) => {
    if (req.isDemoUser) {
      const { status, search } = req.query;
      let meetings = demoStore.getMeetings();
      if (status && typeof status === 'string' && status !== 'ALL') {
        meetings = meetings.filter(m => m.status === status);
      }
      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        meetings = meetings.filter(m =>
          m.title.toLowerCase().includes(q) ||
          m.participants.some(p => p.name.toLowerCase().includes(q))
        );
      }
      return res.json({ success: true, meetings, total: meetings.length, isRealMode: false });
    }

    // REAL MODE: User Data Isolation
    const userId = req.user?.id || 'anonymous';
    let meetings = persistentDb.getMeetingsForUser(userId);

    const { status, search } = req.query;
    if (status && typeof status === 'string' && status !== 'ALL') {
      meetings = meetings.filter(m => m.status === status);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      meetings = meetings.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.participants.some(p => p.name.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      meetings,
      total: meetings.length,
      isRealMode: true
    });
  },

  // Get single meeting by ID
  getById: (req: Request, res: Response) => {
    const { id } = req.params;

    if (req.isDemoUser) {
      const meeting = demoStore.getMeetingById(id);
      if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found.' });
      return res.json({ success: true, meeting });
    }

    // REAL MODE
    const meeting = persistentDb.getMeetingById(id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: `Meeting with ID ${id} not found.`
      });
    }

    return res.json({
      success: true,
      meeting
    });
  },

  // Get normalized meeting transcript
  getTranscript: (req: Request, res: Response) => {
    const { id } = req.params;

    if (req.isDemoUser) {
      const meeting = demoStore.getMeetingById(id);
      return res.json({
        success: true,
        transcripts: meeting?.transcripts || []
      });
    }

    const meeting = persistentDb.getMeetingById(id);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found.' });
    }

    return res.json({
      success: true,
      transcripts: meeting.transcripts || []
    });
  },

  // Get real processing job status
  getProcessingStatus: (req: Request, res: Response) => {
    const { id } = req.params;

    if (req.isDemoUser) {
      const meeting = demoStore.getMeetingById(id);
      return res.json({
        success: true,
        processingJob: meeting?.processingJob || {
          status: meeting?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
          stage: 'Ready',
          progress: 0,
          retryCount: 0
        }
      });
    }

    const job = persistentDb.getProcessingJob(id);
    const meeting = persistentDb.getMeetingById(id);

    return res.json({
      success: true,
      processingJob: job || {
        id: `job-${id}`,
        meetingId: id,
        status: meeting?.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        stage: meeting?.status === 'COMPLETED' ? 'Analysis complete' : 'Awaiting trigger',
        progress: meeting?.status === 'COMPLETED' ? 100 : 0,
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  },

  // Process meeting asynchronously (Real or Demo)
  processMeeting: async (req: Request, res: Response) => {
    const { id } = req.params;
    const isDemoMode = Boolean(req.isDemoUser || req.body.isDemoMode);

    try {
      const userId = req.user?.id || 'demo-user-id';
      const userTokens = req.user?.googleTokens;

      const updatedMeeting = await meetingService.processMeeting(id, userId, isDemoMode, userTokens);

      return res.json({
        success: true,
        message: 'Meeting processed.',
        meeting: updatedMeeting
      });
    } catch (err: any) {
      const statusCode = err.statusCode || (err.category === 'MISSING_GEMINI_KEY' ? 503 : 500);
      return res.status(statusCode).json({
        success: false,
        category: err.category || 'PROCESSING_ERROR',
        message: err.message || 'Processing failed'
      });
    }
  },

  // Simulate new meeting in Demo Mode only
  simulateMeeting: (req: Request, res: Response) => {
    const newMeeting = demoStore.simulateNewMeeting();
    return res.status(201).json({
      success: true,
      message: 'Simulated meeting created for Demo Mode.',
      meeting: newMeeting
    });
  }
};
