import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border border-dashed border-border rounded-2xl bg-surface/50 ${className || ''}`}>
      <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center text-secondary mb-3 border border-border">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h4 className="text-base font-semibold text-primary">{title}</h4>
      <p className="text-sm text-secondary max-w-sm mt-1 mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
