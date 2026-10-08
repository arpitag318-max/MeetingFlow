import React from "react";
import { User } from "../../types";

interface DashboardHeaderHeroProps {
  user: User | null;
}

export const DashboardHeaderHero: React.FC<DashboardHeaderHeroProps> = ({ user }) => {
  const firstName = user?.name ? user.name.split(" ")[0] : "Arpita";

  // Formatted date matching reference: "Monday, Oct 5, 2026"
  const todayFormatted = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

  // Dynamic greeting based on hour of day
  const hour = new Date().getHours();
  const greetingTime = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6 pt-2 pb-4">
      {/* Left side: Greeting and subtitle */}
      <div className="relative z-10 max-w-xl">
        <p className="text-xs sm:text-sm font-medium text-[#6B7280] tracking-wide mb-1">
          {todayFormatted}
        </p>
        <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-[#181D1A] tracking-[-0.03em] leading-tight">
          {greetingTime}, {firstName}
        </h1>
        <p className="text-sm sm:text-base text-[#6B7280] mt-1.5 font-normal">
          Here’s your meeting overview and priorities for today.
        </p>
      </div>

      {/* Right side: Editorial brand statement matching reference image */}
      <div className="relative z-10 hidden sm:block text-right self-end pb-1">
        <h2 className="text-2xl lg:text-3xl font-serif tracking-tight text-[#181D1A] leading-snug">
          <div>Same meetings.</div>
          <div>More progress.</div>
        </h2>
        <div className="w-10 h-0.5 bg-[#E85555] rounded-full mt-2.5 ml-auto" />
      </div>
    </div>
  );
};
