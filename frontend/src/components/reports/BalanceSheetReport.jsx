import React from 'react';
import { formatCurrency } from '../../utils/currency';

const BalanceSheetReport = ({ data, asOfDate }) => {
  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available for the selected period.
      </div>
    );
  }

  const totalLiabilitiesEquity = (data.totalLiabilities || 0) + (data.totalEquity || 0);
  const isBalanced = Math.abs((data.totalAssets || 0) - totalLiabilitiesEquity) < 1;

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b-2 border-gray-900">
        <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
        {asOfDate && <p className="text-sm text-gray-600 mt-2">As of {new Date(asOfDate).toLocaleDateString()}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assets */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Assets</h3>
          <div className="space-y-2 mb-4">
            {data.assets && data.assets.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50">
                <span className="text-gray-700">{item.accountName}</span>
                <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border-2 border-blue-600">
            <span className="font-bold text-gray-900">Total Assets</span>
            <span className="font-bold text-blue-600">{formatCurrency(data.totalAssets || 0)}</span>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Liabilities & Equity</h3>
          
          {/* Liabilities */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">Liabilities</h4>
            <div className="space-y-1 mb-2">
              {data.liabilities && data.liabilities.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50 text-sm">
                  <span className="text-gray-700">{item.accountName}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between py-2 px-4 bg-gray-100 rounded text-sm">
              <span className="font-semibold text-gray-700">Total Liabilities</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.totalLiabilities || 0)}</span>
            </div>
          </div>

          {/* Equity */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">Equity</h4>
            <div className="space-y-1 mb-2">
              {data.equity && data.equity.map((item, idx) => (
                <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50 text-sm">
                  <span className="text-gray-700">{item.accountName}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between py-2 px-4 bg-gray-100 rounded text-sm">
              <span className="font-semibold text-gray-700">Total Equity</span>
              <span className="font-bold text-gray-900">{formatCurrency(data.totalEquity || 0)}</span>
            </div>
          </div>

          {/* Total Liabilities & Equity */}
          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border-2 border-blue-600">
            <span className="font-bold text-gray-900">Total Liabilities & Equity</span>
            <span className="font-bold text-blue-600">{formatCurrency(totalLiabilitiesEquity)}</span>
          </div>
        </div>
      </div>

      {/* Balance Check */}
      <div className={`py-3 px-4 rounded-lg text-center font-semibold ${isBalanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        {isBalanced ? '✓ Balance Sheet is Balanced' : '✗ Balance Sheet is NOT Balanced'}
      </div>
    </div>
  );
};

export default BalanceSheetReport;
