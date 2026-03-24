import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-mahogany-700 text-white hover:bg-mahogany-800 focus:ring-mahogany-700',
        secondary: 'bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200 focus:ring-neutral-400',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
        success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-600',
        warning: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-600',
        info: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600',
        outline: 'border border-neutral-300 text-neutral-900 hover:bg-neutral-50 focus:ring-neutral-400',
        ghost: 'text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-400',
        link: 'text-mahogany-700 underline hover:text-mahogany-800 focus:ring-mahogany-700',
      },
      size: {
        xs: 'px-3 py-1.5 text-xs',
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-base',
        lg: 'px-6 py-3 text-lg',
        xl: 'px-8 py-4 text-xl',
        icon: 'p-2',
        'icon-sm': 'p-1.5',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, fullWidth, isLoading, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
