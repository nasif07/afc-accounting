import React from "react";
import { cn } from "../../utils/cn";

// Wrapper that adds a label, error message, and hint text around any form control.
// Migrated from ui/FormField — API is identical.

const FormField = React.forwardRef(
  ({ label, error, hint, required = false, children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
        {label && (
          <label className="block text-sm font-medium text-slate-700">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        {children}
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export default FormField;
