import React from "react";
import { cn } from "../../utils/cn";

// ─── Compound card primitives (replaces ui/Card) ────────────────────────────
// Used via named imports: import { Card, CardHeader, CardContent } from '...common/Card'

export const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-slate-200 bg-white text-slate-950 transition-all",
      className,
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-4 sm:p-5 md:p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-base font-semibold leading-none tracking-tight sm:text-lg",
      className,
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-slate-500 sm:text-sm", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-4 pt-0 sm:p-5 sm:pt-0 md:p-6", className)}
    {...props}
  />
));
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-4 pt-0 sm:p-5 sm:pt-0 md:p-6 md:pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// ─── Simple card (default export) ──────────────────────────────────────────
// Used via default import: import SimpleCard from '...common/Card'
// Accepts title/subtitle/headerAction/footer props for quick layout cards.

export default function SimpleCard({
  children,
  title,
  subtitle,
  className = "",
  headerAction = null,
  footer = null,
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-start justify-between gap-3 p-4 sm:p-5 lg:p-6 border-b border-slate-200">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{subtitle}</p>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className="p-4 sm:p-5 lg:p-6">{children}</div>

      {footer && (
        <div className="px-4 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-4 border-t border-slate-200 bg-slate-50">
          {footer}
        </div>
      )}
    </div>
  );
}
