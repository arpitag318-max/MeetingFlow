import React from 'react';

interface DayData {
  day: string;
  hours: number;
  meetingCount: number;
}

interface EditorialBarChartProps {
  data: DayData[];
  title?: string;
  subtitle?: string;
}

export const EditorialBarChart: React.FC<EditorialBarChartProps> = ({
  data,
  title = 'Daily Meeting Hours',
  subtitle = 'Hours spent in Google Meet this week'
}) => {
  const maxHours = Math.max(...data.map(d => d.hours), 5);

  return (
    <div className="bg-white rounded-2xl border border-[#EAE4DC] p-5 shadow-subtle">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="text-sm font-bold text-[#181D1A] tracking-tight">{title}</h4>
          <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs font-semibold text-[#6B7280] bg-[#FAF7F2] px-2.5 py-1 rounded-full border border-[#EAE4DC]">
          Mon to Fri
        </span>
      </div>

      <div className="grid grid-cols-5 gap-3 sm:gap-6 items-end h-48 pt-6 pb-2 px-2">
        {data.map((item, index) => {
          const heightPercent = Math.max((item.hours / maxHours) * 100, 8);

          return (
            <div key={item.day} className="flex flex-col items-center h-full justify-end group">
              {/* Value Tooltip */}
              <div className="text-[11px] font-semibold text-[#181D1A] mb-2 group-hover:-translate-y-1 transition-transform">
                {item.hours}h
              </div>

              {/* Bar */}
              <div className="w-full max-w-[42px] bg-[#FAF7F2] rounded-t-lg overflow-hidden h-36 flex items-end border border-[#EAE4DC]">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t transition-all duration-500 ${
                    index === data.length - 1
                      ? 'bg-[#E85555]'
                      : 'bg-[#FF9D9D]'
                  } group-hover:opacity-90`}
                />
              </div>

              {/* Day Label */}
              <div className="mt-3 text-center">
                <span className="text-xs font-semibold text-primary block">{item.day}</span>
                <span className="text-[10px] text-secondary block font-mono">{item.meetingCount} meets</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
