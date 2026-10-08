import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'cobalt'
    | 'coral'
    | 'amber'
    | 'violet'
    | 'forest'
    | 'outline'
    | 'neutral'
    | 'dark'
    | 'success'
    | 'warning'
    | 'error'
    | 'pastelBlue'
    | 'pastelLavender'
    | 'pastelButter'
    | 'pastelPeach'
    | 'pastelSage'
    | 'mint'
    | 'peach';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border transition-colors',
        size === 'sm' && 'text-[11px] px-2.5 py-0.5 gap-1.5 font-medium tracking-tight',
        size === 'md' && 'text-xs px-3 py-1 gap-1.5 font-medium',
        // Bold Editorial Variants
        (variant === 'default' || variant === 'neutral') &&
          'bg-[#E5E8E4] text-[#171A19] border-[rgba(23,26,25,0.12)]',
        variant === 'outline' &&
          'bg-transparent text-[#171A19] border-[rgba(23,26,25,0.16)]',
        variant === 'dark' &&
          'bg-[#171A19] text-[#F1F2EF] border-[#171A19]',
        (variant === 'cobalt' || variant === 'pastelBlue') &&
          'bg-[#3157D5]/10 text-[#3157D5] border-[#3157D5]/25 font-semibold',
        (variant === 'violet' || variant === 'pastelLavender') &&
          'bg-[#6C4AB6]/10 text-[#6C4AB6] border-[#6C4AB6]/25 font-semibold',
        (variant === 'amber' || variant === 'pastelButter' || variant === 'warning') &&
          'bg-[#E9B949]/15 text-[#946300] border-[#E9B949]/35 font-semibold',
        (variant === 'coral' || variant === 'pastelPeach' || variant === 'error') &&
          'bg-[#FFF1EF] text-[#D93838] border-[#FFD4CF] font-semibold',
        (variant === 'forest' || variant === 'pastelSage' || variant === 'success') &&
          'bg-[#F0FAF4] text-[#1D7B4B] border-[#D3F5E2] font-semibold',
        variant === 'mint' &&
          'bg-[#F0FAF4] text-[#1D7B4B] border-[#D3F5E2] font-semibold',
        variant === 'peach' &&
          'bg-[#FFF6F0] text-[#C46237] border-[#FFE3D5] font-semibold',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
