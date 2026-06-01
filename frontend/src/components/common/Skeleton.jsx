import { cn } from "../../utils/cn";

// Basic skeleton bar(s)
export default function Skeleton({ count = 1, height = "h-4", className = "" }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("animate-pulse rounded-md bg-neutral-200", height, className)}
          style={{ marginBottom: i < count - 1 ? "0.5rem" : 0 }}
        />
      ))}
    </>
  );
}

// Card-shaped skeleton (migrated from ui/Skeleton)
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5 md:p-6 space-y-4">
      <div className="h-6 w-1/3 animate-pulse rounded-md bg-neutral-200" />
      <div className="space-y-2">
        <div className="h-4 w-full animate-pulse rounded-md bg-neutral-200" />
        <div className="h-4 w-5/6 animate-pulse rounded-md bg-neutral-200" />
      </div>
    </div>
  );
}
