import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { GeminiAnalysisResult, TranscriptEntry } from '../types/index.js';

export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  private getClient(): GoogleGenerativeAI {
    const key = config.gemini.apiKey;
    if (!key) {
      const err: any = new Error(
        'Gemini API key is not configured in the server environment. Please provide GEMINI_API_KEY in your server .env file.'
      );
      err.category = 'MISSING_GEMINI_KEY';
      throw err;
    }
    if (!this.genAI) {
      this.genAI = new GoogleGenerativeAI(key);
    }
    return this.genAI;
  }

  public isConfigured(): boolean {
    return Boolean(config.gemini.apiKey && config.gemini.apiKey.trim().length > 0);
  }

  public getModelName(): string {
    return config.gemini.model || 'gemini-2.5-flash';
  }

  /**
   * Safely test Gemini API connection without exposing keys
   */
  public async testConnection(): Promise<{ success: boolean; model: string; message: string }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        model: this.getModelName(),
        message: 'GEMINI_API_KEY is not configured in the server environment. Please set GEMINI_API_KEY in .env.'
      };
    }

    try {
      const client = this.getClient();
      const model = client.getGenerativeModel({ model: this.getModelName() });
      const response = await model.generateContent('Health check. Reply with one word: READY');
      const text = response.response.text();
      return {
        success: true,
        model: this.getModelName(),
        message: `Successfully connected to ${this.getModelName()}. Response: ${text.trim()}`
      };
    } catch (err: any) {
      return {
        success: false,
        model: this.getModelName(),
        message: `Gemini API connection error: ${err.message || 'Unknown error'}`
      };
    }
  }

  /**
   * Analyze normalized meeting transcript using strict anti-hallucination prompting
   */
  public async analyzeMeeting(
    meetingTitle: string,
    participants: { name: string; email: string }[],
    transcripts: TranscriptEntry[],
    isDemoMode: boolean = false
  ): Promise<GeminiAnalysisResult> {
    if (!isDemoMode && !this.isConfigured()) {
      const err: any = new Error(
        'Gemini API key is not configured in the server environment. Please provide GEMINI_API_KEY in your server .env file.'
      );
      err.category = 'MISSING_GEMINI_KEY';
      throw err;
    }

    if (transcripts.length === 0) {
      const err: any = new Error('Cannot analyze meeting: transcript is empty.');
      err.category = 'TRANSCRIPT_NOT_AVAILABLE';
      throw err;
    }

    const formattedTranscript = transcripts
      .map(t => `[${t.timestamp}] ${t.speaker}: "${t.text}"`)
      .join('\n');

    const participantList = participants.map(p => `${p.name} (${p.email})`).join(', ');

    const systemPrompt = `You are MeetingFlow AI, an executive meeting intelligence engine.
Your task is to analyze the following Google Meet meeting transcript with absolute factual accuracy.

STRICT ACCURACY & ANTI-HALLUCINATION RULES:
1. Extract ONLY facts, decisions, and action items explicitly stated and agreed upon in the transcript.
2. NEVER invent an owner. If someone was not explicitly assigned or did not volunteer for a task, return ownerName as null.
3. NEVER invent a deadline or date. If no due date was explicitly spoken, return dueDate as null.
4. NEVER invent a decision. Only record decisions where speakers explicitly agreed.
5. NEVER convert a casual suggestion or idea ("maybe we could...") into a confirmed action item.
6. Preserve the exact source timestamp (e.g. "10:14") from the transcript where each commitment or decision took place.
7. Set confidence to "high", "medium", or "low".
8. Categorize priority as "HIGH", "MEDIUM", or "LOW" based only on urgency discussed.
9. Evaluate Jira candidacy ("jiraCandidate", boolean):
   - Set true ONLY for concrete technical, engineering, product specification, architecture, bug fix, or business deliverables suitable for sprint tracking (e.g., "fix checkout API error", "update PRD", "write schema migration", "conduct competitor pricing benchmark").
   - Set false for routine follow-ups, casual reminders, chat messages, or meeting notes (e.g., "send presentation deck", "talk next week").
   - Include "jiraReason": string explanation.
   - Include "jiraConfidence": number (0.0 to 1.0).

Return your response strictly as valid JSON adhering to this exact TypeScript structure:
{
  "summary": "Concise 2-3 sentence executive summary of the meeting.",
  "keyDiscussions": ["Bullet 1", "Bullet 2", "Bullet 3"],
  "decisions": [
    {
      "decision": "Concrete decision made",
      "context": "Brief context from conversation",
      "timestamp": "HH:MM"
    }
  ],
  "actionItems": [
    {
      "task": "Action item description",
      "ownerName": "Full Name or null",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "confidence": "high" | "medium" | "low",
      "sourceTimestamp": "HH:MM",
      "jiraCandidate": boolean,
      "jiraReason": "Brief reason why this is/isn't Jira candidate",
      "jiraConfidence": number
    }
  ],
  "participantTodos": [
    {
      "participantName": "Name",
      "task": "Task description",
      "dueDate": "YYYY-MM-DD or null",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "openQuestions": ["Unresolved question 1"]
}
`;

    const userPrompt = `MEETING TITLE: ${meetingTitle}
CONFIRMED ATTENDEES: ${participantList}

TRANSCRIPT:
${formattedTranscript}
`;

    // Real Mode API execution
    if (this.isConfigured()) {
      try {
        const client = this.getClient();
        const model = client.getGenerativeModel({
          model: this.getModelName(),
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1, // Near deterministic for factual extraction
          }
        });

        const result = await model.generateContent([
          { text: systemPrompt },
          { text: userPrompt }
        ]);

        const rawText = result.response.text();
        const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

        try {
          const parsed = JSON.parse(cleanedText) as GeminiAnalysisResult;
          return parsed;
        } catch (parseErr: any) {
          const err: any = new Error(`Failed to parse structured Gemini output: ${parseErr.message}`);
          err.category = 'INVALID_GEMINI_RESPONSE';
          throw err;
        }
      } catch (err: any) {
        if (err.category) throw err;
        console.error(`Gemini API call failed with model ${this.getModelName()}:`, err);
        const wrappedErr: any = new Error(`Gemini AI analysis failed: ${err.message || 'API error'}`);
        wrappedErr.category = 'GEMINI_API_ERROR';
        throw wrappedErr;
      }
    }

    if (isDemoMode) {
      // Deterministic simulation fallback exclusively for Demo Mode
      return this.generateSimulatedAnalysis(meetingTitle, participants, transcripts);
    }

    const missingKeyErr: any = new Error('Gemini API is not configured.');
    missingKeyErr.category = 'MISSING_GEMINI_KEY';
    throw missingKeyErr;
  }

  /**
   * Deterministic extraction fallback for Demo Mode only
   */
  private generateSimulatedAnalysis(
    meetingTitle: string,
    participants: { name: string; email: string }[],
    transcripts: TranscriptEntry[]
  ): GeminiAnalysisResult {
    const summary = `Executive discussion regarding "${meetingTitle}". Key stakeholders reviewed project milestones, resolved operational bottlenecks, and established concrete action items with timestamped commitments.`;

    const keyDiscussions = [
      `Review of project deliverables and technical alignment across ${participants.length} attendees.`,
      `Resolution of architectural constraints and operational workflows.`,
      `Establishment of milestone delivery schedules and sprint priorities.`
    ];

    const decisions = [
      {
        decision: `Approved technical roadmap adjustments for ${meetingTitle}.`,
        context: 'Consensus reached during architecture walkthrough.',
        timestamp: transcripts[1]?.timestamp || '10:05'
      }
    ];

    const actionItems: GeminiAnalysisResult['actionItems'] = [];
    const participantTodos: GeminiAnalysisResult['participantTodos'] = [];

    transcripts.forEach((t) => {
      const textLower = t.text.toLowerCase();
      if (textLower.includes('will') || textLower.includes('finalize') || textLower.includes('prepare') || textLower.includes('review') || textLower.includes('evaluate')) {
        let task = t.text;
        if (task.startsWith('I will ')) task = task.replace('I will ', '');
        if (task.startsWith("I'll ")) task = task.replace("I'll ", '');
        task = task.charAt(0).toUpperCase() + task.slice(1);

        const matchedParticipant = participants.find(p =>
          t.speaker.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
        );

        const ownerName = matchedParticipant ? matchedParticipant.name : t.speaker;
        const priority: 'HIGH' | 'MEDIUM' | 'LOW' = textLower.includes('friday') || textLower.includes('priority') ? 'HIGH' : 'MEDIUM';
        
        let dueDate: string | null = null;
        if (textLower.includes('friday')) {
          const d = new Date();
          d.setDate(d.getDate() + ((7 - d.getDay() + 5) % 7 || 7));
          dueDate = d.toISOString().split('T')[0];
        }

        const isTechTask = textLower.includes('query') || textLower.includes('api') || textLower.includes('proposal') || textLower.includes('copy') || textLower.includes('benchmark');

        actionItems.push({
          task,
          ownerName,
          dueDate,
          priority,
          confidence: 'high',
          sourceTimestamp: t.timestamp,
          jiraCandidate: isTechTask,
          jiraReason: isTechTask ? 'Concrete engineering or business deliverable suitable for Jira issue tracking.' : 'General coordination task.',
          jiraConfidence: isTechTask ? 0.92 : 0.45
        });

        if (ownerName) {
          participantTodos.push({
            participantName: ownerName,
            task,
            dueDate,
            priority
          });
        }
      }
    });

    return {
      summary,
      keyDiscussions,
      decisions,
      actionItems,
      participantTodos,
      openQuestions: ['Are additional stakeholder sign-offs required before production deployment?']
    };
  }

  /**
   * Detect explicit follow-up scheduling intent from meeting transcript using Gemini
   */
  public async detectFollowUpScheduling(
    meetingTitle: string,
    meetingStartTimeIso: string,
    transcripts: TranscriptEntry[],
    isDemoMode: boolean = false
  ): Promise<SchedulingIntentExtraction> {
    console.log('[SchedulingAgent] Analyzing transcript for follow-up scheduling intent...');

    if (transcripts.length === 0) {
      console.log('[SchedulingAgent] Intent detected: false, quote: "" (empty transcript)');
      return { follow_up_intent: false, confidence: 'low' };
    }

    const refDate = new Date(meetingStartTimeIso);
    const validRefDate = !isNaN(refDate.getTime()) ? refDate : new Date();
    const refDateString = validRefDate.toISOString().split('T')[0];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const refDayName = dayNames[validRefDate.getDay()];

    const formattedTranscript = transcripts
      .map(t => `[${t.timestamp}] ${t.speaker}: "${t.text}"`)
      .join('\n');

    const systemPrompt = `You are MeetingFlow AI, an executive calendar intelligence engine.
Your task is to analyze the meeting transcript and determine with absolute certainty if the participants agreed to schedule a concrete follow-up meeting.

STRICT SCHEDULING INTENT RULES:
1. ONLY trigger scheduling if participants explicitly agreed or proposed a concrete follow-up session with a specific or identifiable date/day and time.
   POSITIVE EXAMPLES (MUST TRIGGER):
   - "Let's meet again next Tuesday at 3 PM to review the designs"
   - "Can we sync tomorrow morning at 10 AM to finalize this?"
   - "Let's do a follow-up on Friday at 11 AM"
   - "We need another session next Monday at 2 PM to go over the budget"
   - "Let's schedule the follow-up review for next Monday at 10 AM."

   AMBIGUOUS / NON-BINDING STATEMENTS (MUST NOT TRIGGER - follow_up_intent: false):
   - "Let's catch up sometime next week"
   - "We should talk about this later"
   - "Maybe next month we can review"
   - "I'll see you around"

2. RELATIVE DATE CALCULATION:
   The meeting took place on: ${refDateString} (${refDayName}).
   Calculate the exact "resolved_date" (YYYY-MM-DD) relative to ${refDateString}:
   - "tomorrow" -> day after ${refDateString}
   - "Friday" / "this Friday" -> the upcoming Friday relative to ${refDateString}
   - "next Monday" / "Monday" -> the target Monday relative to ${refDateString}
   - "next Tuesday" -> the target Tuesday relative to ${refDateString}

3. TIME PARSING:
   - "start_time" must be in 24-hour HH:MM format (e.g. "15:00" for 3 PM, "10:00" for 10 AM, "11:30" for 11:30 AM). If only "morning" is said without an hour, default to "10:00". If only "afternoon" without an hour, default to "14:00".
   - "duration_minutes": number (default to 30 if unspecified).
   - "meeting_title": inferred follow-up title (e.g. "Follow-up: [Topic]" or "Design Review Follow-Up").
   - "source_text": the exact sentence spoken in the transcript.
   - "source_timestamp": the timestamp (e.g. "10:14" or "10:35") where the sentence was spoken.

Return strictly valid JSON adhering to this exact schema:
{
  "follow_up_intent": boolean,
  "confidence": "high" | "medium" | "low",
  "source_text": string,
  "source_timestamp": string,
  "meeting_title": string,
  "date_expression": string,
  "resolved_date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "duration_minutes": number,
  "attendee_names": string[]
}
`;

    const userPrompt = `ORIGINAL MEETING TITLE: ${meetingTitle}
REFERENCE DATE: ${refDateString} (${refDayName})

TRANSCRIPT:
${formattedTranscript}
`;

    if (this.isConfigured() && !isDemoMode) {
      try {
        const client = this.getClient();
        const model = client.getGenerativeModel({
          model: this.getModelName(),
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        });

        const result = await model.generateContent([
          { text: systemPrompt },
          { text: userPrompt }
        ]);

        const rawText = result.response.text();
        const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed = JSON.parse(cleanedText) as SchedulingIntentExtraction;

        if (parsed.follow_up_intent) {
          console.log(`[SchedulingAgent] Intent detected: true, quote: "${parsed.source_text || ''}" at ${parsed.source_timestamp || ''}`);
        } else {
          console.log('[SchedulingAgent] Intent detected: false (no explicit follow-up scheduling agreed)');
        }

        return parsed;
      } catch (err: any) {
        console.error('[SchedulingAgent] Gemini API call failed for scheduling detection:', err.message);
        // Fall back to rule-based parser
      }
    }

    // Deterministic Rule-Based Fallback (also used in Demo Mode)
    return this.detectSchedulingIntentRuleBased(meetingTitle, validRefDate, transcripts);
  }

  /**
   * Deterministic rule-based extraction fallback
   */
  private detectSchedulingIntentRuleBased(
    meetingTitle: string,
    refDate: Date,
    transcripts: TranscriptEntry[]
  ): SchedulingIntentExtraction {
    const schedulingRegex = /(?:meet(?:ing)?\s+again|sync|follow-up|follow\s+up|another\s+session|schedule\s+(?:the\s+)?follow-up)\s+(?:on|for|at|tomorrow|next)?\s*([a-zA-Z0-9\s:,]+)/i;
    const timeRegex = /(\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b|\b\d{1,2}\s*o'?clock\b)/i;
    const dayRegex = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/i;

    for (const entry of transcripts) {
      const text = entry.text;
      const lower = text.toLowerCase();

      // Check for ambiguous non-commitments
      if (lower.includes('sometime') || lower.includes('talk about this later') || lower.includes('maybe next month')) {
        continue;
      }

      const hasSchedulingKeyword =
        lower.includes('follow-up') ||
        lower.includes('meet again') ||
        lower.includes('another session') ||
        lower.includes('sync tomorrow') ||
        lower.includes('sync next');

      if (hasSchedulingKeyword) {
        const timeMatch = text.match(timeRegex);
        const dayMatch = text.match(dayRegex);
        const hasNext = lower.includes('next');

        if (dayMatch || timeMatch) {
          const dateExpr = dayMatch ? (hasNext && !dayMatch[0].toLowerCase().includes('next') ? `next ${dayMatch[0]}` : dayMatch[0]) : 'tomorrow';
          let timeStr = '10:00';

          if (timeMatch) {
            const raw = timeMatch[0].toLowerCase().trim();
            const ampm = raw.includes('pm') ? 'pm' : raw.includes('am') ? 'am' : '';
            const numPart = raw.replace(/[^\d:]/g, '');
            let [h, m] = numPart.split(':');
            let hours = parseInt(h, 10);
            let mins = m ? m.padStart(2, '0') : '00';
            if (ampm === 'pm' && hours < 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;
            timeStr = `${String(hours).padStart(2, '0')}:${mins}`;
          } else if (lower.includes('morning')) {
            timeStr = '10:00';
          } else if (lower.includes('afternoon')) {
            timeStr = '14:00';
          }

          // Calculate resolved date
          const resolvedDate = this.calculateTargetDate(refDate, dateExpr);

          console.log(`[SchedulingAgent] Intent detected: true, quote: "${text}"`);
          return {
            follow_up_intent: true,
            confidence: 'high',
            source_text: text,
            source_timestamp: entry.timestamp,
            meeting_title: `Follow-up: ${meetingTitle}`,
            date_expression: dateExpr,
            resolved_date: resolvedDate,
            start_time: timeStr,
            duration_minutes: 30,
            attendee_names: []
          };
        }
      }
    }

    console.log('[SchedulingAgent] Intent detected: false (no explicit follow-up scheduling agreed)');
    return {
      follow_up_intent: false,
      confidence: 'low'
    };
  }

  private calculateTargetDate(refDate: Date, expression: string): string {
    const expr = expression.toLowerCase();
    const target = new Date(refDate);

    if (expr.includes('tomorrow')) {
      target.setDate(target.getDate() + 1);
      return target.toISOString().split('T')[0];
    }

    const daysMap: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6
    };

    for (const [day, dayNum] of Object.entries(daysMap)) {
      if (expr.includes(day)) {
        const currentDay = refDate.getDay();
        let daysAhead = dayNum - currentDay;
        if (daysAhead <= 0) {
          daysAhead += 7;
        }
        if (expr.includes('next') && daysAhead < 7 && currentDay !== dayNum) {
          daysAhead += 7;
        }
        target.setDate(target.getDate() + daysAhead);
        return target.toISOString().split('T')[0];
      }
    }

    target.setDate(target.getDate() + 1);
    return target.toISOString().split('T')[0];
  }
}

export interface SchedulingIntentExtraction {
  follow_up_intent: boolean;
  confidence: 'high' | 'medium' | 'low';
  source_text?: string;
  source_timestamp?: string;
  meeting_title?: string;
  date_expression?: string;
  resolved_date?: string;
  start_time?: string;
  duration_minutes?: number;
  attendee_names?: string[];
}

export const geminiService = new GeminiService();

