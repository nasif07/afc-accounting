import React from 'react';
import { cn } from '../../utils/cn';

const Select = React.forwardRef(
  ({ className, error, disabled, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-4 py-2 text-base font-medium placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-mahogany-700 focus:ring-offset-0 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 appearance-none cursor-pointer',
          error && 'border-red-500 focus:ring-red-500',
          disabled && 'bg-neutral-100',
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);

Select.displayName = 'Select';

export default Select;
