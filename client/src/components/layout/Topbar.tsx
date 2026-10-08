import React, { useState } from 'react';
import { Menu, ArrowRightLeft, Search, RefreshCw, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/Badge';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onSyncCalendar?: () => void;
  isSyncing?: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileMenu,
  title,
  subtitle,
  action,
  showSearch = true,
  searchPlaceholder = 'Search meetings, action items, transcripts...',
  onSearch,
  onSyncCalendar,
  isSyncing = false,
}) => {
  const { user, isDemoMode, isGoogleConnected, toggleMode } = useAuth();
  const [searchVal, setSearchVal] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearch?.(e.target.value);
  };

  const displayName = user?.name || 'Arpita';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#EAE4DC] px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Mobile menu trigger & brand */}
        <div className="lg:hidden flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-white border border-[#EAE4DC] transition-colors shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-[#181D1A]" />
          </button>
          <Link to="/dashboard" className="flex items-center shrink-0">
            <img src="/meetingflow-icon-square.png" alt="MeetingFlow" className="w-7 h-7 object-contain" />
          </Link>
        </div>

        {/* Search Bar matching reference image */}
        {showSearch ? (
          <div className="relative flex items-center max-w-md w-full">
            <Search className="w-4 h-4 text-[#8C948F] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchVal}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-12 py-2 text-xs bg-white border border-[#EAE4DC] rounded-xl text-[#181D1A] placeholder-[#8C948F] focus:outline-none focus:ring-1 focus:ring-[#E85555] focus:border-[#E85555] transition-all shadow-subtle"
            />
            <span className="hidden sm:inline-flex items-center absolute right-2.5 px-1.5 py-0.5 text-[10px] font-medium text-[#8C948F] bg-[#FAF7F2] border border-[#EAE4DC] rounded-md pointer-events-none">
              ⌘ K
            </span>
          </div>
        ) : (
          title && (
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#181D1A] tracking-tight leading-tight">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[#6B7280] hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          )
        )}
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Sync Calendar Button */}
        {onSyncCalendar && (
          <button
            onClick={onSyncCalendar}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#E85555] hover:bg-[#D64444] rounded-xl shadow-sm border border-[#DC4242] transition-colors disabled:opacity-60"
            title="Sync calendar with Google"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
            <span className="hidden sm:inline">Sync Calendar</span>
          </button>
        )}

        {/* Custom page action if provided */}
        {action}

        {/* Real / Demo Mode subtle status */}
        {!isDemoMode ? (
          <div className="hidden xl:flex items-center gap-1.5">
            {isGoogleConnected ? (
              <Badge variant="mint" size="sm" className="items-center gap-1.5 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1D7B4B]" />
                Google Connected
              </Badge>
            ) : (
              <Link to="/integrations">
                <Badge variant="amber" size="sm" className="items-center gap-1.5 font-semibold hover:border-primary/40 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-amber" />
                  Connect Google
                </Badge>
              </Link>
            )}
          </div>
        ) : (
          <div className="hidden xl:flex items-center gap-1.5">
            <Badge variant="amber" size="sm" className="items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" />
              Demo Mode
            </Badge>
            <button
              onClick={() => toggleMode(false)}
              className="text-[11px] text-[#181D1A] hover:underline font-bold px-2 py-0.5 rounded-lg bg-white border border-[#EAE4DC] flex items-center gap-1"
            >
              <ArrowRightLeft className="w-3 h-3" />
              Real Mode
            </button>
          </div>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-white border border-[#EAE4DC] text-[#181D1A] hover:bg-[#FAF7F2] transition-colors shadow-subtle"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-[#4A5550]" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E85555] text-white text-[10px] font-bold flex items-center justify-center">
              1
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-elevated border border-[#EAE4DC] p-3 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#EAE4DC]">
                <span className="text-xs font-bold text-[#181D1A]">Notifications</span>
                <span className="text-[10px] font-medium text-[#E85555]">1 unread</span>
              </div>
              <div className="py-2.5">
                <p className="text-xs font-semibold text-[#181D1A]">Calendar Sync Active</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">Google Calendar connected and syncing automatically.</p>
              </div>
            </div>
          )}
        </div>

        {/* User Profile matching reference: gold circle with A, Arpita */}
        <Link
          to="/settings"
          className="flex items-center gap-2 pl-1 pr-2.5 py-1 bg-white border border-[#EAE4DC] rounded-xl hover:bg-[#FAF7F2] transition-colors shadow-subtle"
        >
          <div className="w-6 h-6 rounded-full bg-[#E5A93C] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
            {initial}
          </div>
          <span className="text-xs font-semibold text-[#181D1A] hidden md:inline-block">
            {displayName}
          </span>
          <ChevronDown className="w-3 h-3 text-[#8C948F] hidden md:inline-block" />
        </Link>
      </div>
    </header>
  );
};
