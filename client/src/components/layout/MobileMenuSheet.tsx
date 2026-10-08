import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Layers, Settings, HelpCircle, LogOut, ArrowRightLeft, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";

interface MobileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
}

export const MobileMenuSheet: React.FC<MobileMenuSheetProps> = ({
  isOpen,
  onClose,
  onOpenHelp,
}) => {
  const { user, isDemoMode, isGoogleConnected, toggleMode, logout } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate("/login");
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <div className="relative w-full bg-surface border-t border-border rounded-t-3xl shadow-elevated p-6 z-10 animate-in slide-in-from-bottom-6 duration-200 safe-bottom">
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name || "User"}
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-pastel-sage/50 flex items-center justify-center text-sm font-bold text-primary">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5 text-primary" />}
              </div>
            )}
            <div>
              <h4 className="text-sm font-bold text-primary">{user?.name || "MeetingFlow User"}</h4>
              <p className="text-xs text-secondary">{user?.email || "Authenticated"}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] rounded-full text-secondary hover:text-primary hover:bg-background transition-colors flex items-center justify-center"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Pill & Switcher */}
        <div className="my-4 p-3 rounded-2xl bg-background border border-border">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-secondary font-medium">System Mode</span>
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                isDemoMode
                  ? "bg-pastel-butter text-[#5C552E] border border-[#D5DDA0]"
                  : isGoogleConnected
                  ? "bg-pastel-sage text-[#2C4A3A] border border-[#BFD6C5]"
                  : "bg-pastel-peach text-[#6C3E33] border border-[#E4C5B7]"
              )}
            >
              {isDemoMode ? "DEMO MODE" : isGoogleConnected ? "REAL MODE (CONNECTED)" : "REAL MODE (UNLINKED)"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              toggleMode(!isDemoMode);
              onClose();
            }}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-surface hover:bg-surface-white border border-border text-xs font-semibold text-primary transition-colors active:scale-98"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-secondary" />
            <span>{isDemoMode ? "Switch to Real Mode" : "Switch to Demo Mode"}</span>
          </button>
        </div>

        {/* Mobile Extended Navigation: Integrations & Settings */}
        <div className="space-y-1 mb-4">
          <Link
            to="/integrations"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-xs font-semibold text-primary hover:bg-background transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-pastel-blue/60 flex items-center justify-center text-primary">
              <Layers className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <p className="font-bold text-primary">Integrations</p>
              <p className="text-[11px] text-secondary font-normal">Connect Jira & Google Calendar</p>
            </div>
          </Link>

          <Link
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-xs font-semibold text-primary hover:bg-background transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-pastel-lavender/60 flex items-center justify-center text-primary">
              <Settings className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <p className="font-bold text-primary">Workspace Settings</p>
              <p className="text-[11px] text-secondary font-normal">Account profile & preferences</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
            className="w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-xs font-semibold text-primary hover:bg-background transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-pastel-sage/60 flex items-center justify-center text-primary">
              <HelpCircle className="w-4 h-4 stroke-[1.8]" />
            </div>
            <div>
              <p className="font-bold text-primary">Help & Shortcuts</p>
              <p className="text-[11px] text-secondary font-normal">Workflow tips & documentation</p>
            </div>
          </button>
        </div>

        {/* Sign Out Button */}
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-semantic-error bg-semantic-error/10 hover:bg-semantic-error/15 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

