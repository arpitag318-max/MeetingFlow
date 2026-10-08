import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: 'cobalt' | 'coral' | 'amber' | 'violet' | 'forest' | 'blue' | 'lavender' | 'butter' | 'peach' | 'sage';
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon: Icon,
  accent = 'forest',
  trend
}) => {
  const iconAccentStyles: Record<string, string> = {
    cobalt: 'bg-[#3157D5]/12 text-[#3157D5]',
    blue: 'bg-[#3157D5]/12 text-[#3157D5]',
    violet: 'bg-[#6C4AB6]/12 text-[#6C4AB6]',
    lavender: 'bg-[#6C4AB6]/12 text-[#6C4AB6]',
    amber: 'bg-[#E9B949]/20 text-[#946300]',
    butter: 'bg-[#E9B949]/20 text-[#946300]',
    coral: 'bg-[#E76F51]/15 text-[#C0492E]',
    peach: 'bg-[#E76F51]/15 text-[#C0492E]',
    forest: 'bg-[#2F7D5A]/15 text-[#236346]',
    sage: 'bg-[#2F7D5A]/15 text-[#236346]',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-[#EAE4DC] bg-white p-5 shadow-subtle transition-all duration-200 flex flex-col justify-between'
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-secondary tracking-wide uppercase">
          {label}
        </span>
        {Icon && (
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', iconAccentStyles[accent])}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-1">
        <div className="text-2xl sm:text-3xl font-extrabold text-primary tracking-tight font-sans">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-secondary mt-1 font-medium">{subtitle}</p>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-2.5 border-t border-[#F0ECE4] flex items-center gap-1.5 text-[11px]">
          <span className={trend.isPositive ? 'text-[#1D7B4B] font-semibold' : 'text-[#6B7280]'}>
            {trend.value}
          </span>
          {trend.label && <span className="text-[#8C948F]">{trend.label}</span>}
        </div>
      )}
    </div>
  );
};
