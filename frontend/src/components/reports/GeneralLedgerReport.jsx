import React from 'react';
import { formatCurrency } from '../../utils/currency';

const GeneralLedgerReport = ({ data, startDate, endDate }) => {
  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b-2 border-gray-900">
        <h2 className="text-2xl font-bold text-gray-900">General Ledger</h2>
        <p className="text-lg font-semibold text-gray-700 mt-2">{data.accountName} ({data.accountCode})</p>
        {startDate && endDate && (
          <p className="text-sm text-gray-600 mt-2">
            For the period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Opening Balance */}
      <div className="flex justify-between py-3 px-4 bg-gray-100 rounded font-semibold">
        <span className="text-gray-900">Opening Balance</span>
        <span className="text-gray-900">{formatCurrency(data.openingBalance || 0)}</span>
      </div>

      {/* Transactions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Transactions</h3>
        
        {data.transactions && data.transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Voucher</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Debit</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Credit</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-900">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((txn, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700">{new Date(txn.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gray-700 font-medium">{txn.voucherNumber}</td>
                    <td className="py-3 px-4 text-gray-700">{txn.description}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {txn.debit > 0 ? formatCurrency(txn.debit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {txn.credit > 0 ? formatCurrency(txn.credit) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-blue-600">
                      {formatCurrency(txn.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No transactions recorded in this period.</p>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex justify-between py-3 px-4 bg-green-50 rounded-lg border border-green-200">
          <span className="font-semibold text-gray-900">Total Debits</span>
          <span className="font-bold text-green-600">{formatCurrency(data.totalDebit || 0)}</span>
        </div>
        <div className="flex justify-between py-3 px-4 bg-red-50 rounded-lg border border-red-200">
          <span className="font-semibold text-gray-900">Total Credits</span>
          <span className="font-bold text-red-600">{formatCurrency(data.totalCredit || 0)}</span>
        </div>
        <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border-2 border-blue-600">
          <span className="font-semibold text-gray-900">Closing Balance</span>
          <span className="font-bold text-blue-600">{formatCurrency(data.closingBalance || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default GeneralLedgerReport;
