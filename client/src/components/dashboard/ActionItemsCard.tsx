import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, CheckSquare } from "lucide-react";
import { UserTask } from "../../types";

interface ActionItemsCardProps {
  tasks: UserTask[];
  onToggleTask: (id: string) => Promise<void>;
  completingTaskId: string | null;
  userName?: string;
}

export const ActionItemsCard: React.FC<ActionItemsCardProps> = ({
  tasks,
  onToggleTask,
  completingTaskId,
  userName,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "my" | "overdue">("all");

  const overdueTasks = tasks.filter((t) => {
    if (t.status === "COMPLETED" || !t.dueDate) return false;
    return new Date(t.dueDate).getTime() < Date.now();
  });

  const allPendingTasks = tasks.filter((t) => t.status !== "COMPLETED");

  const displayedTasks = (() => {
    if (activeTab === "overdue") return overdueTasks;
    if (activeTab === "my") return allPendingTasks.slice(0, 5);
    return allPendingTasks.slice(0, 6);
  })();

  const formatDueDate = (d: string | null) => {
    if (!d) return "No date";
    try {
      const date = new Date(d);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return d;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 sm:p-6 shadow-subtle space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-[#181D1A]">Action Items</h3>
        <Link
          to="/tasks"
          className="text-xs font-bold text-[#E85555] hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabs matching reference */}
      <div className="flex items-center gap-2 border-b border-[#EAE4DC] pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-1 px-2.5 transition-all ${
            activeTab === "all"
              ? "text-[#E85555] border-b-2 border-[#E85555]"
              : "text-[#6B7280] hover:text-[#181D1A]"
          }`}
        >
          All ({allPendingTasks.length})
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`pb-1 px-2.5 transition-all ${
            activeTab === "my"
              ? "text-[#E85555] border-b-2 border-[#E85555]"
              : "text-[#6B7280] hover:text-[#181D1A]"
          }`}
        >
          My Tasks ({Math.min(allPendingTasks.length, 3)})
        </button>
        <button
          onClick={() => setActiveTab("overdue")}
          className={`pb-1 px-2.5 transition-all ${
            activeTab === "overdue"
              ? "text-[#E85555] border-b-2 border-[#E85555]"
              : "text-[#6B7280] hover:text-[#181D1A]"
          }`}
        >
          Overdue ({overdueTasks.length})
        </button>
      </div>

      {/* Action Items Table */}
      {displayedTasks.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#8C948F] flex items-center justify-center mx-auto mb-2">
            <CheckSquare className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-[#181D1A]">No pending action items</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5">
            Process a completed meeting to extract next steps.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] text-[#8C948F] font-semibold text-[11px]">
                <th className="py-2.5 px-2 w-8"></th>
                <th className="py-2.5 px-2">Task</th>
                <th className="py-2.5 px-2">Meeting</th>
                <th className="py-2.5 px-2">Owner</th>
                <th className="py-2.5 px-2">Due Date</th>
                <th className="py-2.5 px-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0ECE4]">
              {displayedTasks.map((task) => {
                const isOverdue =
                  task.dueDate && new Date(task.dueDate).getTime() < Date.now();
                const ownerName = userName ? userName.split(" ")[0] : "You";
                const ownerInitial = ownerName.charAt(0).toUpperCase();
                const isDone = completingTaskId === task.id;

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-[#FAF7F2]/60 transition-colors group"
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-2">
                      <button
                        onClick={() => onToggleTask(task.id)}
                        disabled={isDone}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isDone
                            ? "bg-[#1D7B4B] border-[#1D7B4B] text-white"
                            : "border-[#C5BCB2] hover:border-[#E85555] bg-white"
                        }`}
                      >
                        {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                    </td>

                    {/* Task Title */}
                    <td className="py-2.5 px-2 font-medium text-[#181D1A] max-w-[180px] truncate">
                      {task.title}
                    </td>

                    {/* Meeting Title */}
                    <td className="py-2.5 px-2 text-[#6B7280] max-w-[140px] truncate">
                      {task.meetingTitle || "General"}
                    </td>

                    {/* Owner */}
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4.5 h-4.5 rounded-full bg-[#E5A93C] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                          {ownerInitial}
                        </div>
                        <span className="text-[#181D1A]">{ownerName}</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="py-2.5 px-2 text-[#6B7280]">
                      {formatDueDate(task.dueDate)}
                    </td>

                    {/* Status Pill */}
                    <td className="py-2.5 px-2 text-right">
                      {isOverdue ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          Overdue
                        </span>
                      ) : task.status === "IN_PROGRESS" ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                          In Progress
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF1EF] text-[#E85555] border border-[#FFD4CF]">
                          To Do
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
