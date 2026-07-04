import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/date';

const GeneralLedgerReport = ({ data, startDate, endDate, onPageChange, isFetching }) => {
  if (!data) {
    return (
      <div className="text-center py-8 text-slate-500">
        No data available for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b-2 border-slate-900">
        <h2 className="text-2xl font-bold text-slate-900">General Ledger</h2>
        <p className="text-lg font-semibold text-slate-700 mt-2">{data.accountName} ({data.accountCode})</p>
        {startDate && endDate && (
          <p className="text-sm text-slate-600 mt-2">
            For the period: {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
          </p>
        )}
      </div>

      {/* Opening Balance */}
      <div className="flex justify-between py-3 px-4 bg-slate-100 rounded font-semibold">
        <span className="text-slate-900">Opening Balance</span>
        <span className="text-slate-900">
          {formatCurrency(data.openingBalance || 0)}{" "}
          {data.openingBalanceType === "credit" ? "Cr" : "Dr"}
        </span>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b-2 border-slate-300">Transactions</h3>
        
        {data.transactions && data.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-50">
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Voucher</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-900">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Debit</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Credit</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-900">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((txn, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-700">{formatDisplayDate(txn.date)}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{txn.voucherNumber}</td>
                    <td className="py-3 px-4 text-slate-700">{txn.description}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900">
                      {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">
                      {formatCurrency(txn.runningBalance)}{" "}
                      {txn.runningBalanceType === "credit" ? "Cr" : "Dr"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No transactions recorded in this period.</p>
        )}

        {data.pagination && data.pagination.totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-4 mt-2 sm:flex-row">
            <p className="text-sm text-slate-500">
              Showing page{" "}
              <span className="font-semibold text-slate-700">{data.pagination.page}</span> of{" "}
              <span className="font-semibold text-slate-700">{data.pagination.totalPages}</span>
              {" • "}Total{" "}
              <span className="font-semibold text-slate-700">{data.pagination.total}</span>{" "}
              transactions
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange?.(Math.max(1, data.pagination.page - 1))}
                disabled={data.pagination.page <= 1 || isFetching}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <ChevronLeft size={16} />
                Prev
              </button>
              <div className="px-3 py-2 text-sm font-semibold text-slate-700">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </div>
              <button
                type="button"
                onClick={() => onPageChange?.(Math.min(data.pagination.totalPages, data.pagination.page + 1))}
                disabled={data.pagination.page >= data.pagination.totalPages || isFetching}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex justify-between py-3 px-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <span className="font-semibold text-slate-900">Total Debits</span>
          <span className="font-bold text-emerald-600">{formatCurrency(data.totalDebit || 0)}</span>
        </div>
        <div className="flex justify-between py-3 px-4 bg-red-50 rounded-lg border border-red-200">
          <span className="font-semibold text-slate-900">Total Credits</span>
          <span className="font-bold text-red-600">{formatCurrency(data.totalCredit || 0)}</span>
        </div>
        <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border-2 border-blue-600">
          <span className="font-semibold text-slate-900">Closing Balance</span>
          <span className="font-bold text-blue-600">
            {formatCurrency(data.closingBalance || 0)}{" "}
            {data.closingBalanceType === "credit" ? "Cr" : "Dr"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeneralLedgerReport;
