import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";

const BalanceSummary = ({ totalDebit, totalCredit, isBalanced }) => {
  const difference = Math.abs(totalDebit - totalCredit);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Balance Summary
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Debit */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-sm text-blue-700 font-medium mb-1">Total Debit</p>
          <p className="text-2xl font-bold text-blue-900">
            ৳
            {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Total Credit */}
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
          <p className="text-sm text-purple-700 font-medium mb-1">
            Total Credit
          </p>
          <p className="text-2xl font-bold text-purple-900">
            ৳
            {totalCredit.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        {/* Balance Status */}
        <div
          className={`rounded-lg p-4 border ${
            isBalanced
              ? "bg-green-50 border-green-100"
              : "bg-red-50 border-red-100"
          }`}>
          <div className="flex items-center gap-2 mb-1">
            {isBalanced ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <AlertCircle size={18} className="text-red-600" />
            )}
            <p
              className={`text-sm font-medium ${
                isBalanced ? "text-green-700" : "text-red-700"
              }`}>
              {isBalanced ? "Balanced" : "Unbalanced"}
            </p>
          </div>
          <p
            className={`text-2xl font-bold ${
              isBalanced ? "text-green-900" : "text-red-900"
            }`}>
            {isBalanced
              ? "৳0.00"
              : `৳${difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          </p>
        </div>
      </div>

      {!isBalanced && totalDebit > 0 && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-md flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle size={16} />
          <span>
            The journal entry must be balanced (Total Debit = Total Credit)
            before it can be submitted.
          </span>
        </div>
      )}
    </div>
  );
};

export default BalanceSummary;
