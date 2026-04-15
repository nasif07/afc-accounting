import { useState, useEffect } from "react";
import { X, Loader2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { coaAPI } from "../../services/apiMethods";
import { toast } from "sonner";
import Button from "../common/Button";

const AccountDetailsModal = ({ account, isOpen, onClose }) => {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && account) {
      fetchAccountDetails();
    }
  }, [isOpen, account]);

  const fetchAccountDetails = async () => {
    setIsLoading(true);
    try {
      const balanceResponse = await coaAPI.getBalance(account._id);
      setBalance(balanceResponse.data.data?.balance || 0);

      const transactionsResponse = await coaAPI.getTransactions(account._id, {
        limit: 20,
        offset: 0,
      });
      setTransactions(transactionsResponse.data.data || []);
    } catch (error) {
      toast.error("Failed to load account details");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !account) return null;

  const isDebitNormal = ["asset", "expense"].includes(
    String(account.accountType || "").toLowerCase(),
  );

  const balanceAmount = balance || 0;
  const isPositive =
    (isDebitNormal && balanceAmount > 0) ||
    (!isDebitNormal && balanceAmount < 0);

const formatCurrency = (amount) => {
  return `৳ ${Number(amount || 0).toLocaleString("en-BD")}`;
};

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusDot = (status) => {
    if (status === "active") return "bg-green-500";
    if (status === "inactive") return "bg-amber-500";
    return "bg-slate-400";
  };

  const getTxnStatusClass = (status) => {
    if (status === "posted") return "bg-green-100 text-green-700";
    if (status === "draft") return "bg-slate-100 text-slate-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center  bg-slate-900/40 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              Account Details
            </h2>
            <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
              {account.accountCode} - {account.accountName}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="ml-3 shrink-0 border-slate-200 px-2 py-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-52 items-center justify-center sm:h-64">
              <Loader2 size={30} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Account Code
                  </p>
                  <p className="text-base font-bold text-slate-900 sm:text-lg">
                    {account.accountCode}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Account Type
                  </p>
                  <p className="text-base font-semibold capitalize text-slate-900 sm:text-lg">
                    {String(account.accountType || "").toLowerCase()}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${getStatusDot(account.status)}`}
                    />
                    <p className="text-base font-semibold capitalize text-slate-900 sm:text-lg">
                      {account.status}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Normal Balance
                  </p>
                  <p className="text-base font-semibold capitalize text-slate-900 sm:text-lg">
                    {isDebitNormal ? "Debit" : "Credit"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-4 sm:p-5">
                <div className="mb-2 flex items-center gap-2">
                  ৳
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Current Balance
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={`text-2xl font-bold sm:text-3xl ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}>
                    {isPositive ? "+" : "-"} {formatCurrency(balanceAmount)}
                  </p>

                  {isPositive ? (
                    <TrendingUp size={18} className="text-green-600" />
                  ) : (
                    <TrendingDown size={18} className="text-red-600" />
                  )}
                </div>
              </div>

              {account.description && (
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {account.description}
                  </div>
                </div>
              )}

              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                    Recent Transactions
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {transactions.length}
                  </span>
                </div>

                {transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.map((txn, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm font-bold text-slate-900">
                              {txn.voucherNumber}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDate(txn.voucherDate)}
                            </p>
                          </div>

                          <span
                            className={`inline-flex w-fit rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${getTxnStatusClass(txn.status)}`}>
                            {txn.status}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                          {txn.description || "No description"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {txn.bookEntries?.map((entry, entryIdx) => (
                            <div
                              key={entryIdx}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
                              {entry.debit > 0 && (
                                <p className="font-semibold text-blue-600">
                                  Dr: {formatCurrency(entry.debit)}
                                </p>
                              )}
                              {entry.credit > 0 && (
                                <p className="font-semibold text-red-600">
                                  Cr: {formatCurrency(entry.credit)}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm text-slate-500">
                      No transactions found for this account
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-300 text-slate-700 hover:bg-slate-50">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailsModal;
