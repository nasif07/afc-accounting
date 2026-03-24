import React from 'react';
import { cn } from '../../utils/cn';

const FormField = React.forwardRef(
  (
    {
      label,
      error,
      hint,
      required = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {label && (
          <label className="block text-sm font-semibold text-neutral-900">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
        )}
        {children}
        {error && (
          <p className="text-xs text-red-600 font-medium">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-neutral-600">{hint}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';

export default FormField;
