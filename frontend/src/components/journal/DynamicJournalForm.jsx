import React, { useState } from 'react';
import { Plus, Loader, X } from 'lucide-react';
import BookEntryRow from './BookEntryRow';
import BalanceSummary from './BalanceSummary';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { toast } from 'sonner';

const DynamicJournalForm = ({ onSubmit, onCancel, isLoading: isSubmitting = false, initialData = null }) => {
  const [voucherDate, setVoucherDate] = useState(
    initialData?.voucherDate || new Date().toISOString().split('T')[0]
  );
  const [transactionType, setTransactionType] = useState(
    initialData?.transactionType || 'journal-entry'
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [bookEntries, setBookEntries] = useState(
    initialData?.bookEntries || [
      { account: '', debit: 0, credit: 0, description: '' },
      { account: '', debit: 0, credit: 0, description: '' }
    ]
  );
  const [errors, setErrors] = useState({});

  // Fetch leaf accounts
  const { data: leafAccounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['leafAccounts'],
    queryFn: async () => {
      const response = await api.get('/accounts/leaf-nodes');
      return response.data.data || [];
    },
  });

  // Calculate totals
  const totalDebit = bookEntries.reduce((sum, entry) => sum + (parseFloat(entry.debit) || 0), 0);
  const totalCredit = bookEntries.reduce((sum, entry) => sum + (parseFloat(entry.credit) || 0), 0);
  // FIXED: Both debit and credit must be > 0 for a balanced entry
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0 && totalCredit > 0;

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    // Check if at least 2 entries
    if (bookEntries.length < 2) {
      toast.error('Journal entry must have at least 2 line items');
      return false;
    }

    // Validate each entry
    bookEntries.forEach((entry, idx) => {
      const entryErrors = [];

      if (!entry.account) {
        entryErrors.push('Account is required');
        isValid = false;
      }

      const d = parseFloat(entry.debit) || 0;
      const c = parseFloat(entry.credit) || 0;

      if (d > 0 && c > 0) {
        entryErrors.push('Cannot have both debit and credit');
        isValid = false;
      }

      if (d === 0 && c === 0) {
        entryErrors.push('Must have either debit or credit');
        isValid = false;
      }

      if (entryErrors.length > 0) {
        newErrors[idx] = entryErrors;
      }
    });

    // Check if balanced
    if (!isBalanced) {
      if (totalDebit === 0) {
        toast.error('Journal entry cannot be empty');
      } else {
        toast.error('Journal entry must be balanced (Debits = Credits)');
      }
      return false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Handle row update
  const handleRowUpdate = (rowIndex, updatedEntry) => {
    const newEntries = [...bookEntries];
    newEntries[rowIndex] = updatedEntry;
    setBookEntries(newEntries);
  };

  // Handle row removal
  const handleRowRemove = (rowIndex) => {
    if (bookEntries.length <= 2) {
      toast.error('Journal entry must have at least 2 line items');
      return;
    }
    const newEntries = bookEntries.filter((_, idx) => idx !== rowIndex);
    setBookEntries(newEntries);
  };

  // Handle add row
  const handleAddRow = () => {
    setBookEntries([
      ...bookEntries,
      { account: '', debit: 0, credit: 0, description: '' },
    ]);
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const payload = {
      voucherDate,
      transactionType,
      description,
      bookEntries,
    };

    await onSubmit(payload);
  };

  if (isLoadingAccounts) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin text-blue-600" size={24} />
        <span className="ml-2 text-gray-600">Loading accounts...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative">
      {onCancel && (
        <button 
          type="button"
          onClick={onCancel}
          className="absolute top-0 right-0 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
      )}
      
      {/* Voucher Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Voucher Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Voucher Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher Date *
            </label>
            <input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Type *
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="journal-entry">Journal Entry</option>
              <option value="receipt">Receipt</option>
              <option value="payment">Payment</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Voucher Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Book Entries */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Book Entries</h2>
        
        <div className="space-y-1">
          {bookEntries.map((entry, idx) => (
            <BookEntryRow
              key={idx}
              rowIndex={idx}
              entry={entry}
              leafAccounts={leafAccounts}
              onUpdate={handleRowUpdate}
              onRemove={handleRowRemove}
              errors={errors}
            />
          ))}
        </div>

        {/* Add Row Button */}
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition mt-2 text-sm font-medium"
        >
          <Plus size={18} />
          Add Row
        </button>
      </div>

      {/* Balance Summary */}
      <BalanceSummary
        totalDebit={totalDebit}
        totalCredit={totalCredit}
        isBalanced={isBalanced}
      />

      {/* Submit Button */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition font-medium"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isBalanced || isSubmitting}
          className={`px-6 py-2 rounded-md font-medium transition flex items-center gap-2 ${
            isBalanced && !isSubmitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting && <Loader className="animate-spin" size={18} />}
          {isSubmitting ? 'Submitting...' : 'Create Journal Entry'}
        </button>
      </div>
    </form>
  );
};

export default DynamicJournalForm;
