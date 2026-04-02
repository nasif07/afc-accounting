import React from 'react';
import { formatCurrency } from '../../utils/currency';

const CashFlowReport = ({ data, startDate, endDate }) => {
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
        <h2 className="text-2xl font-bold text-gray-900">Cash Flow Statement</h2>
        {startDate && endDate && (
          <p className="text-sm text-gray-600 mt-2">
            For the period: {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Opening Balance */}
      <div className="flex justify-between py-3 px-4 bg-gray-100 rounded font-semibold">
        <span className="text-gray-900">Opening Cash Balance</span>
        <span className="text-gray-900">{formatCurrency(data.openingBalance || 0)}</span>
      </div>

      {/* Cash Inflows */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Cash Inflows</h3>
        <div className="space-y-2 mb-4">
          {data.inflows && data.inflows.length > 0 ? (
            data.inflows.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50 text-sm">
                <div>
                  <p className="text-gray-700">{item.description}</p>
                  <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                </div>
                <span className="font-medium text-green-600">{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm py-2 px-4">No inflows recorded</p>
          )}
        </div>
        <div className="flex justify-between py-3 px-4 bg-green-50 rounded font-semibold">
          <span className="text-gray-900">Total Inflows</span>
          <span className="text-green-600">{formatCurrency(data.totalInflow || 0)}</span>
        </div>
      </div>

      {/* Cash Outflows */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b-2 border-gray-300">Cash Outflows</h3>
        <div className="space-y-2 mb-4">
          {data.outflows && data.outflows.length > 0 ? (
            data.outflows.map((item, idx) => (
              <div key={idx} className="flex justify-between py-2 px-4 hover:bg-gray-50 text-sm">
                <div>
                  <p className="text-gray-700">{item.description}</p>
                  <p className="text-xs text-gray-500">{new Date(item.date).toLocaleDateString()}</p>
                </div>
                <span className="font-medium text-red-600">{formatCurrency(item.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm py-2 px-4">No outflows recorded</p>
          )}
        </div>
        <div className="flex justify-between py-3 px-4 bg-red-50 rounded font-semibold">
          <span className="text-gray-900">Total Outflows</span>
          <span className="text-red-600">{formatCurrency(data.totalOutflow || 0)}</span>
        </div>
      </div>

      {/* Net Cash Flow */}
      <div className="space-y-2">
        <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border-2 border-blue-600">
          <span className="font-bold text-gray-900">Net Cash Flow</span>
          <span className={`font-bold text-lg ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.netCashFlow || 0)}
          </span>
        </div>
        <div className="flex justify-between py-3 px-4 bg-gray-100 rounded font-semibold">
          <span className="text-gray-900">Closing Cash Balance</span>
          <span className="text-gray-900">{formatCurrency(data.closingBalance || 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default CashFlowReport;
