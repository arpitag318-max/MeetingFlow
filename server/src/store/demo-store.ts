import {
  User,
  Meeting,
  UserTask,
  ActionItem,
  Decision,
  TranscriptEntry,
  AnalyticsSummary,
  ProcessingStatus
} from '../types/index.js';

export class DemoStore {
  public currentUser: User = {
    id: 'user-rahul-sharma',
    email: 'rahul.sharma@meetingflow.io',
    name: 'Rahul Sharma',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  public meetings: Meeting[] = [];
  public userTasks: UserTask[] = [];
  private seededDateKey: string = '';

  constructor() {
    this.seedData();
  }

  public ensureFreshDates(): void {
    const todayStr = new Date().toISOString().split('T')[0];
    if (this.seededDateKey === todayStr && this.meetings.length > 0) {
      return;
    }
    this.seedData();
  }

  private seedData() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    this.seededDateKey = todayStr;

    // Seed 5 Upcoming Meetings
    const upcomingMeetings: Meeting[] = [
      {
        id: 'meet-up-1',
        googleEventId: 'gcal-evt-101',
        meetCode: 'abc-defg-hij',
        meetUrl: 'https://meet.google.com/abc-defg-hij',
        title: 'Product Strategy & Q4 Roadmap Review',
        description: 'Review quarterly goals, enterprise client feedback, and sprint prioritization.',
        startTime: `${todayStr}T10:00:00.000Z`,
        endTime: `${todayStr}T11:00:00.000Z`,
        durationMinutes: 60,
        status: 'SCHEDULED',
        organizerId: this.currentUser.id,
        organizerName: 'Rahul Sharma',
        organizerEmail: 'rahul.sharma@meetingflow.io',
        participants: [
          { id: 'p1', meetingId: 'meet-up-1', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'organizer' },
          { id: 'p2', meetingId: 'meet-up-1', name: 'Arpita Sen', email: 'arpita.sen@meetingflow.io', role: 'attendee' },
          { id: 'p3', meetingId: 'meet-up-1', name: 'Ananya Roy', email: 'ananya.roy@meetingflow.io', role: 'attendee' },
          { id: 'p4', meetingId: 'meet-up-1', name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'attendee' },
          { id: 'p5', meetingId: 'meet-up-1', name: 'Pooja Hegde', email: 'pooja.hegde@meetingflow.io', role: 'attendee' },
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'meet-up-2',
        googleEventId: 'gcal-evt-102',
        meetCode: 'mno-pqrs-tuv',
        meetUrl: 'https://meet.google.com/mno-pqrs-tuv',
        title: 'Frontend Architecture & Design System Sync',
        description: 'Aligning React 19 component library, Tailwind tokens, and accessibility standards.',
        startTime: `${todayStr}T11:30:00.000Z`,
        endTime: `${todayStr}T12:15:00.000Z`,
        durationMinutes: 45,
        status: 'SCHEDULED',
        organizerId: 'user-arpita-sen',
        organizerName: 'Arpita Sen',
        organizerEmail: 'arpita.sen@meetingflow.io',
        participants: [
          { id: 'p6', meetingId: 'meet-up-2', name: 'Arpita Sen', email: 'arpita.sen@meetingflow.io', role: 'organizer' },
          { id: 'p7', meetingId: 'meet-up-2', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'attendee' },
          { id: 'p8', meetingId: 'meet-up-2', name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'attendee' },
        ],
        createdAt: new Date(Date.now() - 43200000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
      },
      {
        id: 'meet-up-3',
        googleEventId: 'gcal-evt-103',
        meetCode: 'wxy-zabc-def',
        meetUrl: 'https://meet.google.com/wxy-zabc-def',
        title: 'Client Onboarding & Enterprise Integration Kickoff',
        description: 'Technical walkthrough of SSO, SCIM provisioning, and data export endpoints with Acme Corp.',
        startTime: `${todayStr}T14:00:00.000Z`,
        endTime: `${todayStr}T15:00:00.000Z`,
        durationMinutes: 60,
        status: 'SCHEDULED',
        organizerId: 'user-ananya-roy',
        organizerName: 'Ananya Roy',
        organizerEmail: 'ananya.roy@meetingflow.io',
        participants: [
          { id: 'p9', meetingId: 'meet-up-3', name: 'Ananya Roy', email: 'ananya.roy@meetingflow.io', role: 'organizer' },
          { id: 'p10', meetingId: 'meet-up-3', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'attendee' },
          { id: 'p11', meetingId: 'meet-up-3', name: 'Sarah Jenkins', email: 'sarah@acmecorp.com', role: 'attendee' },
          { id: 'p12', meetingId: 'meet-up-3', name: 'David Miller', email: 'david@acmecorp.com', role: 'attendee' },
        ],
        createdAt: new Date(Date.now() - 21600000).toISOString(),
        updatedAt: new Date(Date.now() - 21600000).toISOString(),
      },
      {
        id: 'meet-up-4',
        googleEventId: 'gcal-evt-104',
        meetCode: 'jkl-mnop-qrs',
        meetUrl: 'https://meet.google.com/jkl-mnop-qrs',
        title: 'Security Audit & Data Compliance Check',
        description: 'SOC2 Type II remediation progress and OAuth token rotation policy review.',
        startTime: `${todayStr}T15:30:00.000Z`,
        endTime: `${todayStr}T16:15:00.000Z`,
        durationMinutes: 45,
        status: 'SCHEDULED',
        organizerId: 'user-vikram-patel',
        organizerName: 'Vikram Patel',
        organizerEmail: 'vikram.patel@meetingflow.io',
        participants: [
          { id: 'p13', meetingId: 'meet-up-4', name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'organizer' },
          { id: 'p14', meetingId: 'meet-up-4', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'attendee' },
          { id: 'p15', meetingId: 'meet-up-4', name: 'Pooja Hegde', email: 'pooja.hegde@meetingflow.io', role: 'attendee' },
        ],
        createdAt: new Date(Date.now() - 10800000).toISOString(),
        updatedAt: new Date(Date.now() - 10800000).toISOString(),
      },
      {
        id: 'meet-up-5',
        googleEventId: 'gcal-evt-105',
        meetCode: 'tuv-wxyz-abc',
        meetUrl: 'https://meet.google.com/tuv-wxyz-abc',
        title: 'Weekly Engineering All-Hands & Sprint Planning',
        description: 'Engineering velocity, release milestones, and platform reliability updates.',
        startTime: `${todayStr}T17:00:00.000Z`,
        endTime: `${todayStr}T17:45:00.000Z`,
        durationMinutes: 45,
        status: 'SCHEDULED',
        organizerId: this.currentUser.id,
        organizerName: 'Rahul Sharma',
        organizerEmail: 'rahul.sharma@meetingflow.io',
        participants: [
          { id: 'p16', meetingId: 'meet-up-5', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'organizer' },
          { id: 'p17', meetingId: 'meet-up-5', name: 'Arpita Sen', email: 'arpita.sen@meetingflow.io', role: 'attendee' },
          { id: 'p18', meetingId: 'meet-up-5', name: 'Ananya Roy', email: 'ananya.roy@meetingflow.io', role: 'attendee' },
          { id: 'p19', meetingId: 'meet-up-5', name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'attendee' },
        ],
        createdAt: new Date(Date.now() - 5400000).toISOString(),
        updatedAt: new Date(Date.now() - 5400000).toISOString(),
      }
    ];

    // Seed 5 Completed Meetings with Rich Transcripts & AI Artifacts
    const completedMeetings: Meeting[] = [
      {
        id: 'meet-comp-1',
        googleEventId: 'gcal-evt-001',
        meetCode: 'red-blue-grn',
        meetUrl: 'https://meet.google.com/red-blue-grn',
        title: 'Q3 Product Launch & Go-To-Market Debrief',
        description: 'Post-launch metrics, customer conversion funnel, and feature adoption review.',
        startTime: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        endTime: new Date(Date.now() - 169200000).toISOString(),
        durationMinutes: 60,
        status: 'COMPLETED',
        organizerId: this.currentUser.id,
        organizerName: 'Rahul Sharma',
        organizerEmail: 'rahul.sharma@meetingflow.io',
        participants: [
          { id: 'cp1', meetingId: 'meet-comp-1', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'organizer' },
          { id: 'cp2', meetingId: 'meet-comp-1', name: 'Arpita Sen', email: 'arpita.sen@meetingflow.io', role: 'attendee' },
          { id: 'cp3', meetingId: 'meet-comp-1', name: 'Ananya Roy', email: 'ananya.roy@meetingflow.io', role: 'attendee' },
          { id: 'cp4', meetingId: 'meet-comp-1', name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'attendee' },
        ],
        transcripts: [
          { id: 't1', meetingId: 'meet-comp-1', sequence: 1, speaker: 'Rahul', timestamp: '10:02', text: 'Good morning everyone. Let\'s debrief the Q3 launch numbers and tackle our marketing backlog.' },
          { id: 't2', meetingId: 'meet-comp-1', sequence: 2, speaker: 'Arpita', timestamp: '10:05', text: 'Overall signups grew by 38%, but onboarding drop-off is concentrated on the OAuth verification screen.' },
          { id: 't3', meetingId: 'meet-comp-1', sequence: 3, speaker: 'Vikram', timestamp: '10:09', text: 'That is due to the latency in checking Google permissions. We can cache the token exchange profile.' },
          { id: 't4', meetingId: 'meet-comp-1', sequence: 4, speaker: 'Rahul', timestamp: '10:14', text: 'Agreed. Rahul will finalize the campaign creative and copy revisions by Friday.' },
          { id: 't5', meetingId: 'meet-comp-1', sequence: 5, speaker: 'Arpita', timestamp: '10:16', text: 'I will prepare the revised enterprise client proposal and send it out.' },
          { id: 't6', meetingId: 'meet-comp-1', sequence: 6, speaker: 'Ananya', timestamp: '10:22', text: 'I\'ll finish the competitor pricing benchmark and deck update by October 2nd.' },
          { id: 't7', meetingId: 'meet-comp-1', sequence: 7, speaker: 'Vikram', timestamp: '10:28', text: 'I\'ll optimize the backend token exchange query to bring p95 response time under 120ms.' },
          { id: 't8', meetingId: 'meet-comp-1', sequence: 8, speaker: 'Rahul', timestamp: '10:35', text: 'Terrific. Let\'s schedule the follow-up review for next Monday at 2 PM to go over the marketing copy.' }
        ],
        summary: 'The team reviewed Q3 launch metrics, noting 38% user growth alongside onboarding friction during OAuth verification. Architectural optimizations were approved to cache token validation, while marketing and enterprise proposal deliverables were assigned with firm dates.',
        keyDiscussions: [
          '38% quarter-over-quarter signup expansion following the product announcement.',
          'Onboarding funnel drop-off identified around Google OAuth token verification latency.',
          'Backend caching strategy proposed to bring latency under 120ms.',
          'Enterprise pricing and competitor tier adjustments.'
        ],
        decisions: [
          { id: 'd1', meetingId: 'meet-comp-1', decision: 'Cache Google OAuth token validation responses in Redis to eliminate onboarding drop-off.', context: 'Identified as main source of latency during signup.', timestamp: '10:09', createdAt: new Date().toISOString() },
          { id: 'd2', meetingId: 'meet-comp-1', decision: 'Postpone paid ad campaigns until landing page conversion rate reaches 4.5%.', context: 'Budget efficiency consensus.', timestamp: '10:15', createdAt: new Date().toISOString() }
        ],
        actionItems: [
          {
            id: 'act-1',
            meetingId: 'meet-comp-1',
            task: 'Finalize campaign creative and copy revisions',
            ownerName: 'Rahul Sharma',
            ownerEmail: 'rahul.sharma@meetingflow.io',
            dueDate: `${todayStr}`,
            priority: 'HIGH',
            status: 'PENDING',
            confidence: 'high',
            sourceTimestamp: '10:14',
            jiraIssueKey: 'JIRA-141',
            jiraIssueUrl: 'https://jira.atlassian.net/browse/JIRA-141',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'act-2',
            meetingId: 'meet-comp-1',
            task: 'Prepare revised enterprise client proposal',
            ownerName: 'Arpita Sen',
            ownerEmail: 'arpita.sen@meetingflow.io',
            dueDate: null,
            priority: 'HIGH',
            status: 'PENDING',
            confidence: 'high',
            sourceTimestamp: '10:16',
            jiraIssueKey: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'act-3',
            meetingId: 'meet-comp-1',
            task: 'Complete competitor pricing benchmark and deck update',
            ownerName: 'Ananya Roy',
            ownerEmail: 'ananya.roy@meetingflow.io',
            dueDate: '2026-10-02',
            priority: 'MEDIUM',
            status: 'PENDING',
            confidence: 'high',
            sourceTimestamp: '10:22',
            jiraIssueKey: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'act-4',
            meetingId: 'meet-comp-1',
            task: 'Optimize backend token exchange query to reduce p95 latency under 120ms',
            ownerName: 'Vikram Patel',
            ownerEmail: 'vikram.patel@meetingflow.io',
            dueDate: '2026-10-05',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            confidence: 'high',
            sourceTimestamp: '10:28',
            jiraIssueKey: 'JIRA-144',
            jiraIssueUrl: 'https://jira.atlassian.net/browse/JIRA-144',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        openQuestions: [
          'Should enterprise tiers include custom SLA terms by default or as an add-on?',
          'Will the Redis cache require multi-region replication before European launch?'
        ],
        followUpScheduling: {
          status: 'CONFLICT_RESOLVED',
          scheduledEventId: 'gcal-flw-101',
          scheduledMeetUrl: 'https://meet.google.com/flw-mkt-rev',
          scheduledTitle: 'Follow-up: Q3 Product Launch & Go-To-Market Debrief',
          requestedDate: '2026-10-12',
          requestedTime: '14:00',
          actualStartTime: '2026-10-12T15:00:00.000Z',
          actualEndTime: '2026-10-12T15:30:00.000Z',
          durationMinutes: 30,
          conflictDetected: true,
          conflictReason: 'Requested 2:00 PM had conflict with attendee schedule. Automatically rescheduled to 3:00 PM based on mutual availability.',
          attendees: [
            'rahul.sharma@meetingflow.io',
            'arpita.sen@meetingflow.io',
            'ananya.roy@meetingflow.io',
            'vikram.patel@meetingflow.io'
          ],
          sourceText: "Terrific. Let's schedule the follow-up review for next Monday at 2 PM to go over the marketing copy.",
          sourceTimestamp: '10:35',
          confidence: 'high',
          createdAt: new Date(Date.now() - 169000000).toISOString()
        },
        processingJob: {
          id: 'job-1',
          meetingId: 'meet-comp-1',
          status: 'COMPLETED',
          stage: 'Analysis complete and action items extracted',
          progress: 100,
          retryCount: 0,
          lastAttemptAt: new Date(Date.now() - 169000000).toISOString(),
          createdAt: new Date(Date.now() - 169200000).toISOString(),
          updatedAt: new Date(Date.now() - 169000000).toISOString(),
        },
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 169000000).toISOString(),
      },
      {
        id: 'meet-comp-2',
        googleEventId: 'gcal-evt-002',
        meetCode: 'xyz-uvw-rst',
        meetUrl: 'https://meet.google.com/xyz-uvw-rst',
        title: 'Billing Engine & Stripe Webhook Infrastructure',
        description: 'Architecture review for subscription lifecycle, failed payment retries, and invoice PDFs.',
        startTime: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        endTime: new Date(Date.now() - 256500000).toISOString(),
        durationMinutes: 45,
        status: 'COMPLETED',
        organizerId: 'user-vikram-patel',
        organizerName: 'Vikram Patel',
        organizerEmail: 'vikram.patel@meetingflow.io',
        participants: [
          { id: 'cp5', meetingId: 'meet-comp-2', name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'organizer' },
          { id: 'cp6', meetingId: 'meet-comp-2', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'attendee' },
          { id: 'cp7', meetingId: 'meet-comp-2', name: 'Pooja Hegde', email: 'pooja.hegde@meetingflow.io', role: 'attendee' },
        ],
        transcripts: [
          { id: 't9', meetingId: 'meet-comp-2', sequence: 1, speaker: 'Vikram', timestamp: '14:00', text: 'Let\'s review the Stripe webhook idempotency key handling.' },
          { id: 't10', meetingId: 'meet-comp-2', sequence: 2, speaker: 'Rahul', timestamp: '14:10', text: 'I will draft the billing failure notification email templates for customers.' },
          { id: 't11', meetingId: 'meet-comp-2', sequence: 3, speaker: 'Pooja', timestamp: '14:25', text: 'I will write the Prisma schema migration for invoice event logs.' },
        ],
        summary: 'Finalized idempotent webhook handling for Stripe charge events and established retry backoff policies for dunning management.',
        keyDiscussions: [
          'Webhook replay protection using Redis idempotency locks.',
          'Dunning cycle notifications and grace period definitions.'
        ],
        decisions: [
          { id: 'd3', meetingId: 'meet-comp-2', decision: 'Adopt 72-hour grace period for recurring payment retries before downgrading accounts.', context: 'Industry standard for B2B SaaS.', timestamp: '14:18', createdAt: new Date().toISOString() }
        ],
        actionItems: [
          {
            id: 'act-5',
            meetingId: 'meet-comp-2',
            task: 'Draft billing failure customer notification templates',
            ownerName: 'Rahul Sharma',
            ownerEmail: 'rahul.sharma@meetingflow.io',
            dueDate: `${todayStr}`,
            priority: 'HIGH',
            status: 'PENDING',
            confidence: 'high',
            sourceTimestamp: '14:10',
            jiraIssueKey: 'JIRA-142',
            jiraIssueUrl: 'https://jira.atlassian.net/browse/JIRA-142',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'act-6',
            meetingId: 'meet-comp-2',
            task: 'Write Prisma schema migration for invoice event logs',
            ownerName: 'Pooja Hegde',
            ownerEmail: 'pooja.hegde@meetingflow.io',
            dueDate: '2026-10-04',
            priority: 'MEDIUM',
            status: 'COMPLETED',
            confidence: 'high',
            sourceTimestamp: '14:25',
            jiraIssueKey: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        openQuestions: [],
        processingJob: {
          id: 'job-2',
          meetingId: 'meet-comp-2',
          status: 'COMPLETED',
          stage: 'Analysis complete',
          progress: 100,
          retryCount: 0,
          createdAt: new Date(Date.now() - 256500000).toISOString(),
          updatedAt: new Date(Date.now() - 256300000).toISOString(),
        },
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 256300000).toISOString(),
      },
      {
        id: 'meet-comp-3',
        googleEventId: 'gcal-evt-003',
        meetCode: 'uxr-feed-syn',
        meetUrl: 'https://meet.google.com/uxr-feed-syn',
        title: 'Customer Feedback & UX Research Synthesis',
        description: 'Qualitative insights from 15 enterprise beta customer interviews.',
        startTime: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        endTime: new Date(Date.now() - 342000000).toISOString(),
        durationMinutes: 60,
        status: 'COMPLETED',
        organizerId: 'user-arpita-sen',
        organizerName: 'Arpita Sen',
        organizerEmail: 'arpita.sen@meetingflow.io',
        participants: [
          { id: 'cp8', meetingId: 'meet-comp-3', name: 'Arpita Sen', email: 'arpita.sen@meetingflow.io', role: 'organizer' },
          { id: 'cp9', meetingId: 'meet-comp-3', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'attendee' },
          { id: 'cp10', meetingId: 'meet-comp-3', name: 'Ananya Roy', email: 'ananya.roy@meetingflow.io', role: 'attendee' },
        ],
        transcripts: [
          { id: 't12', meetingId: 'meet-comp-3', sequence: 1, speaker: 'Arpita', timestamp: '11:00', text: 'Customers love the automated meeting summaries, but want one-click Jira ticket creation.' },
          { id: 't13', meetingId: 'meet-comp-3', sequence: 2, speaker: 'Rahul', timestamp: '11:15', text: 'I will design the inline Jira integration button and modal workflow.' },
          { id: 't14', meetingId: 'meet-comp-3', sequence: 3, speaker: 'Ananya', timestamp: '11:35', text: 'I will document the customer quotes for the product marketing case study.' }
        ],
        summary: 'Enterprise customers highlighted the accuracy of AI transcript summaries as their favorite capability, while requesting direct two-way Jira and Calendar sync to replace manual task entry.',
        keyDiscussions: [
          'High user retention among managers conducting 4+ meetings weekly.',
          'Strong demand for batch export of action items directly to Jira sprints.'
        ],
        decisions: [
          { id: 'd4', meetingId: 'meet-comp-3', decision: 'Prioritize native Jira REST API integration above Slack webhook notifications in current sprint.', context: 'Direct request from 12 of 15 interviewed customers.', timestamp: '11:20', createdAt: new Date().toISOString() }
        ],
        actionItems: [
          {
            id: 'act-7',
            meetingId: 'meet-comp-3',
            task: 'Design inline Jira integration button and modal workflow',
            ownerName: 'Rahul Sharma',
            ownerEmail: 'rahul.sharma@meetingflow.io',
            dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // yesterday (overdue demo)
            priority: 'HIGH',
            status: 'PENDING',
            confidence: 'high',
            sourceTimestamp: '11:15',
            jiraIssueKey: 'JIRA-143',
            jiraIssueUrl: 'https://jira.atlassian.net/browse/JIRA-143',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'act-8',
            meetingId: 'meet-comp-3',
            task: 'Document customer quotes for marketing case study',
            ownerName: 'Ananya Roy',
            ownerEmail: 'ananya.roy@meetingflow.io',
            dueDate: '2026-10-06',
            priority: 'LOW',
            status: 'COMPLETED',
            confidence: 'medium',
            sourceTimestamp: '11:35',
            jiraIssueKey: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        openQuestions: [],
        processingJob: {
          id: 'job-3',
          meetingId: 'meet-comp-3',
          status: 'COMPLETED',
          stage: 'Analysis complete',
          progress: 100,
          retryCount: 0,
          createdAt: new Date(Date.now() - 342000000).toISOString(),
          updatedAt: new Date(Date.now() - 341800000).toISOString(),
        },
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 341800000).toISOString(),
      },
      {
        id: 'meet-comp-4',
        googleEventId: 'gcal-evt-004',
        meetCode: 'mob-perf-sync',
        meetUrl: 'https://meet.google.com/mob-perf-sync',
        title: 'Mobile App Performance & Offline Sync Architecture',
        description: 'Reviewing responsive mobile experience, touch responsiveness, and local caching.',
        startTime: new Date(Date.now() - 432000000).toISOString(), // 5 days ago
        endTime: new Date(Date.now() - 428400000).toISOString(),
        durationMinutes: 60,
        status: 'COMPLETED',
        organizerId: this.currentUser.id,
        organizerName: 'Rahul Sharma',
        organizerEmail: 'rahul.sharma@meetingflow.io',
        participants: [
          { id: 'cp11', meetingId: 'meet-comp-4', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'organizer' },
          { id: 'cp12', meetingId: 'meet-comp-4', name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'attendee' },
        ],
        transcripts: [
          { id: 't15', meetingId: 'meet-comp-4', sequence: 1, speaker: 'Rahul', timestamp: '16:00', text: 'We must ensure tasks can be checked off smoothly on mobile screens without horizontal jitter.' },
          { id: 't16', meetingId: 'meet-comp-4', sequence: 2, speaker: 'Vikram', timestamp: '16:20', text: 'I will benchmark bottom navigation drawer animations on 375px viewport.' }
        ],
        summary: 'Architected responsive mobile viewport standards and bottom sheet modals for hand-held task triage.',
        keyDiscussions: [
          'Ensuring zero horizontal page overflow on small 375px/390px mobile screens.',
          'One-handed task completion ergonomics.'
        ],
        decisions: [
          { id: 'd5', meetingId: 'meet-comp-4', decision: 'Enforce bottom navigation bar for mobile devices under 768px width.', context: 'Replaces desktop sidebar.', timestamp: '16:10', createdAt: new Date().toISOString() }
        ],
        actionItems: [
          {
            id: 'act-9',
            meetingId: 'meet-comp-4',
            task: 'Audit responsive card paddings and eliminate horizontal overflow',
            ownerName: 'Rahul Sharma',
            ownerEmail: 'rahul.sharma@meetingflow.io',
            dueDate: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 days ago (overdue demo)
            priority: 'HIGH',
            status: 'PENDING',
            confidence: 'high',
            sourceTimestamp: '16:00',
            jiraIssueKey: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'act-10',
            meetingId: 'meet-comp-4',
            task: 'Benchmark bottom navigation drawer animations on 375px viewport',
            ownerName: 'Vikram Patel',
            ownerEmail: 'vikram.patel@meetingflow.io',
            dueDate: '2026-10-08',
            priority: 'MEDIUM',
            status: 'COMPLETED',
            confidence: 'high',
            sourceTimestamp: '16:20',
            jiraIssueKey: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        openQuestions: [],
        processingJob: {
          id: 'job-4',
          meetingId: 'meet-comp-4',
          status: 'COMPLETED',
          stage: 'Analysis complete',
          progress: 100,
          retryCount: 0,
          createdAt: new Date(Date.now() - 428400000).toISOString(),
          updatedAt: new Date(Date.now() - 428200000).toISOString(),
        },
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        updatedAt: new Date(Date.now() - 428200000).toISOString(),
      },
      {
        id: 'meet-comp-5',
        googleEventId: 'gcal-evt-005',
        meetCode: 'cld-cst-opt',
        meetUrl: 'https://meet.google.com/cld-cst-opt',
        title: 'Quarterly Budget & Cloud Cost Optimization',
        description: 'Reviewing compute instances, database read replicas, and serverless invocations.',
        startTime: new Date(Date.now() - 518400000).toISOString(), // 6 days ago
        endTime: new Date(Date.now() - 514800000).toISOString(),
        durationMinutes: 60,
        status: 'COMPLETED',
        organizerId: 'user-vikram-patel',
        organizerName: 'Vikram Patel',
        organizerEmail: 'vikram.patel@meetingflow.io',
        participants: [
          { id: 'cp13', meetingId: 'meet-comp-5', name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'organizer' },
          { id: 'cp14', meetingId: 'meet-comp-5', name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'attendee' },
          { id: 'cp15', meetingId: 'meet-comp-5', name: 'Ananya Roy', email: 'ananya.roy@meetingflow.io', role: 'attendee' },
        ],
        transcripts: [
          { id: 't17', meetingId: 'meet-comp-5', sequence: 1, speaker: 'Vikram', timestamp: '15:00', text: 'Our cloud bill increased by 14% due to idle staging database instances.' },
          { id: 't18', meetingId: 'meet-comp-5', sequence: 2, speaker: 'Rahul', timestamp: '15:15', text: 'I will implement automatic shutdown schedules for non-production environments.' }
        ],
        summary: 'Identified savings of $1,400/month by configuring auto-shutdown schedules on non-production staging infrastructure.',
        keyDiscussions: [
          'Right-sizing RDS instances during off-peak weekend hours.',
          'Gemini API usage patterns and response caching.'
        ],
        decisions: [
          { id: 'd6', meetingId: 'meet-comp-5', decision: 'Automate staging cluster sleep between 8 PM and 7 AM weekdays.', context: 'Saves 35% on staging costs.', timestamp: '15:20', createdAt: new Date().toISOString() }
        ],
        actionItems: [
          {
            id: 'act-11',
            meetingId: 'meet-comp-5',
            task: 'Implement automatic shutdown schedules for non-production environments',
            ownerName: 'Rahul Sharma',
            ownerEmail: 'rahul.sharma@meetingflow.io',
            dueDate: '2026-10-10',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            confidence: 'high',
            sourceTimestamp: '15:15',
            jiraIssueKey: 'JIRA-145',
            jiraIssueUrl: 'https://jira.atlassian.net/browse/JIRA-145',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ],
        openQuestions: [],
        processingJob: {
          id: 'job-5',
          meetingId: 'meet-comp-5',
          status: 'COMPLETED',
          stage: 'Analysis complete',
          progress: 100,
          retryCount: 0,
          createdAt: new Date(Date.now() - 514800000).toISOString(),
          updatedAt: new Date(Date.now() - 514600000).toISOString(),
        },
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        updatedAt: new Date(Date.now() - 514600000).toISOString(),
      }
    ];

    this.meetings = [...upcomingMeetings, ...completedMeetings];

    // Seed personal tasks for current user (Rahul Sharma)
    this.userTasks = [
      // Due Today
      {
        id: 'task-1',
        userId: this.currentUser.id,
        actionItemId: 'act-1',
        title: 'Finalize campaign creative and copy revisions',
        meetingId: 'meet-comp-1',
        meetingTitle: 'Q3 Product Launch & Go-To-Market Debrief',
        dueDate: `${todayStr}`,
        priority: 'HIGH',
        status: 'PENDING',
        jiraIssueKey: 'JIRA-141',
        reminderAt: `${todayStr}T18:00:00.000Z`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-2',
        userId: this.currentUser.id,
        actionItemId: 'act-5',
        title: 'Draft billing failure customer notification templates',
        meetingId: 'meet-comp-2',
        meetingTitle: 'Billing Engine & Stripe Webhook Infrastructure',
        dueDate: `${todayStr}`,
        priority: 'HIGH',
        status: 'PENDING',
        jiraIssueKey: 'JIRA-142',
        reminderAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Overdue
      {
        id: 'task-3',
        userId: this.currentUser.id,
        actionItemId: 'act-7',
        title: 'Design inline Jira integration button and modal workflow',
        meetingId: 'meet-comp-3',
        meetingTitle: 'Customer Feedback & UX Research Synthesis',
        dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        priority: 'HIGH',
        status: 'PENDING',
        jiraIssueKey: 'JIRA-143',
        reminderAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-4',
        userId: this.currentUser.id,
        actionItemId: 'act-9',
        title: 'Audit responsive card paddings and eliminate horizontal overflow',
        meetingId: 'meet-comp-4',
        meetingTitle: 'Mobile App Performance & Offline Sync Architecture',
        dueDate: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        priority: 'HIGH',
        status: 'PENDING',
        jiraIssueKey: null,
        reminderAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Upcoming
      {
        id: 'task-5',
        userId: this.currentUser.id,
        actionItemId: 'act-11',
        title: 'Implement automatic shutdown schedules for non-production environments',
        meetingId: 'meet-comp-5',
        meetingTitle: 'Quarterly Budget & Cloud Cost Optimization',
        dueDate: '2026-10-10',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        jiraIssueKey: 'JIRA-145',
        reminderAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-6',
        userId: this.currentUser.id,
        actionItemId: null,
        title: 'Review Google Meet API v2 conference record documentation',
        meetingTitle: 'Personal Engineering Objectives',
        dueDate: '2026-10-12',
        priority: 'LOW',
        status: 'PENDING',
        jiraIssueKey: null,
        reminderAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-7',
        userId: this.currentUser.id,
        actionItemId: null,
        title: 'Schedule Q4 security compliance refresher with InfoSec',
        meetingTitle: 'Security Audit & Data Compliance Check',
        dueDate: '2026-10-14',
        priority: 'MEDIUM',
        status: 'PENDING',
        jiraIssueKey: null,
        reminderAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-8',
        userId: this.currentUser.id,
        actionItemId: null,
        title: 'Prepare product presentation slides for board meeting',
        meetingTitle: 'Product Strategy & Q4 Roadmap Review',
        dueDate: '2026-10-15',
        priority: 'HIGH',
        status: 'PENDING',
        jiraIssueKey: null,
        reminderAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // Completed Tasks
      {
        id: 'task-9',
        userId: this.currentUser.id,
        actionItemId: null,
        title: 'Validate Google OAuth redirect scopes in production GCP console',
        meetingTitle: 'Architecture Review',
        dueDate: new Date(Date.now() - 259200000).toISOString().split('T')[0],
        priority: 'HIGH',
        status: 'COMPLETED',
        jiraIssueKey: 'JIRA-138',
        completedAt: new Date(Date.now() - 250000000).toISOString(),
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        updatedAt: new Date(Date.now() - 250000000).toISOString(),
      },
      {
        id: 'task-10',
        userId: this.currentUser.id,
        actionItemId: null,
        title: 'Submit Q3 AWS cloud spend forecast to finance',
        meetingTitle: 'Quarterly Budget & Cloud Cost Optimization',
        dueDate: new Date(Date.now() - 345600000).toISOString().split('T')[0],
        priority: 'MEDIUM',
        status: 'COMPLETED',
        jiraIssueKey: 'JIRA-139',
        completedAt: new Date(Date.now() - 340000000).toISOString(),
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 340000000).toISOString(),
      }
    ];
  }

  // Query Methods
  public getMeetings(): Meeting[] {
    this.ensureFreshDates();
    return this.meetings;
  }

  public getUpcomingMeetings(): Meeting[] {
    this.ensureFreshDates();
    return this.meetings.filter(m => m.status === 'SCHEDULED');
  }

  public getMeetingById(id: string): Meeting | undefined {
    this.ensureFreshDates();
    return this.meetings.find(m => m.id === id);
  }

  public getUserTasks(userId?: string): UserTask[] {
    this.ensureFreshDates();
    const targetUserId = userId || this.currentUser.id;
    return this.userTasks.filter(t => t.userId === targetUserId);
  }

  public getTaskById(id: string): UserTask | undefined {
    return this.userTasks.find(t => t.id === id);
  }

  public updateTask(id: string, updates: Partial<UserTask>): UserTask | null {
    const taskIndex = this.userTasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return null;
    this.userTasks[taskIndex] = {
      ...this.userTasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return this.userTasks[taskIndex];
  }

  public completeTask(id: string): UserTask | null {
    return this.updateTask(id, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    });
  }

  public updateActionItem(meetingId: string, actionItemId: string, updates: Partial<ActionItem>): ActionItem | null {
    const meeting = this.getMeetingById(meetingId);
    if (!meeting || !meeting.actionItems) return null;
    const itemIndex = meeting.actionItems.findIndex(a => a.id === actionItemId);
    if (itemIndex === -1) return null;
    meeting.actionItems[itemIndex] = {
      ...meeting.actionItems[itemIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return meeting.actionItems[itemIndex];
  }

  public setJiraKey(taskId: string, issueKey: string, issueUrl: string) {
    const task = this.updateTask(taskId, { jiraIssueKey: issueKey });
    if (task?.actionItemId && task.meetingId) {
      this.updateActionItem(task.meetingId, task.actionItemId, {
        jiraIssueKey: issueKey,
        jiraIssueUrl: issueUrl
      });
    }
    return task;
  }

  public setCalendarReminder(taskId: string, reminderAt: string) {
    return this.updateTask(taskId, { reminderAt });
  }

  // Simulate a New Google Meet Meeting in Demo Mode
  public simulateNewMeeting(): Meeting {
    const newId = `meet-sim-${Date.now()}`;
    const now = new Date();
    const startTime = new Date(now.getTime() - 45 * 60000).toISOString();
    const endTime = now.toISOString();

    const meeting: Meeting = {
      id: newId,
      googleEventId: `gcal-evt-${Date.now()}`,
      meetCode: `sim-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`,
      meetUrl: `https://meet.google.com/sim-${Math.random().toString(36).substring(2, 6)}`,
      title: 'Customer Advisory Board — Enterprise Feedback',
      description: 'Discussing enterprise security tiers, audit logging, and team workspace management.',
      startTime,
      endTime,
      durationMinutes: 45,
      status: 'SCHEDULED', // Ready to process
      organizerId: this.currentUser.id,
      organizerName: 'Rahul Sharma',
      organizerEmail: 'rahul.sharma@meetingflow.io',
      participants: [
        { id: `p-${Date.now()}-1`, meetingId: newId, name: 'Rahul Sharma', email: 'rahul.sharma@meetingflow.io', role: 'organizer' },
        { id: `p-${Date.now()}-2`, meetingId: newId, name: 'Arpita Sen', email: 'arpita.sen@meetingflow.io', role: 'attendee' },
        { id: `p-${Date.now()}-3`, meetingId: newId, name: 'Vikram Patel', email: 'vikram.patel@meetingflow.io', role: 'attendee' },
        { id: `p-${Date.now()}-4`, meetingId: newId, name: 'Elena Rostov', email: 'elena@enterprise.com', role: 'attendee' },
      ],
      transcripts: [
        { id: `t-${Date.now()}-1`, meetingId: newId, sequence: 1, speaker: 'Elena', timestamp: '14:02', text: 'Thank you for having us. Our main priority is granular role-based access for workspace admins.' },
        { id: `t-${Date.now()}-2`, meetingId: newId, sequence: 2, speaker: 'Rahul', timestamp: '14:08', text: 'Understood. Rahul will prepare an RBAC specification document by next Wednesday.' },
        { id: `t-${Date.now()}-3`, meetingId: newId, sequence: 3, speaker: 'Vikram', timestamp: '14:15', text: 'I will evaluate if our current JWT payload can carry department claims.' },
        { id: `t-${Date.now()}-4`, meetingId: newId, sequence: 4, speaker: 'Arpita', timestamp: '14:26', text: 'I will follow up with Elena on the security questionnaire by Friday.' },
        { id: `t-${Date.now()}-5`, meetingId: newId, sequence: 5, speaker: 'Elena', timestamp: '14:38', text: 'That sounds perfect. We can schedule our rollout pilot for next month.' }
      ],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.meetings.unshift(meeting);
    return meeting;
  }

  // Update Processing Job State
  public updateProcessingState(
    meetingId: string,
    status: ProcessingStatus,
    stage: string,
    progress: number,
    error?: string
  ): Meeting | null {
    const meeting = this.getMeetingById(meetingId);
    if (!meeting) return null;

    meeting.processingJob = {
      id: meeting.processingJob?.id || `job-${meetingId}`,
      meetingId,
      status,
      stage,
      progress,
      retryCount: meeting.processingJob ? meeting.processingJob.retryCount + (status === 'TRANSCRIPT_PENDING' ? 1 : 0) : 0,
      lastAttemptAt: new Date().toISOString(),
      error: error || null,
      createdAt: meeting.processingJob?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (status === 'COMPLETED') {
      meeting.status = 'COMPLETED';
    } else if (status === 'FAILED') {
      meeting.status = 'FAILED';
    } else {
      meeting.status = 'PROCESSING';
    }

    return meeting;
  }

  // Complete processing with analysis payload
  public finishMeetingAnalysis(
    meetingId: string,
    analysis: {
      summary: string;
      keyDiscussions: string[];
      decisions: Decision[];
      actionItems: ActionItem[];
      openQuestions: string[];
    }
  ): Meeting | null {
    const meeting = this.getMeetingById(meetingId);
    if (!meeting) return null;

    meeting.summary = analysis.summary;
    meeting.keyDiscussions = analysis.keyDiscussions;
    meeting.decisions = analysis.decisions;
    meeting.actionItems = analysis.actionItems;
    meeting.openQuestions = analysis.openQuestions;
    meeting.status = 'COMPLETED';
    meeting.updatedAt = new Date().toISOString();

    meeting.processingJob = {
      id: meeting.processingJob?.id || `job-${meetingId}`,
      meetingId,
      status: 'COMPLETED',
      stage: 'Action items extracted and assigned',
      progress: 100,
      retryCount: meeting.processingJob?.retryCount || 0,
      lastAttemptAt: new Date().toISOString(),
      error: null,
      createdAt: meeting.processingJob?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Auto-create personal tasks for Rahul Sharma if assigned
    const rahulItems = analysis.actionItems.filter(
      item => item.ownerName?.toLowerCase().includes('rahul') || item.ownerEmail?.toLowerCase().includes('rahul')
    );

    for (const item of rahulItems) {
      this.userTasks.unshift({
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: this.currentUser.id,
        actionItemId: item.id,
        title: item.task,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        dueDate: item.dueDate,
        priority: item.priority,
        status: 'PENDING',
        jiraIssueKey: item.jiraIssueKey,
        reminderAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return meeting;
  }

  // Calculate Accurate Analytics
  public getAnalytics(): AnalyticsSummary {
    this.ensureFreshDates();
    const totalMeetings = this.meetings.length;
    
    // Calculate accurate meeting minutes strictly from calendar/meet duration
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    let minutesToday = 0;
    let minutesThisWeek = 0;
    let minutesThisMonth = 0;
    let totalMinutes = 0;

    for (const m of this.meetings) {
      totalMinutes += m.durationMinutes;
      const mDate = new Date(m.startTime);
      if (m.startTime.startsWith(todayStr)) {
        minutesToday += m.durationMinutes;
      }
      if (mDate >= sevenDaysAgo) {
        minutesThisWeek += m.durationMinutes;
      }
      if (mDate >= thirtyDaysAgo) {
        minutesThisMonth += m.durationMinutes;
      }
    }

    const averageDuration = totalMeetings > 0 ? Math.round(totalMinutes / totalMeetings) : 0;

    const myTasks = this.getUserTasks();
    const completedTasks = myTasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = myTasks.filter(t => t.status !== 'COMPLETED').length;
    
    const overdueTasks = myTasks.filter(t => {
      if (t.status === 'COMPLETED' || !t.dueDate) return false;
      return t.dueDate < todayStr;
    }).length;

    // Daily breakdown for past 5 days
    const dailyHoursBreakdown = [
      { day: 'Mon', hours: 2.5, meetingCount: 3 },
      { day: 'Tue', hours: 3.2, meetingCount: 4 },
      { day: 'Wed', hours: 1.8, meetingCount: 2 },
      { day: 'Thu', hours: 4.0, meetingCount: 5 },
      { day: 'Fri', hours: Number((minutesToday / 60).toFixed(1)), meetingCount: 4 },
    ];

    const tasksByPriority = [
      { priority: 'HIGH' as const, count: myTasks.filter(t => t.priority === 'HIGH').length },
      { priority: 'MEDIUM' as const, count: myTasks.filter(t => t.priority === 'MEDIUM').length },
      { priority: 'LOW' as const, count: myTasks.filter(t => t.priority === 'LOW').length },
    ];

    const meetingsByStatus = [
      { status: 'COMPLETED' as const, count: this.meetings.filter(m => m.status === 'COMPLETED').length },
      { status: 'SCHEDULED' as const, count: this.meetings.filter(m => m.status === 'SCHEDULED').length },
      { status: 'PROCESSING' as const, count: this.meetings.filter(m => m.status === 'PROCESSING').length },
    ];

    return {
      totalMeetings,
      meetingHours: {
        today: minutesToday,
        thisWeek: minutesThisWeek,
        thisMonth: minutesThisMonth,
        averageDuration,
      },
      tasks: {
        total: myTasks.length,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        myOpenTasks: pendingTasks,
      },
      dailyHoursBreakdown,
      tasksByPriority,
      meetingsByStatus,
    };
  }
}

export const demoStore = new DemoStore();
