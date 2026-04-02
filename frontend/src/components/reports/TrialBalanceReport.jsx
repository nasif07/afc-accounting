import React from 'react';
import { formatCurrency } from '../../utils/currency';

const TrialBalanceReport = ({ data, asOfDate }) => {
  if (!data || !data.balances) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b-2 border-gray-900">
        <h2 className="text-2xl font-bold text-gray-900">Trial Balance</h2>
        {asOfDate && <p className="text-sm text-gray-600 mt-2">As of {new Date(asOfDate).toLocaleDateString()}</p>}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Account Code</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-900">Account Name</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Debit</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-900">Credit</th>
            </tr>
          </thead>
          <tbody>
            {data.balances.map((balance, idx) => (
              <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-700">{balance.accountCode}</td>
                <td className="py-3 px-4 text-gray-700">{balance.accountName}</td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  {balance.debit > 0 ? formatCurrency(balance.debit) : '-'}
                </td>
                <td className="py-3 px-4 text-right font-medium text-gray-900">
                  {balance.credit > 0 ? formatCurrency(balance.credit) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-900">
              <td colSpan="2" className="py-3 px-4 font-bold text-gray-900">Total</td>
              <td className="py-3 px-4 text-right font-bold text-gray-900">
                {formatCurrency(data.totalDebits)}
              </td>
              <td className="py-3 px-4 text-right font-bold text-gray-900">
                {formatCurrency(data.totalCredits)}
              </td>
            </tr>
            <tr className={data.isBalanced ? 'bg-green-50' : 'bg-red-50'}>
              <td colSpan="4" className={`py-3 px-4 text-center font-semibold ${data.isBalanced ? 'text-green-700' : 'text-red-700'}`}>
                {data.isBalanced ? '✓ Trial Balance is Balanced' : '✗ Trial Balance is NOT Balanced'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default TrialBalanceReport;
