import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-900',
        primary: 'bg-mahogany-100 text-mahogany-900',
        secondary: 'bg-blue-100 text-blue-900',
        success: 'bg-green-100 text-green-900',
        warning: 'bg-amber-100 text-amber-900',
        danger: 'bg-red-100 text-red-900',
        info: 'bg-cyan-100 text-cyan-900',
        outline: 'border border-neutral-300 text-neutral-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Badge = React.forwardRef(({ className, variant, ...props }, ref) => (
  <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />
));

Badge.displayName = 'Badge';

export default Badge;
