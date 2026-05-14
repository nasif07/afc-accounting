import React from 'react';
import { formatCurrency } from '../../utils/currency';

const PettyCashReport = React.forwardRef(({ data = {}, loading = false }, ref) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-center text-neutral-600">Loading report...</p>
        </div>
      </div>
    );
  }

  const { reportData = [], summary = {}, dateRange = {} } = data;

  return (
    <div ref={ref} className="space-y-6 bg-white p-8">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Alliance Française de Chittagong</h1>
        <h2 className="mt-2 text-xl font-semibold text-gray-900">Petty Cash Account</h2>
        <p className="mt-2 text-gray-700">
          For the Month of <span className="font-semibold">{dateRange.monthYear || 'N/A'}</span>
        </p>
      </div>

      {/* Report Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-900">
          <thead>
            <tr className="bg-green-100">
              <th className="border border-gray-900 px-3 py-2 text-left text-xs font-semibold text-gray-900">Date</th>
              <th className="border border-gray-900 px-3 py-2 text-left text-xs font-semibold text-gray-900">Expenditures</th>
              <th className="border border-gray-900 px-3 py-2 text-left text-xs font-semibold text-gray-900">Cash Received & Paid from</th>
              <th className="border border-gray-900 px-3 py-2 text-center text-xs font-semibold text-gray-900">Cash Received (BDT)</th>
              <th className="border border-gray-900 px-3 py-2 text-center text-xs font-semibold text-gray-900">Cash Payment (BDT)</th>
              <th className="border border-gray-900 px-3 py-2 text-center text-xs font-semibold text-gray-900">Balance (BDT)</th>
              <th className="border border-gray-900 px-3 py-2 text-left text-xs font-semibold text-gray-900">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Row */}
            <tr className="bg-yellow-50">
              <td className="border border-gray-900 px-3 py-2 text-xs text-gray-900">DD/MM/YYYY</td>
              <td className="border border-gray-900 px-3 py-2 text-xs font-medium text-gray-900">Cash in Hand</td>
              <td className="border border-gray-900 px-3 py-2 text-xs text-gray-700">Accounts</td>
              <td className="border border-gray-900 px-3 py-2 text-center text-xs text-gray-700">-</td>
              <td className="border border-gray-900 px-3 py-2 text-center text-xs text-gray-700">-</td>
              <td className="border border-gray-900 px-3 py-2 text-center text-xs font-semibold text-gray-900 bg-yellow-100">Balance B/D</td>
              <td className="border border-gray-900 px-3 py-2 text-xs text-gray-700">-</td>
            </tr>

            {/* Data Rows */}
            {reportData.length > 0 ? (
              reportData.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-900 px-3 py-2 text-xs text-gray-900">{row.date}</td>
                  <td className="border border-gray-900 px-3 py-2 text-xs text-gray-700">{row.expenditures}</td>
                  <td className="border border-gray-900 px-3 py-2 text-xs text-gray-700">{row.cashReceivedPaidFrom}</td>
                  <td className="border border-gray-900 px-3 py-2 text-center text-xs text-gray-900">
                    {row.cashReceived > 0 ? row.cashReceived.toLocaleString() : '-'}
                  </td>
                  <td className="border border-gray-900 px-3 py-2 text-center text-xs text-gray-900">
                    {row.cashPayment > 0 ? row.cashPayment.toLocaleString() : '-'}
                  </td>
                  <td className="border border-gray-900 px-3 py-2 text-center text-xs font-medium text-gray-900">
                    {row.balance.toLocaleString()}
                  </td>
                  <td className="border border-gray-900 px-3 py-2 text-xs text-gray-700">{row.remarks}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="border border-gray-900 px-3 py-3 text-center text-xs text-gray-600">
                  No records found for this period
                </td>
              </tr>
            )}

            {/* Total Row */}
            {reportData.length > 0 && (
              <tr className="bg-gray-100 font-semibold">
                <td colSpan="3" className="border border-gray-900 px-3 py-2 text-xs text-gray-900">
                  TOTAL
                </td>
                <td className="border border-gray-900 px-3 py-2 text-center text-xs text-gray-900">
                  {summary.totalCashReceived?.toLocaleString() || 0}
                </td>
                <td className="border border-gray-900 px-3 py-2 text-center text-xs text-gray-900">
                  {summary.totalCashPayment?.toLocaleString() || 0}
                </td>
                <td className="border border-gray-900 px-3 py-2 text-center text-xs text-gray-900">
                  {summary.closingBalance?.toLocaleString() || 0}
                </td>
                <td className="border border-gray-900 px-3 py-2 text-xs text-gray-700">-</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Info */}
      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Opening Balance:</span>
          <span className="font-medium text-gray-900">BDT {(reportData.length > 0 ? reportData[0].balance : 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Cash Received:</span>
          <span className="font-medium text-green-600">BDT {summary.totalCashReceived?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Cash Payment:</span>
          <span className="font-medium text-red-600">BDT {summary.totalCashPayment?.toLocaleString() || 0}</span>
        </div>
        <div className="border-t border-gray-300 pt-2 flex justify-between text-sm font-semibold">
          <span className="text-gray-900">Closing Balance:</span>
          <span className="text-gray-900 text-lg">BDT {summary.closingBalance?.toLocaleString() || 0}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-600">
        Generated on: {new Date().toLocaleString()}
      </div>
    </div>
  );
});

PettyCashReport.displayName = 'PettyCashReport';

export default PettyCashReport;

