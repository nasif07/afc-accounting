// ✅ UPDATED: Journal Entry Form Component
// Includes: Real-time balance check, leaf node filtering, disabled submit button logic

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createJournalEntry } from '../store/slices/journalSlice';
import { fetchAccounts } from '../store/slices/accountSlice';
import toast from 'react-hot-toast';

export default function JournalEntryForm() {
  const dispatch = useDispatch();
  const { accounts } = useSelector((state) => state.accounts);
  const { loading } = useSelector((state) => state.journals);
  
  const [formData, setFormData] = useState({
    voucherNumber: '',
    voucherDate: new Date().toISOString().split('T')[0],
    transactionType: 'journal-entry',
    description: '',
    bookEntries: [
      { account: '', debit: '', credit: '', description: '' },
      { account: '', debit: '', credit: '', description: '' },
    ],
  });
  
  const [validationErrors, setValidationErrors] = useState([]);
  const [balanceStatus, setBalanceStatus] = useState({
    totalDebits: 0,
    totalCredits: 0,
    isBalanced: false,
  });
  
  // ✅ NEW: Fetch leaf nodes only (accounts that can be used in transactions)
  useEffect(() => {
    dispatch(fetchAccounts({ leafNodesOnly: true }));
  }, [dispatch]);
  
  // ✅ NEW: Real-time balance calculation
  useEffect(() => {
    calculateBalance();
    validateForm();
  }, [formData.bookEntries]);
  
  /**
   * ✅ NEW: Calculate total debits and credits
   */
  const calculateBalance = () => {
    let totalDebits = 0;
    let totalCredits = 0;
    
    formData.bookEntries.forEach((entry) => {
      const debit = parseFloat(entry.debit) || 0;
      const credit = parseFloat(entry.credit) || 0;
      totalDebits += debit;
      totalCredits += credit;
    });
    
    setBalanceStatus({
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    });
  };
  
  /**
   * ✅ NEW: Validate entire form
   */
  const validateForm = () => {
    const errors = [];
    
    // ✅ Check: Minimum 2 lines
    if (formData.bookEntries.length < 2) {
      errors.push("Journal entry must have at least 2 line items");
    }
    
    // ✅ Check: Each line item
    formData.bookEntries.forEach((entry, index) => {
      if (!entry.account) {
        errors.push(`Line ${index + 1}: Account is required`);
      }
      
      const debit = parseFloat(entry.debit) || 0;
      const credit = parseFloat(entry.credit) || 0;
      
      // ✅ Check: Not both debit and credit
      if (debit > 0 && credit > 0) {
        errors.push(`Line ${index + 1}: Cannot have both debit and credit amounts`);
      }
      
      // ✅ Check: Not zero amounts
      if (debit === 0 && credit === 0) {
        errors.push(`Line ${index + 1}: Amount cannot be zero`);
      }
      
      // ✅ Check: Not negative amounts
      if (debit < 0 || credit < 0) {
        errors.push(`Line ${index + 1}: Amounts cannot be negative`);
      }
    });
    
    // ✅ Check: Balance
    if (!balanceStatus.isBalanced) {
      errors.push(
        `Journal entry is not balanced. Debits: ${balanceStatus.totalDebits}, Credits: ${balanceStatus.totalCredits}`
      );
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };
  
  /**
   * ✅ Handle line item change
   */
  const handleLineChange = (index, field, value) => {
    const newEntries = [...formData.bookEntries];
    
    // ✅ NEW: If entering debit, clear credit and vice versa
    if (field === 'debit' && value) {
      newEntries[index].credit = '';
    } else if (field === 'credit' && value) {
      newEntries[index].debit = '';
    }
    
    newEntries[index][field] = value;
    setFormData({
      ...formData,
      bookEntries: newEntries,
    });
  };
  
  /**
   * ✅ Add new line item
   */
  const addLineItem = () => {
    setFormData({
      ...formData,
      bookEntries: [
        ...formData.bookEntries,
        { account: '', debit: '', credit: '', description: '' },
      ],
    });
  };
  
  /**
   * ✅ Remove line item
   */
  const removeLineItem = (index) => {
    if (formData.bookEntries.length > 2) {
      const newEntries = formData.bookEntries.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        bookEntries: newEntries,
      });
    } else {
      toast.error('Journal entry must have at least 2 line items');
    }
  };
  
  /**
   * ✅ Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    try {
      await dispatch(createJournalEntry(formData)).unwrap();
      toast.success('Journal entry created successfully');
      
      // Reset form
      setFormData({
        voucherNumber: '',
        voucherDate: new Date().toISOString().split('T')[0],
        transactionType: 'journal-entry',
        description: '',
        bookEntries: [
          { account: '', debit: '', credit: '', description: '' },
          { account: '', debit: '', credit: '', description: '' },
        ],
      });
    } catch (error) {
      toast.error(error?.validationErrors?.[0] || error?.message || 'Failed to create journal entry');
    }
  };
  
  // ✅ NEW: Determine if submit button should be disabled
  const isSubmitDisabled = !balanceStatus.isBalanced || validationErrors.length > 0 || loading;
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Create Journal Entry</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voucher Number *
            </label>
            <input
              type="text"
              value={formData.voucherNumber}
              onChange={(e) =>
                setFormData({ ...formData, voucherNumber: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="JE-001"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voucher Date *
            </label>
            <input
              type="date"
              value={formData.voucherDate}
              onChange={(e) =>
                setFormData({ ...formData, voucherDate: e.target.value })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type *
            </label>
            <select
              value={formData.transactionType}
              onChange={(e) =>
                setFormData({ ...formData, transactionType: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="journal-entry">Journal Entry</option>
              <option value="receipt">Receipt</option>
              <option value="payment">Payment</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
        
        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter description..."
          />
        </div>
        
        {/* ✅ NEW: Balance Status Display */}
        <div className={`p-4 rounded-lg border-2 ${
          balanceStatus.isBalanced
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50'
        }`}>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Total Debits</p>
              <p className="text-2xl font-bold text-gray-800">
                ₹{balanceStatus.totalDebits}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Credits</p>
              <p className="text-2xl font-bold text-gray-800">
                ₹{balanceStatus.totalCredits}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className={`text-2xl font-bold ${
                balanceStatus.isBalanced ? 'text-green-600' : 'text-red-600'
              }`}>
                {balanceStatus.isBalanced ? '✓ Balanced' : '✗ Unbalanced'}
              </p>
            </div>
          </div>
        </div>
        
        {/* ✅ NEW: Validation Errors Display */}
        {validationErrors.length > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 mb-2">Validation Errors:</p>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="text-sm text-red-700">
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-2 text-left text-sm font-semibold">Account</th>
                <th className="px-4 py-2 text-right text-sm font-semibold">Debit (₹)</th>
                <th className="px-4 py-2 text-right text-sm font-semibold">Credit (₹)</th>
                <th className="px-4 py-2 text-left text-sm font-semibold">Description</th>
                <th className="px-4 py-2 text-center text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.bookEntries.map((entry, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    {/* ✅ NEW: Filter to show only leaf nodes */}
                    <select
                      value={entry.account}
                      onChange={(e) =>
                        handleLineChange(index, 'account', e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts
                        .filter((acc) => acc.isLeaf)  // ✅ Only leaf nodes
                        .map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.accountCode} - {account.accountName}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={entry.debit}
                      onChange={(e) =>
                        handleLineChange(index, 'debit', e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={entry.credit}
                      onChange={(e) =>
                        handleLineChange(index, 'credit', e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={entry.description}
                      onChange={(e) =>
                        handleLineChange(index, 'description', e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      placeholder="Description"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-800 font-medium"
                      disabled={formData.bookEntries.length <= 2}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Add Line Button */}
        <button
          type="button"
          onClick={addLineItem}
          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
        >
          + Add Line Item
        </button>
        
        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`px-6 py-2 rounded-lg font-medium text-white transition ${
              isSubmitDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Creating...' : 'Create Journal Entry'}
          </button>
          
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
