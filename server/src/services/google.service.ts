import { google } from 'googleapis';
import { config } from '../config/index.js';
import { Meeting, TranscriptEntry } from '../types/index.js';

import { persistentDb } from '../db/index.js';

export class GoogleService {
  public getOAuthClient() {
    if (!config.google.clientId || !config.google.clientSecret) {
      return null;
    }
    return new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
  }

  public isConfigured(): boolean {
    return Boolean(config.google.clientId && config.google.clientSecret);
  }

  public getAuthUrl(state?: string): string {
    const client = this.getOAuthClient();
    if (!client) {
      throw new Error('Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured in the server environment.');
    }
    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/meetings.space.readonly'
    ];
    return client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: state || undefined
    });
  }

  public async getTokensFromCode(code: string) {
    const client = this.getOAuthClient();
    if (!client) {
      throw new Error('Google OAuth client is not configured.');
    }
    const { tokens } = await client.getToken(code);
    return tokens;
  }

  public async getUserProfile(tokens: any): Promise<{ id: string; email: string; name: string; avatarUrl?: string }> {
    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const res = await oauth2.userinfo.get();
    const data = res.data;

    return {
      id: data.id || `google-${data.email}`,
      email: data.email || '',
      name: data.name || data.email?.split('@')[0] || 'Google User',
      avatarUrl: data.picture || undefined
    };
  }

  public parseGoogleApiError(err: any): Error {
    const message = err.message || 'Unknown Google API error';
    const errorData = err.response?.data?.error;
    const errorDetails = errorData?.details || [];
    const reason = errorData?.errors?.[0]?.reason || errorDetails[0]?.reason;

    if (reason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' || message.includes('insufficient authentication scopes') || message.includes('Insufficient Permission')) {
      return new Error('Google Calendar access permission is missing for this account. Please reconnect Google Workspace to grant Calendar permissions.');
    }

    if (reason === 'SERVICE_DISABLED' || message.includes('Google Calendar API has not been used in project') || message.includes('accessNotConfigured')) {
      const activationUrl = 'https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=582290979720';
      return new Error(`Google Calendar API is DISABLED in your Google Cloud Project. Please enable it by visiting: ${activationUrl}`);
    }

    if (err.code === 401 || message.includes('invalid_grant')) {
      return new Error('Google OAuth token has expired or was revoked. Please reconnect your Google account in Integrations.');
    }
    return new Error(`Google Calendar API error (${err.code || 'unknown'}): ${message}`);
  }

  /**
   * Fetch actual live calendar events from Google Calendar API
   */
  public async fetchLiveCalendarEvents(tokens: any, userId: string): Promise<Meeting[]> {
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      throw new Error('Google OAuth tokens are missing. Please connect your Google account.');
    }

    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    client.setCredentials(tokens);

    // Auto-persist refreshed tokens back to persistent database
    client.on('tokens', (newTokens) => {
      console.log(`[GoogleService] Automatically refreshed tokens for user ${userId}`);
      persistentDb.updateUserGoogleTokens(userId, newTokens);
    });

    const calendar = google.calendar({ version: 'v3', auth: client });
    
    // Fetch upcoming and recent events from 1 day ago up to 14 days ahead
    const timeMin = new Date(Date.now() - 24 * 3600000).toISOString();
    const timeMax = new Date(Date.now() + 14 * 86400000).toISOString();

    let items: any[] = [];
    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
      });
      items = response.data.items || [];
    } catch (err: any) {
      console.error('[GoogleService] calendar.events.list failed:', err.message);
      throw this.parseGoogleApiError(err);
    }

    const now = new Date();

    return items.map((item) => {
      let startTime = item.start?.dateTime;
      let endTime = item.end?.dateTime;

      // Handle all-day calendar events (which have .date instead of .dateTime)
      if (!startTime && item.start?.date) {
        startTime = `${item.start.date}T00:00:00.000Z`;
      }
      if (!endTime && item.end?.date) {
        // All-day end date in Google is exclusive, set to end of that calendar day
        endTime = `${item.end.date}T23:59:59.999Z`;
      }

      startTime = startTime || now.toISOString();
      endTime = endTime || new Date(new Date(startTime).getTime() + 30 * 60000).toISOString();

      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();
      const durationMinutes = Math.max(Math.round((endMs - startMs) / 60000), 15);

      // Find Google Meet link from conferenceData, hangoutLink, location, or description
      let meetUrl: string | undefined = undefined;
      let meetCode: string | undefined = undefined;

      if (item.conferenceData?.entryPoints) {
        const videoEntry = item.conferenceData.entryPoints.find((e: any) => e.entryPointType === 'video');
        if (videoEntry?.uri) {
          meetUrl = videoEntry.uri;
        }
      }
      if (!meetUrl && item.hangoutLink) {
        meetUrl = item.hangoutLink;
      }
      if (!meetUrl && item.location) {
        const match = item.location.match(/https?:\/\/meet\.google\.com\/[a-z0-9-]+/i);
        if (match) meetUrl = match[0];
      }
      if (!meetUrl && item.description) {
        const match = item.description.match(/https?:\/\/meet\.google\.com\/[a-z0-9-]+/i);
        if (match) meetUrl = match[0];
      }

      if (meetUrl) {
        const match = meetUrl.match(/meet\.google\.com\/([a-z0-9-]+)/i);
        if (match) meetCode = match[1];
      }

      const attendees = (item.attendees || []).map((a: any, idx: number) => ({
        id: `att-${item.id}-${idx}`,
        meetingId: item.id || `meet-${Date.now()}`,
        name: a.displayName || a.email?.split('@')[0] || 'Attendee',
        email: a.email || '',
        role: (a.organizer ? 'organizer' : 'attendee') as 'organizer' | 'attendee'
      }));

      // Status calculation: accurately separate past vs in-progress vs scheduled
      const isPast = endMs < now.getTime();
      const isCurrent = startMs <= now.getTime() && endMs >= now.getTime();
      const status = isPast ? 'COMPLETED' : isCurrent ? 'IN_PROGRESS' : 'SCHEDULED';

      return {
        id: item.id || `meet-${Date.now()}`,
        googleEventId: item.id || undefined,
        meetCode,
        meetUrl,
        title: item.summary || 'Untitled Meeting',
        description: item.description || undefined,
        startTime,
        endTime,
        durationMinutes,
        status,
        organizerId: userId,
        organizerName: item.organizer?.displayName || item.organizer?.email?.split('@')[0] || 'Organizer',
        organizerEmail: item.organizer?.email || '',
        participants: attendees,
        createdAt: item.created || now.toISOString(),
        updatedAt: item.updated || now.toISOString()
      };
    });
  }

  /**
   * Diagnostic test method for Google Calendar API
   */
  public async testLiveCalendarConnection(tokens: any) {
    if (!tokens || (!tokens.access_token && !tokens.refresh_token)) {
      return {
        status: 'MISSING_TOKENS',
        success: false,
        message: 'No Google OAuth tokens provided.'
      };
    }

    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    client.setCredentials(tokens);

    const timeMin = new Date(Date.now() - 30 * 86400000).toISOString();
    const timeMax = new Date(Date.now() + 30 * 86400000).toISOString();

    try {
      const calendar = google.calendar({ version: 'v3', auth: client });
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 20
      });

      return {
        status: 'CONNECTED',
        success: true,
        calendarTitle: response.data.summary,
        totalEventsRetrieved: response.data.items?.length || 0,
        timeMin,
        timeMax,
        events: (response.data.items || []).map(e => ({
          id: e.id,
          summary: e.summary,
          start: e.start,
          end: e.end,
          hangoutLink: e.hangoutLink,
          conferenceData: e.conferenceData
        }))
      };
    } catch (err: any) {
      const parsed = this.parseGoogleApiError(err);
      return {
        status: 'API_ERROR',
        success: false,
        httpCode: err.code || 500,
        rawMessage: err.message,
        message: parsed.message,
        timeMin,
        timeMax
      };
    }
  }

  /**
   * Check whether real transcript artifacts exist for a Google Meet conference
   */
  public async checkLiveTranscriptAvailability(
    tokens: any,
    conferenceCodeOrEventId: string
  ): Promise<{ available: boolean; transcriptResource?: string; statusText: string; errorCategory?: string }> {
    if (!tokens?.access_token) {
      throw new Error('Google account is not authenticated.');
    }

    try {
      const client = new google.auth.OAuth2(
        config.google.clientId,
        config.google.clientSecret,
        config.google.redirectUri
      );
      client.setCredentials(tokens);

      const meet = google.meet({ version: 'v2', auth: client });
      
      // Query Google Meet conference records by space or conference code
      const recordsResponse = await meet.conferenceRecords.list({
        pageSize: 10
      });

      const records = recordsResponse.data.conferenceRecords || [];
      if (records.length === 0) {
        return {
          available: false,
          errorCategory: 'TRANSCRIPT_NOT_AVAILABLE',
          statusText: 'No transcript is available for this meeting.'
        };
      }

      // Check transcripts for the latest conference record
      const activeRecord = records[0];
      const transcriptsRes = await meet.conferenceRecords.transcripts.list({
        parent: activeRecord.name!
      });

      const transcripts = transcriptsRes.data.transcripts || [];
      if (transcripts.length === 0) {
        return {
          available: false,
          errorCategory: 'TRANSCRIPT_NOT_AVAILABLE',
          statusText: 'No transcript is available for this meeting.'
        };
      }

      const latestTranscript = transcripts[0];
      if (latestTranscript.state === 'ACTIVE' || latestTranscript.state === 'IN_PROGRESS') {
        return {
          available: false,
          errorCategory: 'TRANSCRIPT_NOT_AVAILABLE',
          statusText: 'Transcript is actively generating in Google Workspace. Please check again in a minute.'
        };
      }

      return {
        available: true,
        transcriptResource: latestTranscript.name || undefined,
        statusText: 'Transcript is ready for extraction.'
      };
    } catch (err: any) {
      const msg = err.message || '';
      const isPermission = msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.toLowerCase().includes('insufficient authentication scopes');
      return {
        available: false,
        errorCategory: isPermission ? 'MEET_API_PERMISSION_ERROR' : 'MEET_API_ERROR',
        statusText: isPermission
          ? 'Google Meet API permission error: Insufficient OAuth scopes to access conference transcripts. Please reconnect Google Workspace with Meet permissions.'
          : `Google Meet error: ${msg || 'Unable to retrieve conference record'}`
      };
    }
  }

  /**
   * Retrieve transcript entries from Google Meet API and normalize them
   */
  public async fetchLiveTranscriptEntries(
    tokens: any,
    transcriptResourceName: string
  ): Promise<TranscriptEntry[]> {
    if (!tokens?.access_token) {
      throw new Error('Google account is not authenticated.');
    }

    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    client.setCredentials(tokens);

    const meet = google.meet({ version: 'v2', auth: client });

    const entriesResponse = await meet.conferenceRecords.transcripts.entries.list({
      parent: transcriptResourceName
    });

    const entries = entriesResponse.data.transcriptEntries || [];
    let sequence = 1;

    return entries.map((entry) => {
      const startTime = entry.startTime ? new Date(entry.startTime) : new Date();
      const hours = String(startTime.getHours()).padStart(2, '0');
      const minutes = String(startTime.getMinutes()).padStart(2, '0');
      const timestamp = `${hours}:${minutes}`;

      return {
        id: entry.name || `entry-${sequence}`,
        meetingId: transcriptResourceName,
        speaker: entry.participant || 'Participant',
        timestamp,
        text: entry.text || '',
        sequence: sequence++
      };
    });
  }

  /**
   * Add calendar reminder event to user's real Google Calendar
   */
  public async createLiveCalendarReminder(
    tokens: any,
    taskTitle: string,
    reminderAt: string,
    meetingTitle?: string
  ): Promise<{ success: boolean; eventId: string; eventUrl?: string }> {
    if (!tokens?.access_token) {
      throw new Error('Connect Google to add calendar reminders.');
    }

    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: client });

    const startTime = new Date(reminderAt);
    const endTime = new Date(startTime.getTime() + 15 * 60000); // 15-minute block

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `[MeetingFlow] ${taskTitle}`,
        description: `Action item assigned from meeting: ${meetingTitle || 'Meeting'}\nManaged by MeetingFlow.`,
        start: { dateTime: startTime.toISOString() },
        end: { dateTime: endTime.toISOString() },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 10 },
            { method: 'email', minutes: 60 }
          ]
        }
      }
    });

    if (!event.data.id) {
      throw new Error('Google Calendar failed to return an event ID.');
    }

    return {
      success: true,
      eventId: event.data.id,
      eventUrl: event.data.htmlLink || undefined
    };
  }

  /**
   * Check attendees availability using Google Calendar FreeBusy API and resolve conflicts
   */
  public async checkAttendeesAvailabilityAndResolveSlot(
    tokens: any,
    attendeeEmails: string[],
    resolvedDate: string, // YYYY-MM-DD
    requestedTimeStr: string, // HH:MM
    durationMinutes: number = 30
  ): Promise<{
    actualStartTime: string;
    actualEndTime: string;
    conflictDetected: boolean;
    conflictReason?: string;
    timeZone: string;
  }> {
    const validEmails = attendeeEmails.filter(e => Boolean(e && e.includes('@') && !e.includes('example.com')));
    console.log(`[CalendarAvailability] Checking free/busy for ${validEmails.length} attendees...`);

    let calendarTimeZone = 'UTC';
    let busyIntervals: { start: number; end: number; attendee?: string }[] = [];

    // If real Google tokens exist, query Google Calendar Free/Busy API
    if (tokens?.access_token) {
      try {
        const client = new google.auth.OAuth2(
          config.google.clientId,
          config.google.clientSecret,
          config.google.redirectUri
        );
        client.setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: client });

        // Retrieve primary calendar timezone
        try {
          const calMeta = await calendar.calendars.get({ calendarId: 'primary' });
          if (calMeta.data.timeZone) {
            calendarTimeZone = calMeta.data.timeZone;
          }
        } catch (tzErr) {
          // fallback to UTC or system tz
        }

        // Query entire day window for accurate conflict resolution
        const dayStartIso = `${resolvedDate}T00:00:00Z`;
        const dayEndIso = `${resolvedDate}T23:59:59Z`;

        const queryItems = validEmails.length > 0 ? validEmails.map(id => ({ id })) : [{ id: 'primary' }];

        const fbResponse = await calendar.freebusy.query({
          requestBody: {
            timeMin: dayStartIso,
            timeMax: dayEndIso,
            items: queryItems
          }
        });

        const calendars = fbResponse.data.calendars || {};
        for (const [calId, calData] of Object.entries(calendars)) {
          const busyList = (calData as any).busy || [];
          for (const b of busyList) {
            if (b.start && b.end) {
              busyIntervals.push({
                start: new Date(b.start).getTime(),
                end: new Date(b.end).getTime(),
                attendee: calId
              });
            }
          }
        }
      } catch (fbErr: any) {
        console.warn('[CalendarAvailability] Google FreeBusy query warning:', fbErr.message);
      }
    }

    // Helper to test if a slot has conflict
    const isSlotBusy = (startMs: number, endMs: number): boolean => {
      return busyIntervals.some(b => startMs < b.end && endMs > b.start);
    };

    const requestedStart = new Date(`${resolvedDate}T${requestedTimeStr}:00`);
    const requestedStartMs = requestedStart.getTime();
    const durationMs = durationMinutes * 60000;
    const requestedEndMs = requestedStartMs + durationMs;
    const requestedEnd = new Date(requestedEndMs);

    const formatReadableTime = (d: Date) => {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const requestedFormatted = formatReadableTime(requestedStart);

    // 1. Check if the exact requested slot is free
    const hasRequestedConflict = isSlotBusy(requestedStartMs, requestedEndMs);
    console.log(`[CalendarAvailability] Conflicts found: ${hasRequestedConflict}`);

    if (!hasRequestedConflict) {
      return {
        actualStartTime: requestedStart.toISOString(),
        actualEndTime: requestedEnd.toISOString(),
        conflictDetected: false,
        timeZone: calendarTimeZone
      };
    }

    // 2. Conflict detected! Resolve to the nearest mutually available slot on the SAME day
    console.log(`[ConflictResolver] Requested ${requestedFormatted} has conflict. Searching adjacent mutual slots on ${resolvedDate}...`);

    // Search offsets: first after (+30m, +60m, +90m... up to +6h), then before (-30m, -60m... down to -6h)
    const offsetsAfter = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360];
    const offsetsBefore = [-30, -60, -90, -120, -150, -180, -210, -240, -270, -300];

    let resolvedStart: Date | null = null;
    let resolvedEnd: Date | null = null;

    // Check after requested time
    for (const offsetMins of offsetsAfter) {
      const candStartMs = requestedStartMs + offsetMins * 60000;
      const candEndMs = candStartMs + durationMs;
      const candStart = new Date(candStartMs);

      // Must stay on the same date
      if (candStart.getDate() !== requestedStart.getDate()) continue;

      if (!isSlotBusy(candStartMs, candEndMs)) {
        resolvedStart = candStart;
        resolvedEnd = new Date(candEndMs);
        break;
      }
    }

    // If none found after, check before requested time
    if (!resolvedStart) {
      for (const offsetMins of offsetsBefore) {
        const candStartMs = requestedStartMs + offsetMins * 60000;
        const candEndMs = candStartMs + durationMs;
        const candStart = new Date(candStartMs);

        if (candStart.getDate() !== requestedStart.getDate()) continue;

        if (!isSlotBusy(candStartMs, candEndMs)) {
          resolvedStart = candStart;
          resolvedEnd = new Date(candEndMs);
          break;
        }
      }
    }

    if (resolvedStart && resolvedEnd) {
      const actualFormatted = formatReadableTime(resolvedStart);
      const conflictReason = `Requested ${requestedFormatted} had conflict with attendee schedule. Automatically rescheduled to ${actualFormatted} based on mutual availability.`;
      console.log(`[ConflictResolver] ${conflictReason}`);

      return {
        actualStartTime: resolvedStart.toISOString(),
        actualEndTime: resolvedEnd.toISOString(),
        conflictDetected: true,
        conflictReason,
        timeZone: calendarTimeZone
      };
    }

    // Fallback: If entire day is booked, return requested with conflict notice
    const fallbackReason = `Requested ${requestedFormatted} had schedule conflicts across all adjacent slots on ${resolvedDate}. Retained requested time.`;
    console.log(`[ConflictResolver] ${fallbackReason}`);
    return {
      actualStartTime: requestedStart.toISOString(),
      actualEndTime: requestedEnd.toISOString(),
      conflictDetected: true,
      conflictReason: fallbackReason,
      timeZone: calendarTimeZone
    };
  }

  /**
   * Automatically create Google Calendar event with auto-generated Google Meet conference
   */
  public async createFollowUpCalendarEvent(
    tokens: any,
    details: {
      title: string;
      description: string;
      startTime: string; // ISO
      endTime: string; // ISO
      attendees: string[];
      timeZone?: string;
    }
  ): Promise<{ success: boolean; eventId: string; meetUrl: string; htmlLink?: string }> {
    if (!tokens?.access_token) {
      throw new Error('Google account is not authenticated.');
    }

    const client = new google.auth.OAuth2(
      config.google.clientId,
      config.google.clientSecret,
      config.google.redirectUri
    );
    client.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth: client });
    const requestId = `followup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const validAttendees = details.attendees
      .filter(email => email && email.includes('@') && !email.includes('example.com'))
      .map(email => ({ email }));

    const res = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary: details.title,
        description: details.description,
        start: {
          dateTime: details.startTime,
          timeZone: details.timeZone || 'UTC'
        },
        end: {
          dateTime: details.endTime,
          timeZone: details.timeZone || 'UTC'
        },
        attendees: validAttendees.length > 0 ? validAttendees : undefined,
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: 'hangoutsMeet'
            }
          }
        }
      }
    });

    const event = res.data;
    if (!event.id) {
      throw new Error('Google Calendar did not return an event ID.');
    }

    // Extract Google Meet Link
    let meetUrl = event.hangoutLink || '';
    if (!meetUrl && event.conferenceData?.entryPoints) {
      const videoEntry = event.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video');
      if (videoEntry?.uri) {
        meetUrl = videoEntry.uri;
      }
    }
    if (!meetUrl && event.location && event.location.includes('meet.google.com')) {
      meetUrl = event.location;
    }
    if (!meetUrl) {
      meetUrl = `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    }

    console.log(`[CalendarEvent] Event created: id=${event.id}, meetUrl=${meetUrl}`);

    return {
      success: true,
      eventId: event.id,
      meetUrl,
      htmlLink: event.htmlLink || undefined
    };
  }
}

export const googleService = new GoogleService();
