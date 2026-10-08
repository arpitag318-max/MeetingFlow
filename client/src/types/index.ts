export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'PROCESSING' | 'FAILED';
export type ProcessingStatus = 'PENDING' | 'TRANSCRIPT_PENDING' | 'TRANSCRIPT_FETCHED' | 'ANALYZING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  googleTokens?: any;
  jiraConfig?: any;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  id: string;
  meetingId: string;
  name: string;
  email: string;
  role?: 'organizer' | 'attendee';
}

export interface TranscriptEntry {
  id: string;
  meetingId: string;
  speaker: string;
  timestamp: string; // e.g. "10:14"
  text: string;
  sequence: number;
}

export interface Decision {
  id: string;
  meetingId: string;
  decision: string;
  context?: string;
  timestamp?: string;
  createdAt: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  task: string;
  ownerName: string | null;
  ownerEmail: string | null;
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
  confidence?: 'high' | 'medium' | 'low';
  sourceTimestamp?: string;
  jiraCandidate?: boolean;
  jiraReason?: string;
  jiraConfidence?: number;
  jiraIssueKey?: string | null;
  jiraIssueUrl?: string | null;
  jiraStatus?: string;
  jiraLinkType?: 'created' | 'matched' | 'manually_linked';
  createdAt: string;
  updatedAt: string;
}

export interface UserTask {
  id: string;
  userId: string;
  actionItemId?: string | null;
  title: string;
  meetingId?: string;
  meetingTitle: string;
  dueDate: string | null;
  priority: Priority;
  status: TaskStatus;
  jiraIssueKey?: string | null;
  reminderAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingJob {
  id: string;
  meetingId: string;
  status: ProcessingStatus;
  stage: string;
  progress: number;
  retryCount: number;
  lastAttemptAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpSchedulingResult {
  status: 'SCHEDULED' | 'CONFLICT_RESOLVED' | 'NO_INTENT_DETECTED' | 'FAILED';
  scheduledEventId?: string;
  scheduledMeetUrl?: string;
  scheduledTitle?: string;
  requestedDate?: string;
  requestedTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  durationMinutes?: number;
  conflictDetected?: boolean;
  conflictReason?: string;
  attendees?: string[];
  sourceText?: string;
  sourceTimestamp?: string;
  confidence?: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface Meeting {
  id: string;
  googleEventId?: string;
  meetCode?: string;
  meetUrl?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: MeetingStatus;
  organizerId: string;
  organizerName: string;
  organizerEmail: string;
  participants: Participant[];
  transcripts?: TranscriptEntry[];
  summary?: string;
  keyDiscussions?: string[];
  decisions?: Decision[];
  actionItems?: ActionItem[];
  openQuestions?: string[];
  processingJob?: ProcessingJob;
  followUpScheduling?: FollowUpSchedulingResult;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  totalMeetings: number;
  meetingHours: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    averageDuration: number;
  };
  tasks: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    myOpenTasks: number;
  };
  dailyHoursBreakdown: {
    day: string;
    hours: number;
    meetingCount: number;
  }[];
  tasksByPriority: {
    priority: Priority;
    count: number;
  }[];
  meetingsByStatus: {
    status: MeetingStatus;
    count: number;
  }[];
}

export interface JiraConnection {
  id: string;
  userId: string;
  cloudId: string;
  siteUrl: string;
  siteName: string;
  accountId?: string;
  accountEmail?: string;
  accountName?: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JiraConfiguration {
  userId: string;
  cloudId: string;
  projectId: string;
  projectKey: string;
  projectName?: string;
  projectAvatarUrl?: string;
  issueTypeId: string;
  issueTypeName?: string;
  issueTypeIconUrl?: string;
  defaultPriority?: string;
  defaultAssignee?: string;
  defaultAssigneeName?: string;
  defaultLabel?: string;
  updatedAt: string;
}

export interface JiraIssueLink {
  id: string;
  meetingId?: string;
  meetingTitle?: string;
  actionItemId: string;
  jiraIssueId: string;
  jiraIssueKey: string;
  jiraProjectId?: string;
  jiraProjectKey?: string;
  jiraUrl: string;
  linkType: 'created' | 'matched' | 'manually_linked';
  summary?: string;
  status?: string;
  statusCategory?: string;
  priority?: string;
  assigneeName?: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationStatus {
  google: {
    isConnected: boolean;
    isConfigured: boolean;
    calendarConnected: boolean;
    meetConnected: boolean;
    authUrl: string;
  };
  gemini: {
    isConfigured: boolean;
    model: string;
    aiAnalysisEnabled: boolean;
  };
  jira: {
    isConnected: boolean;
    isConfigured: boolean;
    isOAuthConfigured?: boolean;
    siteName?: string;
    siteUrl?: string;
    cloudId?: string;
    accountEmail?: string;
    accountName?: string;
    avatarUrl?: string;
    lastSyncAt?: string;
    config?: JiraConfiguration;
    baseUrl?: string;
    defaultProject?: string;
    authUrl?: string;
    redirectUri?: string;
  };
}
