import fs from 'fs';
import path from 'path';
import {
  User,
  Meeting,
  UserTask,
  ActionItem,
  Decision,
  TranscriptEntry,
  ProcessingJob,
  AnalyticsSummary,
  Priority,
  MeetingStatus,
  JiraConnection,
  JiraConfiguration,
  JiraIssueLink
} from '../types/index.js';

interface DatabaseSchema {
  users: User[];
  meetings: Meeting[];
  userTasks: UserTask[];
  processingJobs: ProcessingJob[];
  jiraConnections?: JiraConnection[];
  jiraConfigurations?: JiraConfiguration[];
  jiraIssueLinks?: JiraIssueLink[];
}

export class PersistentDatabase {
  private dbPath: string;
  private data: Required<DatabaseSchema>;

  constructor() {
    const storageDir = path.resolve(process.cwd(), 'storage');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    this.dbPath = path.join(storageDir, 'meetingflow-db.json');
    this.data = this.loadDatabase();
  }

  private loadDatabase(): Required<DatabaseSchema> {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || [],
          meetings: parsed.meetings || [],
          userTasks: parsed.userTasks || [],
          processingJobs: parsed.processingJobs || [],
          jiraConnections: parsed.jiraConnections || [],
          jiraConfigurations: parsed.jiraConfigurations || [],
          jiraIssueLinks: parsed.jiraIssueLinks || []
        };
      }
    } catch (err) {
      console.error('Failed to load database file, initializing empty schema:', err);
    }
    return {
      users: [],
      meetings: [],
      userTasks: [],
      processingJobs: [],
      jiraConnections: [],
      jiraConfigurations: [],
      jiraIssueLinks: []
    };
  }

  private persist() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  // --- USER OPERATIONS ---
  public getUserById(id: string): User | undefined {
    this.data = this.loadDatabase();
    return this.data.users.find(u => u.id === id);
  }

  public getUserByEmail(email: string): User | undefined {
    this.data = this.loadDatabase();
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserWithGoogleTokens(): User | undefined {
    return this.data.users.find(u => Boolean(u.googleTokens?.access_token || u.googleTokens?.refresh_token));
  }

  public getAllUsers(): User[] {
    return this.data.users;
  }

  public updateUserGoogleTokens(userId: string, tokens: any): User | undefined {
    const user = this.data.users.find(u => u.id === userId);
    if (user) {
      user.googleTokens = { ...user.googleTokens, ...tokens };
      user.updatedAt = new Date().toISOString();
      this.persist();
      return user;
    }
    return undefined;
  }

  public upsertUser(user: Partial<User> & { email: string; name: string }): User {
    const existingIndex = this.data.users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const updated: User = {
        ...this.data.users[existingIndex],
        ...user,
        updatedAt: now
      };
      this.data.users[existingIndex] = updated;
      this.persist();
      return updated;
    }

    const newUser: User = {
      id: user.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      googleTokens: user.googleTokens,
      jiraConfig: user.jiraConfig,
      createdAt: now,
      updatedAt: now
    };

    this.data.users.push(newUser);
    this.persist();
    return newUser;
  }

  // --- MEETING OPERATIONS ---
  public getMeetingsForUser(userId: string): Meeting[] {
    const user = this.getUserById(userId);
    const userEmail = user?.email.toLowerCase();

    return this.data.meetings.filter(m =>
      m.organizerId === userId ||
      (userEmail && m.organizerEmail.toLowerCase() === userEmail) ||
      (userEmail && m.participants.some(p => p.email.toLowerCase() === userEmail))
    );
  }

  public getMeetingById(id: string): Meeting | undefined {
    return this.data.meetings.find(m => m.id === id);
  }

  public saveMeeting(meeting: Meeting): Meeting {
    const index = this.data.meetings.findIndex(m => m.id === meeting.id);
    if (index >= 0) {
      this.data.meetings[index] = { ...meeting, updatedAt: new Date().toISOString() };
    } else {
      this.data.meetings.unshift(meeting);
    }
    this.persist();
    return meeting;
  }

  public syncGoogleCalendarMeetings(userId: string, newMeetings: Meeting[]): Meeting[] {
    const user = this.getUserById(userId);
    const userEmail = user?.email?.toLowerCase();
    const liveGoogleIds = new Set(newMeetings.map(m => m.googleEventId || m.id));

    // Purge deleted Google Calendar meetings:
    // If a meeting has a googleEventId and belongs to this user but is not in liveGoogleIds, remove it.
    this.data.meetings = this.data.meetings.filter(m => {
      const belongsToUser =
        m.organizerId === userId ||
        (userEmail && m.organizerEmail?.toLowerCase() === userEmail) ||
        (userEmail && m.participants?.some(p => p.email?.toLowerCase() === userEmail));

      if (!belongsToUser) return true;
      if (!m.googleEventId) return true;

      return liveGoogleIds.has(m.googleEventId);
    });

    for (const newMeet of newMeetings) {
      const existingIndex = this.data.meetings.findIndex(
        m => (newMeet.googleEventId && m.googleEventId === newMeet.googleEventId) || m.id === newMeet.id
      );

      if (existingIndex >= 0) {
        // Keep existing processing artifacts (summary, decisions, action items) if already analyzed
        const existing = this.data.meetings[existingIndex];
        const isPast = new Date(newMeet.endTime).getTime() < Date.now();
        this.data.meetings[existingIndex] = {
          ...newMeet,
          id: existing.id,
          status: isPast ? 'COMPLETED' : newMeet.status,
          summary: existing.summary || newMeet.summary,
          keyDiscussions: existing.keyDiscussions || newMeet.keyDiscussions,
          decisions: existing.decisions || newMeet.decisions,
          actionItems: existing.actionItems || newMeet.actionItems,
          transcripts: existing.transcripts || newMeet.transcripts,
          processingJob: existing.processingJob || newMeet.processingJob,
          followUpScheduling: existing.followUpScheduling || newMeet.followUpScheduling,
          updatedAt: new Date().toISOString()
        };
      } else {
        this.data.meetings.unshift(newMeet);
      }
    }
    this.persist();
    return this.getMeetingsForUser(userId);
  }

  // --- TASK OPERATIONS ---
  public getUserTasks(userId: string): UserTask[] {
    return this.data.userTasks.filter(t => t.userId === userId);
  }

  public getTaskById(id: string): UserTask | undefined {
    return this.data.userTasks.find(t => t.id === id);
  }

  public saveUserTask(task: UserTask): UserTask {
    const index = this.data.userTasks.findIndex(t => t.id === task.id);
    if (index >= 0) {
      this.data.userTasks[index] = { ...task, updatedAt: new Date().toISOString() };
    } else {
      this.data.userTasks.unshift(task);
    }
    this.persist();
    return task;
  }

  public updateUserTask(id: string, updates: Partial<UserTask>): UserTask | null {
    const index = this.data.userTasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.data.userTasks[index] = {
      ...this.data.userTasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.data.userTasks[index];
  }

  public completeUserTask(id: string): UserTask | null {
    return this.updateUserTask(id, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    });
  }

  // --- ACTION ITEMS & JIRA UPDATE ---
  public updateActionItemJira(
    meetingId: string,
    actionItemId: string,
    jiraKey: string,
    jiraUrl: string,
    jiraStatus?: string,
    jiraLinkType?: 'created' | 'matched' | 'manually_linked'
  ) {
    const meeting = this.getMeetingById(meetingId);
    if (meeting?.actionItems) {
      const itm = meeting.actionItems.find(a => a.id === actionItemId);
      if (itm) {
        itm.jiraIssueKey = jiraKey;
        itm.jiraIssueUrl = jiraUrl;
        if (jiraStatus) itm.jiraStatus = jiraStatus;
        if (jiraLinkType) itm.jiraLinkType = jiraLinkType;
        itm.updatedAt = new Date().toISOString();
        this.saveMeeting(meeting);
      }
    }
  }

  // --- JIRA CONNECTION & CONFIGURATION ---
  public getJiraConnection(userId: string): JiraConnection | undefined {
    return this.data.jiraConnections.find(c => c.userId === userId);
  }

  public getAnyJiraConnection(): JiraConnection | undefined {
    return this.data.jiraConnections[0];
  }

  public saveJiraConnection(conn: JiraConnection): JiraConnection {
    const idx = this.data.jiraConnections.findIndex(c => c.userId === conn.userId);
    if (idx >= 0) {
      this.data.jiraConnections[idx] = { ...conn, updatedAt: new Date().toISOString() };
    } else {
      this.data.jiraConnections.push(conn);
    }
    this.persist();
    return conn;
  }

  public deleteJiraConnection(userId: string): void {
    this.data.jiraConnections = this.data.jiraConnections.filter(c => c.userId !== userId);
    this.data.jiraConfigurations = this.data.jiraConfigurations.filter(c => c.userId !== userId);
    this.persist();
  }

  public getJiraConfiguration(userId: string): JiraConfiguration | undefined {
    return this.data.jiraConfigurations.find(c => c.userId === userId) || this.data.jiraConfigurations[0];
  }

  public saveJiraConfiguration(config: JiraConfiguration): JiraConfiguration {
    const idx = this.data.jiraConfigurations.findIndex(c => c.userId === config.userId);
    if (idx >= 0) {
      this.data.jiraConfigurations[idx] = { ...config, updatedAt: new Date().toISOString() };
    } else {
      this.data.jiraConfigurations.push(config);
    }
    this.persist();
    return config;
  }

  // --- JIRA ISSUE LINKS ---
  public getJiraIssueLinks(): JiraIssueLink[] {
    return this.data.jiraIssueLinks;
  }

  public getJiraIssueLinkForActionItem(actionItemId: string): JiraIssueLink | undefined {
    return this.data.jiraIssueLinks.find(l => l.actionItemId === actionItemId);
  }

  public getJiraIssueLinksForMeeting(meetingId: string): JiraIssueLink[] {
    return this.data.jiraIssueLinks.filter(l => l.meetingId === meetingId);
  }

  public saveJiraIssueLink(link: JiraIssueLink): JiraIssueLink {
    const idx = this.data.jiraIssueLinks.findIndex(
      l => l.actionItemId === link.actionItemId || l.jiraIssueKey === link.jiraIssueKey
    );
    if (idx >= 0) {
      this.data.jiraIssueLinks[idx] = { ...link, updatedAt: new Date().toISOString() };
    } else {
      this.data.jiraIssueLinks.unshift(link);
    }
    this.persist();
    return link;
  }

  public deleteJiraIssueLink(actionItemId: string): void {
    this.data.jiraIssueLinks = this.data.jiraIssueLinks.filter(l => l.actionItemId !== actionItemId);
    this.persist();
  }

  public updateJiraIssueLinkStatus(jiraIssueKey: string, status: string, statusCategory?: string): void {
    const link = this.data.jiraIssueLinks.find(l => l.jiraIssueKey === jiraIssueKey);
    if (link) {
      link.status = status;
      if (statusCategory) link.statusCategory = statusCategory;
      link.updatedAt = new Date().toISOString();
      this.persist();
    }
    // Also update any meeting action item referencing this issue key
    for (const m of this.data.meetings) {
      if (m.actionItems) {
        let changed = false;
        for (const a of m.actionItems) {
          if (a.jiraIssueKey === jiraIssueKey) {
            a.jiraStatus = status;
            a.updatedAt = new Date().toISOString();
            changed = true;
          }
        }
        if (changed) this.saveMeeting(m);
      }
    }
  }

  // --- PROCESSING JOBS ---
  public getProcessingJob(meetingId: string): ProcessingJob | undefined {
    return this.data.processingJobs.find(j => j.meetingId === meetingId);
  }

  public saveProcessingJob(job: ProcessingJob): ProcessingJob {
    const index = this.data.processingJobs.findIndex(j => j.meetingId === job.meetingId);
    if (index >= 0) {
      this.data.processingJobs[index] = { ...job, updatedAt: new Date().toISOString() };
    } else {
      this.data.processingJobs.push(job);
    }

    const meeting = this.getMeetingById(job.meetingId);
    if (meeting) {
      meeting.processingJob = job;
      if (job.status === 'COMPLETED') meeting.status = 'COMPLETED';
      else if (job.status === 'FAILED') meeting.status = 'FAILED';
      else meeting.status = 'PROCESSING';
      this.saveMeeting(meeting);
    }

    this.persist();
    return job;
  }

  // --- ACCURATE ANALYTICS ---
  public getAnalyticsForUser(userId: string): AnalyticsSummary {
    const meetings = this.getMeetingsForUser(userId);
    const tasks = this.getUserTasks(userId);
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    let minutesToday = 0;
    let minutesThisWeek = 0;
    let minutesThisMonth = 0;
    let totalMinutes = 0;

    for (const m of meetings) {
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

    const averageDuration = meetings.length > 0 ? Math.round(totalMinutes / meetings.length) : 0;
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED').length;
    const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'COMPLETED').length;

    // Daily breakdown for this week
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyHoursBreakdown = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => {
      // Aggregate real meetings matching day if available
      const matchingMeets = meetings.filter(m => {
        const d = new Date(m.startTime);
        return dayNames[d.getDay()] === day;
      });
      const hours = matchingMeets.reduce((acc, m) => acc + m.durationMinutes, 0) / 60;
      return {
        day,
        hours: Number(hours.toFixed(1)),
        meetingCount: matchingMeets.length
      };
    });

    const tasksByPriority = [
      { priority: 'HIGH' as Priority, count: tasks.filter(t => t.priority === 'HIGH').length },
      { priority: 'MEDIUM' as Priority, count: tasks.filter(t => t.priority === 'MEDIUM').length },
      { priority: 'LOW' as Priority, count: tasks.filter(t => t.priority === 'LOW').length },
    ];

    const meetingsByStatus = [
      { status: 'COMPLETED' as MeetingStatus, count: meetings.filter(m => m.status === 'COMPLETED').length },
      { status: 'SCHEDULED' as MeetingStatus, count: meetings.filter(m => m.status === 'SCHEDULED').length },
      { status: 'PROCESSING' as MeetingStatus, count: meetings.filter(m => m.status === 'PROCESSING').length },
    ];

    return {
      totalMeetings: meetings.length,
      meetingHours: {
        today: minutesToday,
        thisWeek: minutesThisWeek,
        thisMonth: minutesThisMonth,
        averageDuration
      },
      tasks: {
        total: tasks.length,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        myOpenTasks: pendingTasks
      },
      dailyHoursBreakdown,
      tasksByPriority,
      meetingsByStatus
    };
  }
}

export const persistentDb = new PersistentDatabase();
