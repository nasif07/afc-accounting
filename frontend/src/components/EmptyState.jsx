import React from 'react';
import { cn } from '../utils/cn';
import Button from './ui/Button';

const EmptyState = React.forwardRef(
  (
    {
      icon: Icon,
      title,
      description,
      action,
      actionLabel = 'Create',
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center py-16 px-6 text-center',
          className
        )}
        {...props}
      >
        {Icon && (
          <div className="mb-4 w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
            <Icon size={32} className="text-neutral-400" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">{title}</h3>
        {description && (
          <p className="text-sm text-neutral-600 mb-6 max-w-sm">{description}</p>
        )}
        {action && (
          <Button variant="primary" onClick={action}>
            {actionLabel}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

export default EmptyState;
