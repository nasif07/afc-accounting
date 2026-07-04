import React from 'react';
import { formatCurrency } from '../../utils/currency';
import { formatDisplayDate } from '../../utils/date';

const IncomeStatementReport = ({ data, startDate, endDate }) => {
  if (!data) {
    return (
      <div className="text-center py-8 text-slate-500">
        No data available for the selected period.
      </div>
    );
  }

  const profitMargin = data.totalRevenue > 0 ? ((data.netIncome / data.totalRevenue) * 100).toFixed(2) : 0;

  return (
    <div className="space-y-6">
      <div className="text-center pb-6 border-b-2 border-slate-900">
        <h2 className="text-2xl font-bold text-slate-900">Profit & Loss Statement</h2>
        {startDate && endDate && (
          <p className="text-sm text-slate-600 mt-2">
            For the period: {formatDisplayDate(startDate)} to {formatDisplayDate(endDate)}
          </p>
        )}
      </div>

      {/* Revenue Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b-2 border-slate-300">Revenue</h3>
        <div className="space-y-2 mb-4">
          {data.revenues && data.revenues.map((item, idx) => (
            <div key={idx} className="flex justify-between py-2 px-4 hover:bg-slate-50">
              <span className="text-slate-700">{item.accountName}</span>
              <span className="font-medium text-slate-900">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between py-3 px-4 bg-slate-100 rounded font-semibold">
          <span className="text-slate-900">Total Revenue</span>
          <span className="text-slate-900">{formatCurrency(data.totalRevenue)}</span>
        </div>
      </div>

      {/* Expenses Section */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b-2 border-slate-300">Expenses</h3>
        <div className="space-y-2 mb-4">
          {data.expenses && data.expenses.map((item, idx) => (
            <div key={idx} className="flex justify-between py-2 px-4 hover:bg-slate-50">
              <span className="text-slate-700">{item.accountName}</span>
              <span className="font-medium text-slate-900">{formatCurrency(item.amount)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between py-3 px-4 bg-slate-100 rounded font-semibold">
          <span className="text-slate-900">Total Expenses</span>
          <span className="text-slate-900">{formatCurrency(data.totalExpenses)}</span>
        </div>
      </div>

      {/* Net Income */}
      <div className="space-y-2">
        <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-lg border-2 border-blue-600">
          <span className="font-bold text-slate-900">Net Income</span>
          <span className={`font-bold text-lg ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(data.netIncome)}
          </span>
        </div>
        <div className="flex justify-between py-2 px-4 bg-slate-50 rounded text-sm">
          <span className="text-slate-600">Profit Margin</span>
          <span className="font-medium text-slate-900">{profitMargin}%</span>
        </div>
      </div>
    </div>
  );
};

export default IncomeStatementReport;
