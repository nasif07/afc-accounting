import { useEffect, useState } from "react";
import { BookCheck, Download, Lock, Plus, Trash2 } from "lucide-react";
import { AccountCombobox, Button, Input } from "../common";
import DatePicker from "../common/DatePicker";
import { formatCurrency } from "../../utils/currency";
import { formatDisplayDate, todayISO } from "../../utils/date";

// "April 30, 2026" — matches the wording printed on the paper statement.
const longDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

const emptyLineForm = () => ({
  description: "",
  amount: "",
  date: todayISO(),
  contraAccount: "",
});

export default function BankReconciliationStatement({
  view,
  contraAccounts = [],
  onAddLine,
  onRemoveLine,
  onPostLine,
  onUpdateBalances,
  onFinalize,
  onExportPdf,
  savingLine = false,
  postingLineId = null,
  finalizing = false,
}) {
  const { reconciliation, header, sections, breakdown, variance, isReconciled } = view;
  const isFinalized = reconciliation.status === "finalized";
  const periodEndLabel = longDate(reconciliation.periodEnd);

  // Only the two "the bank moved money our books never recorded" categories
  // carry a posting config from the server; the other four are timing
  // differences that are already in the books.
  const pendingPostCount = sections
    .filter((s) => s.posting)
    .reduce(
      (count, s) => count + (reconciliation[s.type] || []).filter((l) => !l.journalEntryId).length,
      0,
    );

  const [lineForms, setLineForms] = useState({});
  const [closingBalance, setClosingBalance] = useState(reconciliation.statementClosingBalance);

  // The parent reloads the whole view after every mutation, so the local
  // draft of the closing balance has to follow the server's value back.
  useEffect(() => {
    setClosingBalance(reconciliation.statementClosingBalance);
  }, [reconciliation._id, reconciliation.statementClosingBalance]);

  const addSections = sections.filter((s) => s.group === "add");
  const deductSections = sections.filter((s) => s.group === "deduct");

  const formFor = (type) => lineForms[type] || emptyLineForm();

  const handleAddLine = async (type) => {
    const form = formFor(type);
    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0) return;
    await onAddLine(type, form);
    setLineForms((prev) => ({ ...prev, [type]: emptyLineForm() }));
  };

  const handleClosingBlur = () => {
    if (Number(closingBalance) === reconciliation.statementClosingBalance) return;
    onUpdateBalances({ statementClosingBalance: Number(closingBalance) || 0 });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Bank Reconciliation Statement
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            For the Month Ended {periodEndLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFinalized && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <Lock size={12} /> Finalized
            </span>
          )}
          <Button variant="outline" size="sm" onClick={onExportPdf}>
            <Download size={14} /> Export PDF
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto px-5 py-5">
        <div className="min-w-[640px] border border-slate-300">
          {/* Account identity, as on the printed form */}
          <div className="border-b border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-900">
            {header.accountNumber
              ? `A/C Number: ${header.accountNumber}`
              : `A/C: ${header.accountCode}`}
          </div>
          <div className="border-b border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-900">
            {header.bankName}
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[1fr_140px_140px] border-b border-slate-300 bg-[#e9eee4] text-sm font-bold text-slate-900">
            <div className="px-3 py-1.5 text-center">Particulars</div>
            <div className="border-l border-slate-300 px-3 py-1.5 text-center">Amount (BDT)</div>
            <div className="border-l border-slate-300 px-3 py-1.5 text-center">Amount (BDT)</div>
          </div>

          {/* Balance as per books */}
          <StatementRow
            label={`Balance as per AFC Statement, ${periodEndLabel}`}
            total={breakdown.bookBalance}
            bold
            alignRight
          />

          <StatementRow label="Add:" bold />

          {addSections.map((section) => (
            <SectionBlock
              key={section.type}
              section={section}
              lines={reconciliation[section.type] || []}
              sectionTotal={breakdown.totals[section.type]}
              showSectionTotal
              readOnly={isFinalized}
              form={formFor(section.type)}
              onFormChange={(next) =>
                setLineForms((prev) => ({ ...prev, [section.type]: next }))
              }
              onAdd={() => handleAddLine(section.type)}
              onRemove={(lineId) => onRemoveLine(section.type, lineId)}
              onPost={(lineId, contraAccount) =>
                onPostLine(section.type, lineId, contraAccount)
              }
              contraAccounts={contraAccounts}
              postingLineId={postingLineId}
              saving={savingLine}
            />
          ))}

          <StatementRow label="" total={breakdown.subTotal} bold ruleAboveTotal />

          <StatementRow label="Deduct:" bold />

          {deductSections.map((section, index) => (
            <SectionBlock
              key={section.type}
              section={section}
              lines={reconciliation[section.type] || []}
              sectionTotal={breakdown.totalDeduct}
              // The paper form carries one combined Deduct total, printed
              // against the last deduct section.
              showSectionTotal={index === deductSections.length - 1}
              readOnly={isFinalized}
              form={formFor(section.type)}
              onFormChange={(next) =>
                setLineForms((prev) => ({ ...prev, [section.type]: next }))
              }
              onAdd={() => handleAddLine(section.type)}
              onRemove={(lineId) => onRemoveLine(section.type, lineId)}
              onPost={(lineId, contraAccount) =>
                onPostLine(section.type, lineId, contraAccount)
              }
              contraAccounts={contraAccounts}
              postingLineId={postingLineId}
              saving={savingLine}
            />
          ))}

          <StatementRow
            label={`Balance as per Bank Statement, ${periodEndLabel}`}
            total={breakdown.computedClosingBalance}
            bold
            alignRight
            ruleAbove
          />
        </div>
      </div>

      <div className="space-y-4 px-5 pb-5">
        {/* The one figure that comes off the physical statement. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-700">
            Balance as per Bank Statement, {periodEndLabel}{" "}
            <span className="font-normal text-slate-400">(entered from the statement)</span>
          </p>
          {isFinalized ? (
            <p className="font-mono text-sm font-bold text-slate-900">
              {formatCurrency(reconciliation.statementClosingBalance)}
            </p>
          ) : (
            <Input
              type="number"
              step="0.01"
              className="max-w-40 text-right"
              value={closingBalance}
              onChange={(e) => setClosingBalance(e.target.value)}
              onBlur={handleClosingBlur}
            />
          )}
        </div>

        <div
          className={`rounded-lg px-4 py-3 text-sm font-semibold ${
            isReconciled
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {isReconciled
            ? "Reconciled — the computed balance matches the entered statement closing balance."
            : `Not reconciled — variance of ${formatCurrency(Math.abs(variance))} (${
                variance > 0 ? "computed is higher" : "computed is lower"
              }).`}
        </div>

        {!isFinalized && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            {pendingPostCount > 0 && (
              <p className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                <span className="font-semibold">
                  Finalizing will post {pendingPostCount} adjustment
                  {pendingPostCount === 1 ? "" : "s"} to the books.
                </span>{" "}
                Bank charges and unrecorded bank credits become journal entries dated on the
                line's own date. The statement above reads exactly the same either way — posting
                only puts the entries in the ledger.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                variant="default"
                onClick={() => onFinalize(false)}
                disabled={finalizing}
                title={!isReconciled ? "Resolve the variance, or use Finalize Anyway" : undefined}
              >
                {finalizing ? "Finalizing…" : "Finalize"}
              </Button>
              {!isReconciled && (
                <Button variant="outline" onClick={() => onFinalize(true)} disabled={finalizing}>
                  Finalize Anyway
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatementRow({
  label,
  detail = null,
  total = null,
  bold = false,
  alignRight = false,
  indent = false,
  ruleAbove = false,
  ruleAboveTotal = false,
  children,
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_140px_140px] text-sm ${
        ruleAbove ? "border-t border-slate-400" : ""
      }`}
    >
      <div
        className={`px-3 py-1 ${indent ? "pl-6" : ""} ${
          bold ? "font-bold text-slate-900" : "text-slate-700"
        } ${alignRight ? "text-right" : ""}`}
      >
        {label}
        {children}
      </div>
      <div
        className={`border-l border-slate-300 px-3 py-1 text-right font-mono ${
          bold ? "font-bold text-slate-900" : "text-slate-700"
        }`}
      >
        {detail === null ? "" : detail === "-" ? "-" : formatCurrency(detail)}
      </div>
      <div
        className={`border-l border-slate-300 px-3 py-1 text-right font-mono ${
          bold ? "font-bold text-slate-900" : "text-slate-700"
        } ${ruleAboveTotal ? "border-t border-slate-400" : ""}`}
      >
        {total === null ? "" : total === "-" ? "-" : formatCurrency(total)}
      </div>
    </div>
  );
}

function SectionBlock({
  section,
  lines,
  sectionTotal,
  showSectionTotal,
  readOnly,
  form,
  onFormChange,
  onAdd,
  onRemove,
  onPost,
  contraAccounts,
  postingLineId,
  saving,
}) {
  const isEmpty = lines.length === 0;
  // Set by the server on the two categories that represent money the bank
  // moved but the books never recorded — the only ones that can become a
  // journal entry. Everything else here is a timing difference already in the
  // books, so it gets no posting controls at all.
  const isPostable = Boolean(section.posting);

  return (
    <>
      <StatementRow label={section.label} bold />

      {isEmpty ? (
        <StatementRow
          label=""
          detail="-"
          total={showSectionTotal ? sectionTotal : "-"}
          indent
        />
      ) : (
        lines.map((line, index) => {
          const isLast = index === lines.length - 1;
          const isPosted = Boolean(line.journalEntryId);
          return (
            <StatementRow
              key={line._id}
              label={
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span>{line.description}</span>
                  <span className="text-xs text-slate-400">
                    ({formatDisplayDate(line.date)})
                  </span>

                  {isPosted && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                      title={
                        line.contraAccount
                          ? `Booked against ${line.contraAccount.accountCode} - ${line.contraAccount.accountName}`
                          : "Posted to the books"
                      }
                    >
                      <BookCheck size={11} />
                      {line.journalEntryId.voucherNumber || "Posted"}
                    </span>
                  )}

                  {isPostable && !isPosted && (
                    <span className="text-[11px] text-slate-500">
                      {line.contraAccount?.accountCode
                        ? `→ ${line.contraAccount.accountCode} - ${line.contraAccount.accountName}`
                        : `→ default (${section.posting.defaultAccountCode})`}
                    </span>
                  )}

                  {isPostable && !isPosted && !readOnly && (
                    <button
                      type="button"
                      onClick={() => onPost(line._id, line.contraAccount?._id)}
                      disabled={postingLineId === line._id}
                      className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-50"
                      title="Create the journal entry for this line now"
                    >
                      <BookCheck size={11} />
                      {postingLineId === line._id ? "Posting…" : "Post to books"}
                    </button>
                  )}

                  {/* A posted line is backed by a locked journal entry, so it
                      can only be undone by reversing that entry first. */}
                  {!readOnly && !isPosted && (
                    <button
                      type="button"
                      onClick={() => onRemove(line._id)}
                      className="rounded p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                      title="Remove line"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </span>
              }
              detail={line.amount}
              total={showSectionTotal && isLast ? sectionTotal : null}
              indent
            />
          );
        })
      )}

      {!readOnly && (
        <div className="grid grid-cols-[1fr_140px_140px] border-b border-slate-100">
          <div className="px-3 pb-2 pt-1">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_140px_auto] sm:items-center">
              <Input
                placeholder="Description"
                value={form.description}
                onChange={(e) => onFormChange({ ...form, description: e.target.value })}
              />
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => onFormChange({ ...form, amount: e.target.value })}
              />
              <DatePicker
                value={form.date}
                onChange={(value) => onFormChange({ ...form, date: value })}
              />
              <Button variant="outline" size="sm" onClick={onAdd} disabled={saving}>
                <Plus size={14} /> Add
              </Button>
            </div>

            {isPostable && (
              <div className="mt-2 max-w-md">
                <AccountCombobox
                  value={form.contraAccount}
                  onChange={(value) => onFormChange({ ...form, contraAccount: value })}
                  accounts={contraAccounts}
                  clearLabel="Use the default account"
                  placeholder={`Contra ${section.posting.contraLabel} account (optional)`}
                  panelTitle={`Select ${section.posting.contraLabel} account`}
                  helperText={`Leave blank to use the configured default (account ${section.posting.defaultAccountCode}).`}
                />
              </div>
            )}
          </div>
          <div className="border-l border-slate-300" />
          <div className="border-l border-slate-300" />
        </div>
      )}
    </>
  );
}
