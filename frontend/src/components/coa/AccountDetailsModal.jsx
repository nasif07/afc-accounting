import { useState, useEffect } from "react";
import { X, Loader2, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { coaAPI } from "../../services/apiMethods";
import { toast } from "sonner";

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
      // Fetch balance
      const balanceResponse = await coaAPI.getBalance(account._id);
      setBalance(balanceResponse.data.data?.balance || 0);

      // Fetch transactions
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
    String(account.accountType || "").toLowerCase()
  );
  const balanceAmount = balance || 0;
  const isPositive = (isDebitNormal && balanceAmount > 0) || (!isDebitNormal && balanceAmount < 0);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Account Details</h2>
            <p className="text-sm text-slate-500 mt-1">
              {account.accountCode} - {account.accountName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={32} className="text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Account Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Account Code
                  </p>
                  <p className="text-lg font-mono font-bold text-slate-900">
                    {account.accountCode}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Account Type
                  </p>
                  <p className="text-lg font-bold text-slate-900 capitalize">
                    {String(account.accountType || "").toLowerCase()}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        account.status === "active"
                          ? "bg-green-500"
                          : account.status === "inactive"
                            ? "bg-amber-500"
                            : "bg-slate-400"
                      }`}
                    />
                    <p className="text-lg font-bold text-slate-900 capitalize">
                      {account.status}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Normal Balance
                  </p>
                  <p className="text-lg font-bold text-slate-900 capitalize">
                    {isDebitNormal ? "Debit" : "Credit"}
                  </p>
                </div>
              </div>

              {/* Balance Section */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-6 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={18} className="text-slate-600" />
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Current Balance
                  </p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p
                    className={`text-3xl font-bold ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {isPositive ? "+" : "-"} {formatCurrency(balanceAmount)}
                  </p>
                  {isPositive ? (
                    <TrendingUp size={20} className="text-green-600" />
                  ) : (
                    <TrendingDown size={20} className="text-red-600" />
                  )}
                </div>
              </div>

              {/* Description */}
              {account.description && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Description
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-200">
                    {account.description}
                  </p>
                </div>
              )}

              {/* Recent Transactions */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                  Recent Transactions ({transactions.length})
                </h3>
                {transactions.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transactions.map((txn, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-3 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-mono text-sm font-bold text-slate-900">
                            {txn.voucherNumber}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDate(txn.voucherDate)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-600">
                            {txn.description || "No description"}
                          </p>
                          <div className="flex gap-2">
                            {txn.bookEntries?.map((entry, entryIdx) => (
                              <div key={entryIdx} className="text-right">
                                {entry.debit > 0 && (
                                  <p className="text-xs font-bold text-blue-600">
                                    Dr: {formatCurrency(entry.debit)}
                                  </p>
                                )}
                                {entry.credit > 0 && (
                                  <p className="text-xs font-bold text-red-600">
                                    Cr: {formatCurrency(entry.credit)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${
                              txn.status === "posted"
                                ? "bg-green-100 text-green-700"
                                : txn.status === "draft"
                                  ? "bg-slate-100 text-slate-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {txn.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded border border-slate-200 text-center">
                    <p className="text-sm text-slate-500">
                      No transactions found for this account
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountDetailsModal;
