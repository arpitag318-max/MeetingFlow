import React, { useState } from "react";
import { Sparkles, ArrowRight, ChevronRight, CheckCircle2 } from "lucide-react";
import { Meeting, UserTask } from "../../types";

interface AiAssistantCardProps {
  meetings: Meeting[];
  tasks: UserTask[];
}

export const AiAssistantCard: React.FC<AiAssistantCardProps> = ({ meetings, tasks }) => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsThinking(true);
    setTimeout(() => {
      setIsThinking(false);
      const q = query.toLowerCase();

      if (q.includes("task") || q.includes("action") || q.includes("due")) {
        const pending = tasks.filter((t) => t.status !== "COMPLETED");
        setResponse(
          `You currently have ${pending.length} pending action items. The highest priority is "${
            pending[0]?.title || "Prepare Q3 deck"
          }".`
        );
      } else if (q.includes("meeting") || q.includes("schedule") || q.includes("calendar")) {
        const next = meetings.find((m) => new Date(m.startTime).getTime() > Date.now());
        setResponse(
          next
            ? `Your next meeting is "${next.title}" at ${new Date(
                next.startTime
              ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`
            : `You have ${meetings.length} meeting(s) recorded in your connected Google Calendar.`
        );
      } else {
        const completed = meetings.filter((m) => m.status === "COMPLETED");
        if (completed.length > 0) {
          setResponse(
            `Across your recent processed meetings, decisions and transcripts are indexed and ready for deep search.`
          );
        } else {
          setResponse(
            `Connected and monitoring your Google Calendar. Ask me about tasks, upcoming schedules, or meeting decisions!`
          );
        }
      }
    }, 600);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-subtle flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#E85555]" />
            <h3 className="text-sm font-bold text-[#181D1A]">AI Assistant</h3>
          </div>
          <ChevronRight className="w-4 h-4 text-[#8C948F]" />
        </div>

        <p className="text-xs text-[#6B7280] leading-relaxed">
          Get instant insights from your meetings, action items and calendar.
        </p>

        {/* Dynamic Response Box if answered */}
        {response && (
          <div className="mt-3 p-3 bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl text-xs text-[#181D1A] animate-in fade-in">
            <div className="flex items-start gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1D7B4B] shrink-0 mt-0.5" />
              <span>{response}</span>
            </div>
          </div>
        )}
      </div>

      {/* Input box with coral arrow submit */}
      <form onSubmit={handleSubmit} className="mt-4 relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything about your meetings..."
          className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#FAF7F2] border border-[#EAE4DC] rounded-xl text-[#181D1A] placeholder-[#8C948F] focus:outline-none focus:ring-1 focus:ring-[#E85555] focus:border-[#E85555] transition-all"
        />
        <button
          type="submit"
          disabled={isThinking || !query.trim()}
          className="absolute right-1.5 p-1.5 rounded-lg bg-[#E85555] hover:bg-[#D64444] text-white disabled:opacity-50 transition-colors shadow-2xs"
          aria-label="Submit query"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
