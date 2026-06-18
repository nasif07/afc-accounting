import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import Button from "./Button";

export function ButtonLoader({ className = "" }) {
  return <Loader2 className={`h-4 w-4 animate-spin ${className}`} />;
}

export function PageLoader({ message = "Loading...", className = "" }) {
  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-slate-50 ${className}`}>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
        </div>
        <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>
      </div>
    </div>
  );
}

export function SectionSkeleton({ rows = 4, className = "" }) {
  return (
    <div className={`space-y-3 rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="h-5 w-1/3 animate-pulse rounded bg-slate-200" />
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-4 animate-pulse rounded bg-slate-100"
          style={{ width: `${92 - index * 8}%` }}
        />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="h-4 animate-pulse rounded bg-slate-200" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-3 p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="h-4 animate-pulse rounded bg-slate-100"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title = "No data found",
  description = "There is nothing to show yet.",
  action = null,
  className = "",
}) {
  return (
    <div className={`rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center ${className}`}>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message = "We could not load this data. Please try again.",
  onRetry,
  className = "",
}) {
  return (
    <div className={`rounded-xl border border-red-200 bg-red-50 p-5 ${className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">{title}</p>
            <p className="mt-1 text-sm text-red-700">{message}</p>
          </div>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} icon={RefreshCw}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
