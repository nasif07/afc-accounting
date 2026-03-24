import React from 'react';
import { cn } from '../../utils/cn';

const Skeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('animate-skeleton-loading bg-neutral-200 rounded-md', className)}
    {...props}
  />
));

Skeleton.displayName = 'Skeleton';

export const TableSkeleton = ({ rows = 5, columns = 6 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} className="h-12 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-4">
    <Skeleton className="h-6 w-1/3" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  </div>
);

export default Skeleton;
