import React from 'react';
import { cn } from '../../utils/cn';
import { TableSkeleton as StandardTableSkeleton } from '../common/Loaders';

const Skeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('animate-skeleton-loading bg-neutral-200 rounded-md', className)}
    {...props}
  />
));

Skeleton.displayName = 'Skeleton';

export const TableSkeleton = ({ rows = 5, columns = 6 }) => (
  <StandardTableSkeleton rows={rows} columns={columns} />
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
