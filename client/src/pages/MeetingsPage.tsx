import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { Topbar } from '../components/layout/Topbar';
import { MeetingCard } from '../components/meetings/MeetingCard';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { api } from '../api/client';
import { Meeting } from '../types';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Video } from 'lucide-react';

export const MeetingsPage: React.FC = () => {
  const { openMobileMenu } = useOutletContext<{ openMobileMenu: () => void }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isDemoMode } = useAuth();
  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const currentStatus = searchParams.get('status') || 'ALL';
  const searchQuery = searchParams.get('search') || '';

  const loadMeetings = async () => {
    try {
      const res = await api.meetings.getAll({
        status: currentStatus,
        search: searchQuery
      });
      setMeetings(res.meetings);
    } catch (err: any) {
      error('Failed to load meetings', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [currentStatus, searchQuery]);

  const handleProcessMeeting = async (id: string) => {
    setProcessingId(id);
    try {
      await api.meetings.process(id, isDemoMode);
      success('Meeting Processed', 'Analysis and action items successfully generated.');
      await loadMeetings();
    } catch (err: any) {
      error('Processing Failed', err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSimulateMeeting = async () => {
    setIsSimulating(true);
    try {
      const res = await api.meetings.simulate();
      success('Simulated Meeting Created', `"${res.meeting.title}" added to your calendar (Demo Mode).`);
      await loadMeetings();
    } catch (err: any) {
      error('Simulation Failed', err.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Topbar
        onOpenMobileMenu={openMobileMenu}
        title="Meetings"
        subtitle="Manage upcoming conferences and review AI-processed meeting intelligence"
        action={
          isDemoMode && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleSimulateMeeting}
              isLoading={isSimulating}
              className="gap-1.5 text-xs shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Simulate New Meeting
            </Button>
          )
        }
      />

      <div className="w-full px-6 sm:px-8 lg:px-8 py-6 space-y-6">
        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#EAE4DC] shadow-subtle overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All Meetings' },
              { id: 'SCHEDULED', label: 'Upcoming' },
              { id: 'COMPLETED', label: 'Completed & Analyzed' },
            ].map((tab) => {
              const active = currentStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    if (tab.id === 'ALL') newParams.delete('status');
                    else newParams.set('status', tab.id);
                    setSearchParams(newParams);
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[#E85555] text-white shadow-2xs'
                      : 'text-[#6B7280] hover:text-[#181D1A] hover:bg-[#FAF7F2]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#8C948F] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={(e) => {
                const newParams = new URLSearchParams(searchParams);
                if (e.target.value) newParams.set('search', e.target.value);
                else newParams.delete('search');
                setSearchParams(newParams);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#EAE4DC] rounded-xl text-[#181D1A] placeholder-[#8C948F] focus:outline-none focus:ring-1 focus:ring-[#E85555] focus:border-[#E85555] shadow-subtle"
            />
          </div>
        </div>

        {/* Meeting Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No meetings found"
            description="No meetings match your filter or search query."
            actionLabel={isDemoMode ? 'Simulate New Meeting' : undefined}
            onAction={isDemoMode ? handleSimulateMeeting : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onProcess={handleProcessMeeting}
                isProcessing={processingId === meeting.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
