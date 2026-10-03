import { useEffect, useMemo, useState } from "react";
import { Landmark, Plus } from "lucide-react";
import { toast } from "sonner";
import { bankReconciliationAPI, coaAPI } from "../services/apiMethods";
import SectionHeader from "../components/common/SectionHeader";
import { AccountCombobox, Button, Input, Modal } from "../components/common";
import DatePicker from "../components/common/DatePicker";
import { SectionSkeleton } from "../components/common/Loaders";
import BankReconciliationStatement from "../components/bankBook/BankReconciliationStatement";
import { formatCurrency } from "../utils/currency";
import { formatDisplayDate, todayISO, firstDayOfCurrentMonth } from "../utils/date";
import { getErrorMessage } from "../utils/errors";

const initialCreateForm = () => ({
  periodStart: firstDayOfCurrentMonth(),
  periodEnd: todayISO(),
  statementClosingBalance: "",
});

export default function BankReconciliation() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [periods, setPeriods] = useState([]);
  const [periodsLoading, setPeriodsLoading] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [view, setView] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm());
  const [creating, setCreating] = useState(false);
  const [savingLine, setSavingLine] = useState(false);
  const [postingLineId, setPostingLineId] = useState(null);
  const [finalizing, setFinalizing] = useState(false);

  // Bank head accounts — same "leaf account under 1002 - Bank Accounts"
  // filter BankBook.jsx already uses, since this feature reuses
  // bankBook.service.js's account-identity convention (a ChartOfAccounts
  // _id), not the separate Bank model.
  const bankHeadAccounts = useMemo(() => {
    const parentIds = new Set(
      accounts
        .map((a) => (typeof a.parentAccount === "object" ? a.parentAccount?._id : a.parentAccount))
        .filter(Boolean)
        .map(String),
    );
    return accounts
      .filter((a) => {
        const parentCode = typeof a.parentAccount === "object" ? a.parentAccount?.accountCode : "";
        return parentCode === "1002" && !parentIds.has(String(a._id)) && a.status === "active";
      });
  }, [accounts]);

  // The other side of an auto-posted adjustment: usually an expense account
  // for a bank charge and an income account for an unrecorded bank credit,
  // but not always — a credit can just as well be a receivable settling. So
  // this offers every active leaf except the bank accounts themselves, since
  // bank-to-bank is never what this statement is describing. Leaving the
  // field blank falls back to the server-side default.
  const contraAccounts = useMemo(() => {
    const parentIds = new Set(
      accounts
        .map((a) => (typeof a.parentAccount === "object" ? a.parentAccount?._id : a.parentAccount))
        .filter(Boolean)
        .map(String),
    );
    const bankHeadIds = new Set(bankHeadAccounts.map((a) => String(a._id)));

    return accounts.filter(
      (a) =>
        a.status === "active" &&
        !parentIds.has(String(a._id)) &&
        !bankHeadIds.has(String(a._id)),
    );
  }, [accounts, bankHeadAccounts]);

  useEffect(() => {
    (async () => {
      try {
        const res = await coaAPI.getAll();
        setAccounts(res?.data?.data || []);
      } catch (error) {
        toast.error(getErrorMessage(error, "Failed to load chart of accounts"));
      }
    })();
  }, []);

  const loadPeriods = async (bankAccountId) => {
    if (!bankAccountId) {
      setPeriods([]);
      return;
    }
    setPeriodsLoading(true);
    try {
      const res = await bankReconciliationAPI.getAll({ bankAccount: bankAccountId, limit: 50 });
      const rows = res?.data?.data?.data || [];
      setPeriods(rows);
      if (rows.length > 0 && !rows.some((r) => r._id === selectedPeriodId)) {
        setSelectedPeriodId(rows[0]._id);
      } else if (rows.length === 0) {
        setSelectedPeriodId(null);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load reconciliation periods"));
      setPeriods([]);
    } finally {
      setPeriodsLoading(false);
    }
  };

  useEffect(() => {
    setSelectedPeriodId(null);
    setView(null);
    loadPeriods(selectedAccount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount]);

  const loadView = async (id) => {
    if (!id) {
      setView(null);
      return;
    }
    setViewLoading(true);
    try {
      const res = await bankReconciliationAPI.getById(id);
      setView(res?.data?.data || null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load reconciliation"));
      setView(null);
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => {
    loadView(selectedPeriodId);
  }, [selectedPeriodId]);

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (!selectedAccount) {
      toast.error("Select a bank account first");
      return;
    }
    setCreating(true);
    try {
      const res = await bankReconciliationAPI.create({
        bankAccount: selectedAccount,
        periodStart: createForm.periodStart,
        periodEnd: createForm.periodEnd,
        ...(createForm.statementClosingBalance !== ""
          ? { statementClosingBalance: Number(createForm.statementClosingBalance) }
          : {}),
      });
      toast.success("Reconciliation period created");
      setShowCreateModal(false);
      setCreateForm(initialCreateForm());
      await loadPeriods(selectedAccount);
      setSelectedPeriodId(res?.data?.data?._id || null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create reconciliation period"));
    } finally {
      setCreating(false);
    }
  };

  const handleAddLine = async (type, line) => {
    setSavingLine(true);
    try {
      // contraAccount is only present on the two postable sections, and only
      // when the preparer overrode the default — an empty string would fail
      // the server's ObjectId check.
      const { contraAccount, ...rest } = line;
      const payload = contraAccount ? { ...rest, contraAccount } : rest;

      await bankReconciliationAPI.addAdjustmentLine(selectedPeriodId, type, payload);
      await loadView(selectedPeriodId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to add adjustment line"));
    } finally {
      setSavingLine(false);
    }
  };

  const handleRemoveLine = async (type, lineId) => {
    try {
      await bankReconciliationAPI.removeAdjustmentLine(selectedPeriodId, type, lineId);
      await loadView(selectedPeriodId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to remove adjustment line"));
    }
  };

  const handlePostLine = async (type, lineId, contraAccount) => {
    setPostingLineId(lineId);
    try {
      await bankReconciliationAPI.postAdjustmentLine(
        selectedPeriodId,
        type,
        lineId,
        contraAccount,
      );
      toast.success("Adjustment posted to the books");
      await loadView(selectedPeriodId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to post adjustment line"));
    } finally {
      setPostingLineId(null);
    }
  };

  const handleUpdateBalances = async (balances) => {
    try {
      await bankReconciliationAPI.updateBalances(selectedPeriodId, balances);
      await loadView(selectedPeriodId);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update balances"));
    }
  };

  const handleFinalize = async (force) => {
    setFinalizing(true);
    try {
      const res = await bankReconciliationAPI.finalize(selectedPeriodId, force);
      const posted = res?.data?.data?.posted || [];
      toast.success(
        posted.length > 0
          ? `Reconciliation finalized — ${posted.length} adjustment${
              posted.length === 1 ? "" : "s"
            } posted to the books (${posted.map((p) => p.voucherNumber).join(", ")})`
          : "Reconciliation finalized",
      );
      await loadView(selectedPeriodId);
      await loadPeriods(selectedAccount);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to finalize reconciliation"));
    } finally {
      setFinalizing(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const res = await bankReconciliationAPI.exportPdf(selectedPeriodId);
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `bank-reconciliation-${selectedPeriodId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to export PDF"));
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Landmark}
        title="Bank Reconciliation"
        description="Reconcile books against the bank statement, period by period."
        buttonText="New Period"
        onButtonClick={() => setShowCreateModal(true)}
        buttonIcon={Plus}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AccountCombobox
            label="Bank Account"
            value={selectedAccount}
            onChange={setSelectedAccount}
            accounts={bankHeadAccounts}
            placeholder="Select a bank account"
            panelTitle="Select Bank Account"
          />
        </div>
      </div>

      {selectedAccount && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Reconciliation Periods</p>
          </div>
          {periodsLoading ? (
            <SectionSkeleton rows={3} />
          ) : periods.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">
              No reconciliation periods yet for this account. Click "New Period" to start one.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {periods.map((period) => (
                <li key={period._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedPeriodId(period._id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition ${
                      selectedPeriodId === period._id ? "bg-slate-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-medium text-slate-700">
                      {formatDisplayDate(period.periodStart)} – {formatDisplayDate(period.periodEnd)}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-slate-600">
                        {formatCurrency(period.statementClosingBalance)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          period.status === "finalized"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {period.status === "finalized" ? "Finalized" : "Draft"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {viewLoading && <SectionSkeleton rows={6} />}

      {!viewLoading && view && (
        <BankReconciliationStatement
          view={view}
          contraAccounts={contraAccounts}
          onAddLine={handleAddLine}
          onRemoveLine={handleRemoveLine}
          onPostLine={handlePostLine}
          onUpdateBalances={handleUpdateBalances}
          onFinalize={handleFinalize}
          onExportPdf={handleExportPdf}
          savingLine={savingLine}
          postingLineId={postingLineId}
          finalizing={finalizing}
        />
      )}

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Reconciliation Period"
        description="Enter the period this statement covers and the closing balance printed on it."
        size="md"
      >
        <form onSubmit={handleCreatePeriod} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DatePicker
              label="Period Start"
              value={createForm.periodStart}
              onChange={(value) => setCreateForm((prev) => ({ ...prev, periodStart: value }))}
              required
            />
            <DatePicker
              label="Period End"
              value={createForm.periodEnd}
              onChange={(value) => setCreateForm((prev) => ({ ...prev, periodEnd: value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Balance as per Bank Statement (closing)"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={createForm.statementClosingBalance}
              onChange={(e) =>
                setCreateForm((prev) => ({ ...prev, statementClosingBalance: e.target.value }))
              }
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create Period"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
