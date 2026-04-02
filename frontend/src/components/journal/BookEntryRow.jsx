import React, { useEffect, useState } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';

const BookEntryRow = ({
  rowIndex,
  entry,
  leafAccounts,
  onUpdate,
  onRemove,
  errors = {},
}) => {
  const [debit, setDebit] = useState(entry.debit || 0);
  const [credit, setCredit] = useState(entry.credit || 0);
  const [accountId, setAccountId] = useState(entry.account || '');
  const [description, setDescription] = useState(entry.description || '');

  useEffect(() => {
    onUpdate(rowIndex, {
      account: accountId,
      debit: parseFloat(debit) || 0,
      credit: parseFloat(credit) || 0,
      description,
    });
  }, [debit, credit, accountId, description, rowIndex, onUpdate]);

  const handleDebitChange = (e) => {
    const value = e.target.value;
    setDebit(value);
    if (parseFloat(value) > 0) setCredit(0);
  };

  const handleCreditChange = (e) => {
    const value = e.target.value;
    setCredit(value);
    if (parseFloat(value) > 0) setDebit(0);
  };

  const rowError = errors[rowIndex];
  const hasError = rowError && rowError.length > 0;

  return (
    <div className={`border rounded-lg p-4 mb-3 ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-2">
        {/* Account Select */}
        <div className="col-span-1 md:col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Account *
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Account</option>
            {leafAccounts && leafAccounts.map((account) => (
              <option key={account._id} value={account._id}>
                {account.accountCode} - {account.accountName}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="col-span-1 md:col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Row description"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Debit */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Debit
          </label>
          <input
            type="number"
            value={debit}
            onChange={handleDebitChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Credit */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Credit
          </label>
          <input
            type="number"
            value={credit}
            onChange={handleCreditChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Remove Button */}
        <div className="col-span-1 md:col-span-2 flex items-end">
          <button
            type="button"
            onClick={() => onRemove(rowIndex)}
            className="w-full px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition flex items-center justify-center gap-2 text-sm"
          >
            <Trash2 size={16} />
            Remove
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {hasError && (
        <div className="flex gap-2 text-red-700 text-xs mt-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            {rowError.map((error, idx) => (
              <p key={idx}>{error}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookEntryRow;
