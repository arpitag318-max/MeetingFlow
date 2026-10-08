import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'cobalt' | 'pastel' | 'coral' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E85555]/30 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none',
          // Variants
          (variant === 'primary' || variant === 'coral') && 'bg-[#E85555] text-white hover:bg-[#D64444] border border-[#DC4242] shadow-sm',
          variant === 'dark' && 'bg-[#181D1A] text-white hover:bg-[#2A312D] shadow-subtle',
          variant === 'secondary' && 'bg-white text-primary border border-[#EAE4DC] hover:bg-[#FAF7F2] shadow-subtle',
          variant === 'outline' && 'bg-transparent text-primary border border-border hover:bg-[rgba(24,29,26,0.04)] hover:border-primary/30',
          variant === 'ghost' && 'bg-transparent text-secondary hover:text-primary hover:bg-[rgba(24,29,26,0.05)]',
          variant === 'danger' && 'bg-[#E85555] text-white hover:bg-[#D64444]',
          variant === 'cobalt' && 'bg-[#3157D5] text-white hover:bg-[#2546B8] shadow-sm',
          variant === 'pastel' && 'bg-[#FFF1EF] text-[#E85555] border border-[#FFD4CF] hover:bg-[#FFEAE7]',
          // Sizes
          size === 'sm' && 'text-xs px-3 py-1.5 gap-1.5 rounded-lg',
          size === 'md' && 'text-sm px-4 py-2 gap-2 rounded-lg',
          size === 'lg' && 'text-base px-5 py-2.5 gap-2.5 rounded-lg',
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
