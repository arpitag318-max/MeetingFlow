import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Topbar } from "../components/layout/Topbar";
import { api } from "../api/client";
import { Meeting, UserTask, AnalyticsSummary } from "../types";
import { useToast } from "../context/ToastContext";
import { DashboardBackgroundArt } from "../components/dashboard/DashboardBackgroundArt";
import { DashboardHeaderHero } from "../components/dashboard/DashboardHeaderHero";
import { KpiCardsRow } from "../components/dashboard/KpiCardsRow";
import { InteractiveCalendarCard } from "../components/dashboard/InteractiveCalendarCard";
import { TodayScheduleCard } from "../components/dashboard/TodayScheduleCard";
import { WeeklyFocusCapacityCard } from "../components/dashboard/WeeklyFocusCapacityCard";
import { ActionItemsCard } from "../components/dashboard/ActionItemsCard";
import { AiAssistantCard } from "../components/dashboard/AiAssistantCard";
import { TodayFocusCard } from "../components/dashboard/TodayFocusCard";
import { RecentMeetingsCard } from "../components/dashboard/RecentMeetingsCard";

export const DashboardPage: React.FC = () => {
  const { user, isDemoMode } = useAuth();
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const { success, error, info } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingCalendar, setIsRefreshingCalendar] = useState(false);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [allTasks, setAllTasks] = useState<UserTask[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => new Date());

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [upcomingRes, allMeetingsRes, tasksRes, analyticsRes] = await Promise.all([
        api.meetings.getUpcoming().catch(() => ({ meetings: [], count: 0, isRealMode: true })),
        api.meetings.getAll().catch(() => ({ meetings: [], total: 0, isRealMode: true })),
        api.tasks.getAll().catch(() => ({
          tasks: [],
          groups: { dueToday: [], overdue: [], upcoming: [], completed: [] },
          counts: { total: 0, dueToday: 0, overdue: 0, upcoming: 0, completed: 0 },
          isRealMode: true,
        })),
        api.analytics.getSummary().catch(() => ({ analytics: null, isRealMode: true })),
      ]);

      const all = allMeetingsRes.meetings || [];
      setAllMeetings(all);
      setRecentMeetings(all.filter((m) => m.status === "COMPLETED").slice(0, 3));
      setAllTasks(tasksRes.tasks || []);
      setAnalytics(analyticsRes.analytics);

      if ((upcomingRes as any)?.warning || (upcomingRes as any)?.error) {
        // Log softly without blocking
        console.warn("Calendar notice:", (upcomingRes as any).warning || (upcomingRes as any).error);
      }
    } catch (err: any) {
      console.warn("Dashboard data notice:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData, isDemoMode]);

  const handleRefreshCalendar = async () => {
    setIsRefreshingCalendar(true);
    try {
      const [upcomingRes, allMeetingsRes, analyticsRes] = await Promise.all([
        api.meetings.getUpcoming().catch(() => ({ meetings: [], count: 0 })),
        api.meetings.getAll().catch(() => ({ meetings: [], total: 0 })),
        api.analytics.getSummary().catch(() => ({ analytics: null })),
      ]);

      const liveUpcoming = upcomingRes.meetings || [];
      const liveAll = allMeetingsRes.meetings || [];

      setAllMeetings(liveAll);
      setRecentMeetings(liveAll.filter((m) => m.status === "COMPLETED").slice(0, 3));
      if (analyticsRes.analytics) {
        setAnalytics(analyticsRes.analytics);
      }

      if ((upcomingRes as any)?.warning || (upcomingRes as any)?.error) {
        info("Calendar Notice", (upcomingRes as any).warning || (upcomingRes as any).error || "");
      } else {
        success("Calendar Refreshed", `Synced ${liveUpcoming.length} meeting(s).`);
      }
    } catch (err: any) {
      console.warn("Calendar refresh notice:", err);
    } finally {
      setIsRefreshingCalendar(false);
    }
  };

  const handleToggleTask = async (id: string) => {
    setCompletingTaskId(id);
    try {
      await api.tasks.complete(id);
      success("Task Completed", "Action item marked as done.");
      setAllTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "COMPLETED" } : t))
      );
      loadDashboardData();
    } catch (err: any) {
      error("Failed to complete task", err.message);
    } finally {
      setCompletingTaskId(null);
    }
  };

  // Filter meetings that occur on today's real date
  const todayMeetings = useMemo(() => {
    const today = new Date();
    return allMeetings.filter((m) => {
      const d = new Date(m.startTime);
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });
  }, [allMeetings]);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#181D1A] flex flex-col relative selection:bg-[#FF9D9D]/30">
      {/* Topbar matching reference image */}
      <Topbar
        onOpenMobileMenu={openMobileMenu}
        showSearch={true}
        searchPlaceholder="Search meetings, action items, transcripts..."
        onSyncCalendar={handleRefreshCalendar}
        isSyncing={isRefreshingCalendar}
      />

      {/* Main Dashboard Canvas with Warm Ivory and Background Art */}
      <div className="relative flex-1 px-4 sm:px-8 lg:px-10 py-6 sm:py-8 max-w-[1680px] w-full mx-auto space-y-6 sm:space-y-7">
        {/* Subtle Geometric Background Art from Reference Image */}
        <DashboardBackgroundArt />

        {/* 1. Header Hero Greeting & Brand Statement */}
        <DashboardHeaderHero user={user} />

        {isLoading && allMeetings.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#E85555] border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-semibold text-[#6B7280]">Syncing meeting intelligence...</p>
          </div>
        ) : (
          <>
            {/* 2. KPI Cards Row (4 cards matching reference image) */}
            <KpiCardsRow
              meetings={allMeetings}
              todayMeetings={todayMeetings}
              tasks={allTasks}
              selectedDate={selectedCalendarDate}
              onResetDateToToday={() => setSelectedCalendarDate(new Date())}
              analytics={analytics}
            />

        {/* 3. Main 3-Column Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start relative z-10">
          {/* Column 1: Left (Calendar + Today's Schedule) */}
          <div className="lg:col-span-12 xl:col-span-3 space-y-5 sm:space-y-6">
            <InteractiveCalendarCard
              meetings={allMeetings}
              selectedDate={selectedCalendarDate}
              onSelectDate={setSelectedCalendarDate}
            />
            <TodayScheduleCard
              meetings={allMeetings}
              selectedDate={selectedCalendarDate}
            />
          </div>

          {/* Column 2: Middle (Weekly Focus & Meeting Hours + Action Items) */}
          <div className="lg:col-span-12 xl:col-span-6 space-y-5 sm:space-y-6">
            <WeeklyFocusCapacityCard meetings={allMeetings} />
            <ActionItemsCard
              tasks={allTasks}
              onToggleTask={handleToggleTask}
              completingTaskId={completingTaskId}
              userName={user?.name}
            />
          </div>

          {/* Column 3: Right (AI Assistant + Today's Focus + Recent Meetings) */}
          <div className="lg:col-span-12 xl:col-span-3 space-y-5 sm:space-y-6">
            <AiAssistantCard meetings={allMeetings} tasks={allTasks} />
            <TodayFocusCard
              todayMeetings={todayMeetings}
              selectedDate={selectedCalendarDate}
              allMeetings={allMeetings}
            />
            <RecentMeetingsCard
              recentMeetings={recentMeetings}
              allMeetings={allMeetings}
            />
          </div>
        </div>
      </>
    )}
  </div>
</div>
  );
};
