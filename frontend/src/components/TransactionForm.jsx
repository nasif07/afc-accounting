import React, { useState, useCallback, useMemo } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/Card';
import { Modal, Input, Select, FormField, Button, Badge } from './ui/index';
import { formatCurrencyForInput, parseCurrencyInput, centsToDecimal } from '../utils/currency';

const TransactionForm = React.forwardRef(
  (
    {
      isOpen,
      onClose,
      onSubmit,
      initialData = null,
      accounts = [],
      loading = false,
      ...props
    },
    ref
  ) => {
    const [formData, setFormData] = useState({
      voucherNumber: '',
      voucherDate: new Date().toISOString().split('T')[0],
      transactionType: 'journal',
      description: '',
      referenceNumber: '',
      bookEntries: [
        { account: '', debit: '', credit: '' },
        { account: '', debit: '', credit: '' },
      ],
    });

    const [errors, setErrors] = useState({});

    // Initialize form with existing data
    React.useEffect(() => {
      if (initialData) {
        setFormData({
          voucherNumber: initialData.voucherNumber || '',
          voucherDate: initialData.voucherDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          transactionType: initialData.transactionType || 'journal',
          description: initialData.description || '',
          referenceNumber: initialData.referenceNumber || '',
          bookEntries: initialData.bookEntries || [
            { account: '', debit: '', credit: '' },
            { account: '', debit: '', credit: '' },
          ],
        });
      } else {
        setFormData({
          voucherNumber: '',
          voucherDate: new Date().toISOString().split('T')[0],
          transactionType: 'journal',
          description: '',
          referenceNumber: '',
          bookEntries: [
            { account: '', debit: '', credit: '' },
            { account: '', debit: '', credit: '' },
          ],
        });
      }
      setErrors({});
    }, [initialData, isOpen]);

    // Calculate totals
    const totals = useMemo(() => {
      let totalDebit = 0;
      let totalCredit = 0;

      formData.bookEntries.forEach((entry) => {
        if (entry.debit) totalDebit += parseCurrencyInput(entry.debit);
        if (entry.credit) totalCredit += parseCurrencyInput(entry.credit);
      });

      return { totalDebit, totalCredit };
    }, [formData.bookEntries]);

    const isBalanced = totals.totalDebit === totals.totalCredit && totals.totalDebit > 0;

    // Handle field changes
    const handleFieldChange = useCallback((field, value) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: null,
        }));
      }
    }, [errors]);

    // Handle entry changes
    const handleEntryChange = useCallback((index, field, value) => {
      setFormData((prev) => ({
        ...prev,
        bookEntries: prev.bookEntries.map((entry, i) =>
          i === index ? { ...entry, [field]: value } : entry
        ),
      }));
    }, []);

    // Add entry row
    const handleAddEntry = useCallback(() => {
      setFormData((prev) => ({
        ...prev,
        bookEntries: [...prev.bookEntries, { account: '', debit: '', credit: '' }],
      }));
    }, []);

    // Remove entry row
    const handleRemoveEntry = useCallback((index) => {
      if (formData.bookEntries.length > 2) {
        setFormData((prev) => ({
          ...prev,
          bookEntries: prev.bookEntries.filter((_, i) => i !== index),
        }));
      }
    }, [formData.bookEntries.length]);

    // Validate form
    const validateForm = () => {
      const newErrors = {};

      if (!formData.voucherNumber.trim()) {
        newErrors.voucherNumber = 'Voucher number is required';
      }

      if (!formData.voucherDate) {
        newErrors.voucherDate = 'Date is required';
      }

      if (formData.bookEntries.some((e) => !e.account)) {
        newErrors.bookEntries = 'All accounts must be selected';
      }

      if (!isBalanced) {
        newErrors.balance = 'Debits must equal Credits';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      const submitData = {
        ...formData,
        bookEntries: formData.bookEntries.map((entry) => ({
          account: entry.account,
          debit: parseCurrencyInput(entry.debit),
          credit: parseCurrencyInput(entry.credit),
          description: entry.description || '',
        })),
        totalDebit: totals.totalDebit,
        totalCredit: totals.totalCredit,
        isBalanced,
      };

      await onSubmit(submitData);
      onClose();
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={initialData ? 'Edit Transaction' : 'Create Transaction'}
        description="Enter transaction details and line items"
        size="4xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Voucher Number"
              required
              error={errors.voucherNumber}
            >
              <Input
                value={formData.voucherNumber}
                onChange={(e) => handleFieldChange('voucherNumber', e.target.value)}
                placeholder="e.g., JE-001"
              />
            </FormField>

            <FormField
              label="Date"
              required
              error={errors.voucherDate}
            >
              <Input
                type="date"
                value={formData.voucherDate}
                onChange={(e) => handleFieldChange('voucherDate', e.target.value)}
              />
            </FormField>

            <FormField label="Transaction Type">
              <Select
                value={formData.transactionType}
                onChange={(e) => handleFieldChange('transactionType', e.target.value)}
              >
                <option value="journal">Journal Entry</option>
                <option value="receipt">Receipt</option>
                <option value="payment">Payment</option>
              </Select>
            </FormField>

            <FormField label="Reference Number">
              <Input
                value={formData.referenceNumber}
                onChange={(e) => handleFieldChange('referenceNumber', e.target.value)}
                placeholder="e.g., INV-001"
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Input
              value={formData.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Transaction description..."
            />
          </FormField>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-neutral-900">Line Items</h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddEntry}
              >
                <Plus size={16} />
                Add Row
              </Button>
            </div>

            {errors.bookEntries && (
              <p className="text-xs text-red-600">{errors.bookEntries}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50">
                    <th className="px-4 py-3 text-left font-semibold text-neutral-900">Account</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-900">Debit</th>
                    <th className="px-4 py-3 text-right font-semibold text-neutral-900">Credit</th>
                    <th className="px-4 py-3 text-center font-semibold text-neutral-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.bookEntries.map((entry, index) => (
                    <tr key={index} className="border-b border-neutral-200 hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <Select
                          value={entry.account}
                          onChange={(e) => handleEntryChange(index, 'account', e.target.value)}
                          className="text-sm"
                        >
                          <option value="">Select account...</option>
                          {accounts.map((acc) => (
                            <option key={acc._id} value={acc._id}>
                              {acc.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.debit}
                          onChange={(e) => handleEntryChange(index, 'debit', e.target.value)}
                          placeholder="0.00"
                          className="text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          step="0.01"
                          value={entry.credit}
                          onChange={(e) => handleEntryChange(index, 'credit', e.target.value)}
                          placeholder="0.00"
                          className="text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(index)}
                          disabled={formData.bookEntries.length <= 2}
                          className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Balance */}
            <Card className="bg-neutral-50 border-neutral-200">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-neutral-600 mb-1">Total Debit</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      ₹{(totals.totalDebit / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600 mb-1">Total Credit</p>
                    <p className="text-lg font-semibold text-neutral-900">
                      ₹{(totals.totalCredit / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-600 mb-1">Balance</p>
                    <Badge variant={isBalanced ? 'success' : 'danger'}>
                      {isBalanced ? 'Balanced ✓' : 'Unbalanced'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-neutral-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!isBalanced || loading}
              isLoading={loading}
            >
              {initialData ? 'Update' : 'Create'} Transaction
            </Button>
          </div>
        </form>
      </Modal>
    );
  }
);

TransactionForm.displayName = 'TransactionForm';

export default TransactionForm;
