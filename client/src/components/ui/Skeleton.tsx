import React from 'react';
import { cn } from '../../utils/cn';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-[#E2E8E2]', className)}
    />
  );
};
