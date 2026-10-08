import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Video, CheckSquare, BarChart3 } from "lucide-react";
import { cn } from "../../utils/cn";

const MOBILE_ITEMS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/meetings", label: "Meetings", icon: Video },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export const MobileNav: React.FC = () => {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border shadow-elevated select-none"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around h-16 px-3 max-w-lg mx-auto">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center flex-1 min-h-[44px] min-w-[44px] py-1 text-center transition-all duration-150 active:scale-95",
                  isActive
                    ? "text-primary font-bold"
                    : "text-secondary hover:text-primary"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "w-10 h-8 rounded-xl flex items-center justify-center transition-all duration-200",
                      isActive
                        ? "bg-[#1B211E] text-[#F2F4F1] shadow-sm"
                        : "text-secondary hover:text-primary"
                    )}
                  >
                    <Icon className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight font-medium">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

