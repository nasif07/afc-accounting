import { Hourglass, FileText, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * The KPI row above the approval lists: one lead callout plus three stat tiles.
 *
 * Tiles rather than a chart, deliberately. These are four headline counts with
 * no trend and no comparison between them — a bar chart of "1, 0, 0" would add
 * a pair of axes and a legend to communicate three numbers that fit on one
 * line, and would invite reading pending-vs-rejected as a magnitude comparison
 * when they are unrelated states.
 *
 * Every tile pairs its status colour with an icon AND a label. The colours here
 * are the app's reserved status semaphore (amber pending, emerald approved, red
 * rejected), and amber in particular sits below 3:1 on white — so the colour is
 * never the only thing carrying the meaning.
 */

// Values use the font's default proportional figures, NOT tabular-nums:
// tabular gives every digit the width of a zero, which makes a short number
// like "1" look adrift at this size. Tabular figures are for columns that must
// align vertically, which these are not.
const TILES = [
  {
    key: "pending",
    label: "Pending Requests",
    caption: "Awaiting your review",
    icon: FileText,
    iconClass: "bg-brand-navy-light text-brand-navy",
  },
  {
    key: "approvedToday",
    label: "Approved Today",
    caption: "Requests approved",
    icon: CheckCircle2,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
  {
    key: "rejected",
    label: "Rejected",
    caption: "Requests rejected",
    icon: XCircle,
    iconClass: "bg-red-50 text-red-600",
  },
];

function StatTile({ tile, value, loading }) {
  const Icon = tile.icon;

  return (
    // Two tiles share a phone row, which leaves roughly 140px of content per
    // tile — not enough for the icon and the text side by side, so the icon
    // moves above the label until sm. The label wraps rather than truncating
    // at that width too: "Pending Requests" cut to "Pending Requ..." would
    // lose the word that separates it from the tile beside it.
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3.5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10",
          tile.iconClass,
        )}>
        <Icon size={18} aria-hidden="true" />
      </span>

      <div className="min-w-0">
        <p className="text-xs font-medium leading-snug text-slate-500 sm:truncate">
          {tile.label}
        </p>
        <p className="text-xl font-bold leading-tight text-slate-900">
          {loading ? (
            <span className="inline-block h-5 w-6 animate-pulse rounded bg-slate-100 align-middle" />
          ) : (
            (value ?? 0).toLocaleString()
          )}
        </p>
        <p className="text-[11px] leading-snug text-slate-400 sm:truncate">{tile.caption}</p>
      </div>
    </div>
  );
}

export default function ApprovalStats({ stats, loading = false, leadLabel = "your approval" }) {
  const pending = stats?.pending ?? 0;

  return (
    // Two across on a phone, all four in a row on lg. Two is what makes a set
    // of four fill both phone rows exactly — one column pushed the last tile
    // most of a screen below the first and wasted width the tiles do not
    // need, and three would leave an orphan on the second row.
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* ── Lead callout ── */}
      {/* The one sentence a director opens this page to read, so it leads the
          row and carries a left accent the plain tiles do not. */}
      <div
        className={cn(
          "flex flex-col gap-2 rounded-xl border border-l-4 px-3 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3.5",
          pending > 0
            ? "border-slate-200 border-l-red-500 bg-red-50/40"
            : "border-slate-200 border-l-emerald-500 bg-emerald-50/40",
        )}>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10",
            pending > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600",
          )}>
          {pending > 0 ? (
            <Hourglass size={18} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={18} aria-hidden="true" />
          )}
        </span>

        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight text-slate-900">
            {loading
              ? "Loading…"
              : pending === 0
                ? "Nothing awaiting review"
                : `${pending.toLocaleString()} request${pending === 1 ? "" : "s"} awaiting ${leadLabel}`}
          </p>
          <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">
            {pending > 0
              ? "Review and take action to keep things moving."
              : "Every request has been actioned."}
          </p>
        </div>
      </div>

      {/* ── Tiles ── */}
      {TILES.map((tile) => (
        <StatTile
          key={tile.key}
          tile={tile}
          value={stats?.[tile.key]}
          loading={loading}
        />
      ))}
    </div>
  );
}
