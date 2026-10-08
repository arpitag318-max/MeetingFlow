import React from "react";
import { Modal } from "../ui/Modal";
import { Command, ShieldCheck, Video, CheckSquare } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { isDemoMode, isGoogleConnected } = useAuth();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="MeetingFlow Quick Guide & Shortcuts"
      description="Turn every meeting into organized, verifiable work."
      maxWidth="md"
    >
      <div className="space-y-5 p-1">
        {/* Architecture Highlight */}
        <div className="p-3.5 rounded-xl bg-pastel-sage/30 border border-[#BFD6C5] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#2C4A3A] shrink-0 mt-0.5" />
          <div className="text-xs text-[#2C4A3A]">
            <p className="font-bold">Zero-Hallucination AI Extraction</p>
            <p className="mt-0.5 leading-relaxed text-[#355A46]">
              MeetingFlow analyzes authentic Google Meet transcripts with Gemini 2.5 Flash. Only explicitly stated decisions and assigned action items are extracted. Unspecified owners remain null.
            </p>
          </div>
        </div>

        {/* Core Sections */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="p-3 rounded-xl bg-background border border-border/80">
            <div className="flex items-center gap-2 mb-1.5">
              <Video className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">Live Meetings</span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              Syncs with Google Calendar. Analyzes uploaded transcripts or queries Google Meet conference spaces.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-background border border-border/80">
            <div className="flex items-center gap-2 mb-1.5">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">Action Items</span>
            </div>
            <p className="text-[11px] text-secondary leading-relaxed">
              One-click Jira ticket creation and Google Calendar reminder insertion for your assigned tasks.
            </p>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="border border-border rounded-xl p-3.5 bg-surface-white">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-primary">
            <Command className="w-3.5 h-3.5" />
            <span>Navigation & System Status</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-secondary text-[11px]">Active Mode</span>
              <span className="font-semibold text-primary text-[11px]">
                {isDemoMode ? "Demo Sandbox" : isGoogleConnected ? "Real Mode (Connected)" : "Real Mode (Unlinked)"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/50">
              <span className="text-secondary text-[11px]">AI Model</span>
              <span className="font-semibold text-primary text-[11px]">Gemini 2.5 Flash</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-secondary text-[11px]">Auth Engine</span>
              <span className="font-semibold text-primary text-[11px]">Supabase Cloud</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-secondary text-[11px]">Close dialog</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-background border border-border rounded">Esc</kbd>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

