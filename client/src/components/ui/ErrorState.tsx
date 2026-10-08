import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className
}) => {
  return (
    <div className={`p-6 border border-semantic-error/30 rounded-2xl bg-[#FDF5F5] text-center flex flex-col items-center justify-center ${className || ''}`}>
      <div className="w-10 h-10 rounded-full bg-semantic-error/10 text-semantic-error flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-primary">{title}</h4>
      <p className="text-xs text-secondary mt-1 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="gap-1.5 text-xs">
          <RotateCcw className="w-3.5 h-3.5" />
          Retry
        </Button>
      )}
    </div>
  );
};
