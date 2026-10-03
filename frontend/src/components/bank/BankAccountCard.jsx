import {
  ArrowRight,
  CreditCard,
  Edit2,
  FileText,
  GripVertical,
  Landmark,
  Trash2,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import Badge from "../common/Badge";
import MaskedAmount from "../common/MaskedAmount";
import { formatCurrency } from "../../utils/currency";
import { cn } from "../../utils/cn";

const ACCOUNT_ICONS = {
  savings: Wallet,
  current: Landmark,
};

const coaLabel = (coaAccount) => {
  if (!coaAccount) return "";
  if (typeof coaAccount !== "object") return String(coaAccount);
  return `${coaAccount.accountCode || ""} ${coaAccount.accountName || ""}`.trim();
};

/**
 * Presentational bank account card. Kept free of drag-and-drop concerns so
 * the same markup renders in the grid, inside the DragOverlay, and on the
 * read-only view a sub-accountant sees.
 */
export function BankAccountCard({
  account,
  onEdit,
  onDelete,
  canManage = false,
  dragHandleRef,
  dragHandleProps,
  isDragging = false,
  isOverlay = false,
}) {
  const Icon = ACCOUNT_ICONS[account.accountType] || CreditCard;
  const linkedCoa = coaLabel(account.coaAccount);

  return (
    <div
      className={cn(
        "group flex h-full flex-col rounded-xl border border-slate-200 bg-white transition-colors",
        !isDragging && "hover:border-brand-navy-light",
        // The original stays in the grid as a placeholder while its overlay
        // copy follows the pointer — fading it is what makes the drop target
        // read as "this slot".
        isDragging && "opacity-40",
        isOverlay && "border-brand-navy shadow-xl",
      )}>
      {/* ── Identity ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 sm:p-5">
        {dragHandleProps ? (
          <button
            type="button"
            ref={dragHandleRef}
            aria-label={`Reorder ${account.bankName}`}
            // h-10 matches the icon tile so the grip lines up with it rather
            // than floating above the title. touch-none stops the browser
            // from scrolling the page when a drag starts on a touch device.
            className="-ml-1.5 flex h-10 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-100 hover:text-slate-500 focus:outline-none focus:ring-4 focus:ring-slate-100 active:cursor-grabbing"
            {...dragHandleProps}>
            <GripVertical size={16} />
          </button>
        ) : null}

        {/* Fixed 40x40 tile — inside a flex row it would otherwise stretch to
            the height of the text column beside it. */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 transition-colors group-hover:border-brand-navy-light group-hover:bg-brand-navy-light">
          <Icon size={18} className="text-brand-navy" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold leading-6 text-slate-900">
                {account.bankName}
              </h3>
              <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                {account.accountNumber}
              </p>
            </div>

            {canManage && (
              // Rendered in the drag overlay too (inert there, since a click
              // can't land mid-drag) so the card doesn't visibly reflow the
              // moment it's picked up.
              <div
                className="-mr-1.5 -mt-1 flex shrink-0 gap-0.5"
                aria-hidden={isOverlay}>
                <button
                  type="button"
                  aria-label={`Edit ${account.bankName}`}
                  onClick={() => onEdit?.(account)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-navy-light hover:text-brand-navy focus:outline-none focus:ring-4 focus:ring-slate-100">
                  <Edit2 size={15} />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${account.bankName}`}
                  onClick={() => onDelete?.(account._id)}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-4 focus:ring-red-100">
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant={account.isActive ? "navy" : "warning"} size="sm">
              {account.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="info" size="sm" className="capitalize">
              {account.accountType}
            </Badge>
            {account.branchName && (
              <span className="truncate text-xs text-slate-400">
                {account.branchName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Balance ──────────────────────────────────────────────────── */}
      <div className="mx-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:mx-5">
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Current Balance
        </p>
        {/* Hidden by default like every other balance figure in the app —
            these cards sit several to a screen, so an unmasked view would
            put every account's balance on display at once. */}
        <MaskedAmount
          className="truncate text-lg font-bold tabular-nums text-slate-900"
          label={`${account.bankName} balance`}>
          {formatCurrency(account.currentBalance || 0)}
        </MaskedAmount>
      </div>

      {account.balanceError && (
        <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 sm:mx-5">
          {account.balanceError}
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between gap-3 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
        <p className="min-w-0 truncate text-xs text-slate-400">
          {linkedCoa ? `COA ${linkedCoa}` : "No linked COA"}
        </p>

        <div className="flex shrink-0 items-center gap-3">
          {/* Deep-links to this account's cash book — the report page reads
              ?bankId= to preselect it. */}
          <Link
            to={`/dashboard/bank-cash/report?bankId=${account._id}`}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-brand-navy">
            <FileText size={14} />
            Report
          </Link>

          {/* Reconciliation lives entirely in the Bank Reconciliation page now.
              That page has no account-scoped route, so this links to its
              landing view rather than deep-linking. */}
          <Link
            to="/dashboard/bank-book/reconciliation"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-navy hover:text-brand-navy-dark">
            Reconcile
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid item wired to dnd-kit. Only the grip is a drag handle — the edit,
 * delete and reconcile controls inside the card stay clickable.
 */
export default function SortableBankAccountCard({ account, ...cardProps }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: account._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("h-full", isDragging && "z-10")}>
      <BankAccountCard
        account={account}
        isDragging={isDragging}
        dragHandleRef={setActivatorNodeRef}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...cardProps}
      />
    </div>
  );
}
