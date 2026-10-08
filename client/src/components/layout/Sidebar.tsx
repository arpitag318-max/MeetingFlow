import React, { useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Home,
  Video,
  CheckSquare,
  BarChart3,
  Layers,
  Settings,
  HelpCircle,
  LogOut,
  ArrowRightLeft,
  User
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import { HelpModal } from "./HelpModal";

interface NavItemConfig {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const PRIMARY_NAV: NavItemConfig[] = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

const SECONDARY_NAV: NavItemConfig[] = [
  { to: "/integrations", label: "Integrations", icon: Layers },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const { user, isDemoMode, isGoogleConnected, toggleMode, logout } = useAuth();
  const navigate = useNavigate();
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen]);

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <>
      <aside
        className="w-20 h-screen bg-[#1B211E] border-r border-[#262E2A] flex flex-col items-center justify-between py-5 select-none relative z-30"
        aria-label="Main Navigation Sidebar"
      >
        {/* TOP: MeetingFlow 44x44px Logo Container */}
        <div className="flex flex-col items-center">
          <Link
            to="/dashboard"
            onClick={onCloseMobile}
            className="group relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-[14px]"
            aria-label="MeetingFlow Home"
          >
            <div className="w-11 h-11 rounded-[14px] bg-[#F2F4F1] flex items-center justify-center text-[#171B19] shadow-sm transition-transform duration-150 ease-out active:scale-95 group-hover:opacity-95 p-1 overflow-hidden">
              {/* MeetingFlow Ribbon "M" Logo Mark */}
              <img
                src="/meetingflow-icon-square.png"
                alt="MeetingFlow"
                className="w-8 h-8 object-contain"
              />
            </div>

            {/* Accessible Tooltip */}
            <span
              role="tooltip"
              className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171B19] text-[#F2F4F1] border border-white/15 rounded-lg text-xs font-semibold tracking-wide shadow-elevated whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 transform group-hover:translate-x-0 group-focus-visible:translate-x-0 -translate-x-1 z-50 flex items-center gap-1.5"
            >
              MeetingFlow
              <span className="w-1.5 h-1.5 rounded-full bg-pastel-sage" />
            </span>
          </Link>
        </div>

        {/* CENTER NAVIGATION: Primary, Divider, Secondary */}
        <nav className="flex flex-col items-center gap-2.5 w-full my-auto" aria-label="Main Navigation">
          {/* Primary Nav Items: Home, Meetings, Tasks, Analytics */}
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    "group relative w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                    isActive
                      ? "bg-[#F2F4F1] text-[#171B19] shadow-sm font-semibold"
                      : "text-[#8E9B93] hover:text-[#F2F4F1] hover:bg-white/[0.08]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute -left-3.5 w-1 h-5 rounded-r-full bg-[#3157D5]" />}
                    <Icon className="w-5 h-5 shrink-0 stroke-[1.8]" />

                    {/* Tooltip */}
                    <span
                      role="tooltip"
                      className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171B19] text-[#F2F4F1] border border-white/15 rounded-lg text-xs font-medium tracking-wide shadow-elevated whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 transform group-hover:translate-x-0 group-focus-visible:translate-x-0 -translate-x-1 z-50 flex items-center gap-1"
                    >
                      {item.label}
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* DIVIDER */}
          <div className="w-8 h-[1px] bg-white/10 my-1" role="separator" />

          {/* Secondary Nav Items: Integrations, Settings */}
          {SECONDARY_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    "group relative w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                    isActive
                      ? "bg-[#F2F4F1] text-[#171B19] shadow-sm font-semibold"
                      : "text-[#8E9B93] hover:text-[#F2F4F1] hover:bg-white/[0.08]"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute -left-3.5 w-1 h-5 rounded-r-full bg-[#3157D5]" />}
                    <Icon className="w-5 h-5 shrink-0 stroke-[1.8]" />

                    {/* Tooltip */}
                    <span
                      role="tooltip"
                      className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171B19] text-[#F2F4F1] border border-white/15 rounded-lg text-xs font-medium tracking-wide shadow-elevated whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 transform group-hover:translate-x-0 group-focus-visible:translate-x-0 -translate-x-1 z-50 flex items-center gap-1"
                    >
                      {item.label}
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#3157D5]" />}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* BOTTOM: Help & Authenticated User Profile */}
        <div className="flex flex-col items-center gap-3 w-full" ref={profileRef}>
          {/* Help Button */}
          <button
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="Help & Documentation"
            className="group relative w-11 h-11 rounded-[14px] flex items-center justify-center text-[#8E9B93] hover:text-[#F2F4F1] hover:bg-white/[0.08] transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            <HelpCircle className="w-5 h-5 shrink-0 stroke-[1.8]" />

            {/* Tooltip */}
            <span
              role="tooltip"
              className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171B19] text-[#F2F4F1] border border-white/15 rounded-lg text-xs font-medium tracking-wide shadow-elevated whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 transform group-hover:translate-x-0 group-focus-visible:translate-x-0 -translate-x-1 z-50"
            >
              Help & Shortcuts
            </span>
          </button>

          {/* User Profile / Avatar Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              aria-label="Account Menu"
              aria-expanded={isProfileOpen}
              className={cn(
                "group relative w-11 h-11 rounded-[14px] flex items-center justify-center transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                isProfileOpen ? "ring-2 ring-white/30 bg-white/[0.08]" : "hover:bg-white/[0.08]"
              )}
            >
              <div className="relative">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "User Avatar"}
                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-[#F2F4F1]">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-[#F2F4F1]" />}
                  </div>
                )}

                {/* Status Dot */}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#1B211E]",
                    isDemoMode
                      ? "bg-accent-amber"
                      : isGoogleConnected
                      ? "bg-accent-forest"
                      : "bg-accent-coral"
                  )}
                />
              </div>

              {/* Tooltip (Only when popover is closed) */}
              {!isProfileOpen && (
                <span
                  role="tooltip"
                  className="absolute left-[calc(100%+14px)] top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#171B19] text-[#F2F4F1] border border-white/15 rounded-lg text-xs font-medium tracking-wide shadow-elevated whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-all duration-150 transform group-hover:translate-x-0 group-focus-visible:translate-x-0 -translate-x-1 z-50 flex items-center gap-1.5"
                >
                  <span>{user?.name || "Account"}</span>
                  <span className="text-[10px] text-[#8E9B93]">({isDemoMode ? "Demo" : "Real"})</span>
                </span>
              )}
            </button>

            {/* Profile Popover Menu */}
            {isProfileOpen && (
              <div
                className="absolute left-[calc(100%+14px)] bottom-0 w-64 bg-[#1B211E] border border-white/15 rounded-2xl shadow-elevated p-3 z-50 text-surface-white animate-in fade-in zoom-in-95 duration-150 select-none text-left"
                role="menu"
              >
                {/* User Info Header */}
                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.04] mb-2 border border-white/5">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || "User"}
                      className="w-9 h-9 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold text-[#F2F4F1]">
                      {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-[#F2F4F1]" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-surface-white truncate">{user?.name || "MeetingFlow User"}</p>
                    <p className="text-[11px] text-[#8E9B93] truncate">{user?.email || "Authenticated"}</p>
                  </div>
                </div>

                {/* Mode Status Pill & Toggle */}
                <div className="p-2 rounded-xl bg-white/[0.04] border border-white/5 mb-2">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-[#8E9B93] text-[11px]">System Mode</span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        isDemoMode
                          ? "bg-accent-amber/20 text-[#E9B949] border border-accent-amber/30"
                          : isGoogleConnected
                          ? "bg-accent-forest/20 text-[#4ADE80] border border-accent-forest/30"
                          : "bg-accent-coral/20 text-[#F87171] border border-accent-coral/30"
                      )}
                    >
                      {isDemoMode ? "DEMO MODE" : isGoogleConnected ? "REAL (GOOGLE LINKED)" : "REAL (UNLINKED)"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      toggleMode(!isDemoMode);
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-medium text-surface-white transition-colors"
                  >
                    <ArrowRightLeft className="w-3 h-3 text-[#8E9B93]" />
                    <span>{isDemoMode ? "Switch to Real Mode" : "Switch to Demo Mode"}</span>
                  </button>
                </div>

                {/* Quick Menu Actions */}
                <div className="space-y-0.5 pt-1 border-t border-white/10 text-xs">
                  <Link
                    to="/integrations"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#8E9B93] hover:text-surface-white hover:bg-white/[0.08] transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Integrations (Jira & Google)</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[#8E9B93] hover:text-surface-white hover:bg-white/[0.08] transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Workspace Settings</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-semantic-error hover:bg-semantic-error/10 transition-colors text-left font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
};

