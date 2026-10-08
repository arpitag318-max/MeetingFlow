import { persistentDb } from '../db/index.js';
import { demoStore } from '../store/demo-store.js';
import { geminiService } from './gemini.service.js';
import { googleService } from './google.service.js';
import { Meeting, ActionItem, Decision, UserTask, ProcessingJob, TranscriptEntry, FollowUpSchedulingResult } from '../types/index.js';

export class MeetingService {
  /**
   * Process a meeting through the async pipeline:
   * PENDING -> TRANSCRIPT_PENDING -> TRANSCRIPT_FETCHED -> ANALYZING -> COMPLETED
   */
  public async processMeeting(
    meetingId: string,
    userId: string,
    isDemoMode: boolean = false,
    userTokens?: any
  ): Promise<Meeting> {
    if (isDemoMode) {
      return this.processDemoMeeting(meetingId);
    }

    // REAL MODE EXECUTION
    const meeting = persistentDb.getMeetingById(meetingId);
    if (!meeting) {
      const notFoundErr: any = new Error(`Meeting with ID ${meetingId} not found in database.`);
      notFoundErr.category = 'PROCESSING_ERROR';
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    // Step 0: Check if meeting hasn't occurred yet (Upcoming)
    const meetingEndTime = new Date(meeting.endTime).getTime();
    const isUpcoming = Number.isFinite(meetingEndTime) && meetingEndTime > Date.now();

    if (isUpcoming && meeting.status === 'SCHEDULED') {
      const upcomingErr: any = new Error("Meeting hasn't occurred yet. Processing will be available after the meeting.");
      upcomingErr.category = 'MEETING_NOT_COMPLETED';
      upcomingErr.statusCode = 400;
      throw upcomingErr;
    }

    if (!userTokens?.access_token) {
      const authErr: any = new Error('Google Workspace is not connected. Please authenticate with Google.');
      authErr.category = 'MEET_API_PERMISSION_ERROR';
      authErr.statusCode = 401;
      throw authErr;
    }

    // Step 1: PENDING - Check conference artifacts
    this.updateJobState(meetingId, 'PENDING', 'Querying Google Meet conference records...', 15);

    const conferenceId = meeting.meetCode || meeting.googleEventId || meeting.id;
    const availability = await googleService.checkLiveTranscriptAvailability(userTokens, conferenceId);

    if (!availability.available) {
      // Transcript is not available in Google Workspace
      this.updateJobState(
        meetingId,
        'FAILED',
        availability.statusText,
        0,
        availability.statusText
      );
      const transcriptErr: any = new Error(availability.statusText || 'No transcript is available for this meeting.');
      transcriptErr.category = availability.errorCategory || 'TRANSCRIPT_NOT_AVAILABLE';
      transcriptErr.statusCode = availability.errorCategory === 'MEET_API_PERMISSION_ERROR' ? 403 : 404;
      throw transcriptErr;
    }

    // Step 2: TRANSCRIPT_FETCHED - Retrieve & normalize real transcript
    this.updateJobState(
      meetingId,
      'TRANSCRIPT_FETCHED',
      'Google Meet transcript retrieved and normalized',
      50
    );

    const realTranscripts = await googleService.fetchLiveTranscriptEntries(
      userTokens,
      availability.transcriptResource!
    );

    if (!realTranscripts || realTranscripts.length === 0) {
      this.updateJobState(
        meetingId,
        'FAILED',
        'No transcript is available for this meeting.',
        0,
        'No transcript is available for this meeting.'
      );
      const emptyTranscriptErr: any = new Error('No transcript is available for this meeting.');
      emptyTranscriptErr.category = 'TRANSCRIPT_NOT_AVAILABLE';
      emptyTranscriptErr.statusCode = 404;
      throw emptyTranscriptErr;
    }

    meeting.transcripts = realTranscripts;
    persistentDb.saveMeeting(meeting);

    // Step 3: ANALYZING - Send real transcript to Gemini
    this.updateJobState(
      meetingId,
      'ANALYZING',
      `Analyzing transcript with Gemini (${geminiService.getModelName()})...`,
      75
    );

    const analysis = await geminiService.analyzeMeeting(
      meeting.title,
      meeting.participants,
      realTranscripts,
      false // Real Mode: strictly requires live Gemini API
    );

    // AI Follow-up Scheduling Intent Detection & Automatic Booking
    const followUpResult = await this.handleFollowUpScheduling(
      meeting,
      realTranscripts,
      userTokens,
      false
    );

    return this.persistRealAnalysis(meetingId, userId, analysis, followUpResult);
  }

  /**
   * Automatic follow-up meeting detection, availability check, conflict resolution and creation
   */
  public async handleFollowUpScheduling(
    meeting: Meeting,
    transcripts: TranscriptEntry[],
    userTokens?: any,
    isDemoMode: boolean = false
  ): Promise<any> {
    // Duplicate prevention: If already scheduled, return existing result
    if (
      meeting.followUpScheduling?.scheduledEventId &&
      (meeting.followUpScheduling.status === 'SCHEDULED' || meeting.followUpScheduling.status === 'CONFLICT_RESOLVED')
    ) {
      console.log('[SchedulingAgent] Follow-up already scheduled for this meeting (duplicate prevented).');
      return meeting.followUpScheduling;
    }

    try {
      const intent = await geminiService.detectFollowUpScheduling(
        meeting.title,
        meeting.startTime,
        transcripts,
        isDemoMode
      );

      if (!intent.follow_up_intent) {
        return {
          status: 'NO_INTENT_DETECTED',
          confidence: intent.confidence || 'low',
          createdAt: new Date().toISOString()
        };
      }

      // Collect verified participant emails
      const participantEmails = meeting.participants
        .map(p => p.email)
        .filter(e => Boolean(e && e.includes('@')));
      if (meeting.organizerEmail && !participantEmails.includes(meeting.organizerEmail)) {
        participantEmails.unshift(meeting.organizerEmail);
      }
      const attendeeEmails = Array.from(new Set(participantEmails));

      const resolvedDate = intent.resolved_date || new Date(meeting.startTime).toISOString().split('T')[0];
      const requestedTime = intent.start_time || '10:00';
      const durationMinutes = intent.duration_minutes || meeting.durationMinutes || 30;

      // Check Free/Busy Availability and Resolve Conflicts
      const slotResult = await googleService.checkAttendeesAvailabilityAndResolveSlot(
        userTokens,
        attendeeEmails,
        resolvedDate,
        requestedTime,
        durationMinutes
      );

      const title = intent.meeting_title || `Follow-up: ${meeting.title}`;
      const description = `Automatically scheduled by MeetingFlow AI\n\nOriginating Meeting: ${meeting.title}\nTrigger Quote: "${intent.source_text || ''}" at ${intent.source_timestamp || ''}\nAttendees: ${attendeeEmails.join(', ')}\n\nThis follow-up was automatically scheduled based on mutual calendar availability.`;

      let eventResult: { success: boolean; eventId: string; meetUrl: string };

      if (userTokens?.access_token && !isDemoMode) {
        eventResult = await googleService.createFollowUpCalendarEvent(userTokens, {
          title,
          description,
          startTime: slotResult.actualStartTime,
          endTime: slotResult.actualEndTime,
          attendees: attendeeEmails,
          timeZone: slotResult.timeZone
        });
      } else {
        // Deterministic simulation for Demo Mode or mock environment
        const mockCode = `flw-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
        const mockId = `gcal-flw-${Date.now()}`;
        const mockMeetUrl = `https://meet.google.com/${mockCode}`;
        console.log(`[CalendarEvent] Event created: id=${mockId}, meetUrl=${mockMeetUrl}`);
        eventResult = { success: true, eventId: mockId, meetUrl: mockMeetUrl };
      }

      const schedulingResult = {
        status: slotResult.conflictDetected ? 'CONFLICT_RESOLVED' as const : 'SCHEDULED' as const,
        scheduledEventId: eventResult.eventId,
        scheduledMeetUrl: eventResult.meetUrl,
        scheduledTitle: title,
        requestedDate: resolvedDate,
        requestedTime,
        actualStartTime: slotResult.actualStartTime,
        actualEndTime: slotResult.actualEndTime,
        durationMinutes,
        conflictDetected: slotResult.conflictDetected,
        conflictReason: slotResult.conflictReason,
        attendees: attendeeEmails,
        sourceText: intent.source_text,
        sourceTimestamp: intent.source_timestamp,
        confidence: intent.confidence,
        createdAt: new Date().toISOString()
      };

      // Add the auto-scheduled meeting into database so it appears on Dashboard timeline immediately
      const newMeetingId = `meet-flw-${Date.now()}`;
      const followUpMeeting: Meeting = {
        id: newMeetingId,
        googleEventId: eventResult.eventId,
        meetUrl: eventResult.meetUrl,
        meetCode: eventResult.meetUrl.split('/').pop(),
        title,
        description,
        startTime: slotResult.actualStartTime,
        endTime: slotResult.actualEndTime,
        durationMinutes,
        status: 'SCHEDULED',
        organizerId: meeting.organizerId,
        organizerName: meeting.organizerName,
        organizerEmail: meeting.organizerEmail,
        participants: meeting.participants,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (isDemoMode) {
        demoStore.meetings.unshift(followUpMeeting);
      } else {
        persistentDb.saveMeeting(followUpMeeting);
      }

      return schedulingResult;
    } catch (schedErr: any) {
      console.error('[SchedulingAgent] Failed during follow-up scheduling:', schedErr.message);
      return {
        status: 'FAILED',
        conflictReason: schedErr.message,
        createdAt: new Date().toISOString()
      };
    }
  }

  private updateJobState(
    meetingId: string,
    status: ProcessingJob['status'],
    stage: string,
    progress: number,
    error?: string
  ) {
    const existing = persistentDb.getProcessingJob(meetingId);
    const retryCount = (existing?.retryCount || 0) + (status === 'TRANSCRIPT_PENDING' ? 1 : 0);

    const job: ProcessingJob = {
      id: existing?.id || `job-${meetingId}`,
      meetingId,
      status,
      stage,
      progress,
      retryCount,
      lastAttemptAt: new Date().toISOString(),
      error: error || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    persistentDb.saveProcessingJob(job);
  }

  private persistRealAnalysis(meetingId: string, userId: string, analysis: any, followUpResult?: any): Meeting {
    const meeting = persistentDb.getMeetingById(meetingId)!;
    const now = new Date().toISOString();

    const actionItems: ActionItem[] = analysis.actionItems.map((item: any, idx: number) => ({
      id: `act-${Date.now()}-${idx}`,
      meetingId,
      task: item.task,
      ownerName: item.ownerName || null,
      ownerEmail: item.ownerName ? `${item.ownerName.toLowerCase().replace(/\s+/g, '.')}@example.com` : null,
      dueDate: item.dueDate || null,
      priority: item.priority || 'MEDIUM',
      status: 'PENDING',
      confidence: item.confidence || 'high',
      sourceTimestamp: item.sourceTimestamp || null,
      jiraCandidate: Boolean(item.jiraCandidate),
      jiraReason: item.jiraReason || undefined,
      jiraConfidence: typeof item.jiraConfidence === 'number' ? item.jiraConfidence : undefined,
      jiraIssueKey: null,
      jiraIssueUrl: null,
      createdAt: now,
      updatedAt: now
    }));

    const decisions: Decision[] = analysis.decisions.map((d: any, idx: number) => ({
      id: `dec-${Date.now()}-${idx}`,
      meetingId,
      decision: d.decision,
      context: d.context || '',
      timestamp: d.timestamp || '',
      createdAt: now
    }));

    meeting.summary = analysis.summary;
    meeting.keyDiscussions = analysis.keyDiscussions || [];
    meeting.decisions = decisions;
    meeting.actionItems = actionItems;
    meeting.openQuestions = analysis.openQuestions || [];
    if (followUpResult) {
      meeting.followUpScheduling = followUpResult;
    }
    meeting.status = 'COMPLETED';
    meeting.updatedAt = now;

    persistentDb.saveMeeting(meeting);

    // Save job completed
    this.updateJobState(meetingId, 'COMPLETED', 'Action items extracted and assigned', 100);

    // Auto-create personal tasks for the user if assigned or if user is owner
    const user = persistentDb.getUserById(userId);
    const userFirstName = user?.name.split(' ')[0].toLowerCase() || '';

    actionItems.forEach(item => {
      const ownerLower = (item.ownerName || '').toLowerCase();
      if (userFirstName && ownerLower.includes(userFirstName)) {
        persistentDb.saveUserTask({
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          actionItemId: item.id,
          title: item.task,
          meetingId: meeting.id,
          meetingTitle: meeting.title,
          dueDate: item.dueDate,
          priority: item.priority,
          status: 'PENDING',
          jiraIssueKey: null,
          reminderAt: null,
          createdAt: now,
          updatedAt: now
        });
      }
    });

    return persistentDb.getMeetingById(meetingId)!;
  }

  // Demo Mode processing (uses demoStore sandbox)
  private async processDemoMeeting(meetingId: string): Promise<Meeting> {
    const meeting = demoStore.getMeetingById(meetingId);
    if (!meeting) {
      throw new Error(`Demo meeting with ID ${meetingId} not found.`);
    }

    demoStore.updateProcessingState(meetingId, 'TRANSCRIPT_FETCHED', 'Transcript received and normalized', 50);
    demoStore.updateProcessingState(meetingId, 'ANALYZING', 'Analyzing transcript with Gemini...', 75);

    const transcripts = meeting.transcripts || [];
    const analysis = await geminiService.analyzeMeeting(
      meeting.title,
      meeting.participants,
      transcripts,
      true
    );

    const followUpResult = await this.handleFollowUpScheduling(
      meeting,
      transcripts,
      undefined,
      true
    );

    const updated = demoStore.finishMeetingAnalysis(meetingId, {
      summary: analysis.summary,
      keyDiscussions: analysis.keyDiscussions,
      decisions: analysis.decisions.map((d, i) => ({
        id: `d-${Date.now()}-${i}`,
        meetingId,
        decision: d.decision,
        context: d.context,
        timestamp: d.timestamp,
        createdAt: new Date().toISOString()
      })),
      actionItems: analysis.actionItems.map((a, i) => ({
        id: `act-${Date.now()}-${i}`,
        meetingId,
        task: a.task,
        ownerName: a.ownerName,
        ownerEmail: null,
        dueDate: a.dueDate,
        priority: a.priority,
        status: 'PENDING',
        confidence: a.confidence,
        sourceTimestamp: a.sourceTimestamp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
      openQuestions: analysis.openQuestions
    });

    if (updated && followUpResult) {
      updated.followUpScheduling = followUpResult;
    }

    return updated!;
  }
}

export const meetingService = new MeetingService();
