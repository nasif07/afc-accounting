import React, { useState, useMemo } from 'react';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Modal, Input, Select, FormField, Button, Badge } from './ui/index';
import { formatCurrency, parseCurrencyInput, centsToDecimal } from '../utils/currency';

const InvoiceBuilder = React.forwardRef(
  (
    {
      isOpen,
      onClose,
      onSubmit,
      initialData = null,
      students = [],
      loading = false,
      ...props
    },
    ref
  ) => {
    const [showPreview, setShowPreview] = useState(false);
    const [formData, setFormData] = useState({
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
      studentId: '',
      studentName: '',
      studentEmail: '',
      studentPhone: '',
      items: [{ description: '', quantity: 1, rate: '' }],
      notes: '',
      terms: '',
      status: 'draft',
    });

    const [errors, setErrors] = useState({});

    // Initialize form
    React.useEffect(() => {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          invoiceNumber: '',
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0],
          studentId: '',
          studentName: '',
          studentEmail: '',
          studentPhone: '',
          items: [{ description: '', quantity: 1, rate: '' }],
          notes: '',
          terms: '',
          status: 'draft',
        });
      }
      setErrors({});
    }, [initialData, isOpen]);

    // Calculate totals
    const totals = useMemo(() => {
      let subtotal = 0;
      formData.items.forEach((item) => {
        const amount = (item.quantity || 0) * parseCurrencyInput(item.rate);
        subtotal += amount;
      });

      const tax = Math.round(subtotal * 0.18); // 18% GST
      const total = subtotal + tax;

      return { subtotal, tax, total };
    }, [formData.items]);

    // Handle field changes
    const handleFieldChange = (field, value) => {
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
    };

    // Handle item changes
    const handleItemChange = (index, field, value) => {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        ),
      }));
    };

    // Add item
    const handleAddItem = () => {
      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, { description: '', quantity: 1, rate: '' }],
      }));
    };

    // Remove item
    const handleRemoveItem = (index) => {
      if (formData.items.length > 1) {
        setFormData((prev) => ({
          ...prev,
          items: prev.items.filter((_, i) => i !== index),
        }));
      }
    };

    // Handle student selection
    const handleStudentSelect = (studentId) => {
      const student = students.find((s) => s._id === studentId);
      if (student) {
        setFormData((prev) => ({
          ...prev,
          studentId,
          studentName: student.name || '',
          studentEmail: student.email || '',
          studentPhone: student.phone || '',
        }));
      }
    };

    // Validate form
    const validateForm = () => {
      const newErrors = {};

      if (!formData.invoiceNumber.trim()) {
        newErrors.invoiceNumber = 'Invoice number is required';
      }

      if (!formData.studentId) {
        newErrors.studentId = 'Student is required';
      }

      if (formData.items.some((i) => !i.description || !i.rate)) {
        newErrors.items = 'All items must have description and rate';
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
        items: formData.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: parseCurrencyInput(item.rate),
          amount: item.quantity * parseCurrencyInput(item.rate),
        })),
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
      };

      await onSubmit(submitData);
      onClose();
    };

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={initialData ? 'Edit Invoice' : 'Create Invoice'}
        size="4xl"
      >
        <div className="flex gap-4 mb-6">
          <Button
            type="button"
            variant={!showPreview ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(false)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant={showPreview ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowPreview(true)}
          >
            <Eye size={16} />
            Preview
          </Button>
        </div>

        {showPreview ? (
          // Preview Mode
          <div className="bg-white border border-neutral-200 rounded-lg p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-200 pb-6">
              <div>
                <h1 className="text-3xl font-bold text-neutral-900">INVOICE</h1>
                <p className="text-neutral-600">#{formData.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-neutral-900">Alliance Française</p>
                <p className="text-sm text-neutral-600">Financial Management</p>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs text-neutral-600 mb-1">Invoice Date</p>
                <p className="font-semibold text-neutral-900">
                  {new Date(formData.invoiceDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-600 mb-1">Due Date</p>
                <p className="font-semibold text-neutral-900">
                  {new Date(formData.dueDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Bill To */}
            <div>
              <p className="text-xs text-neutral-600 mb-2 font-semibold">BILL TO</p>
              <p className="font-semibold text-neutral-900">{formData.studentName}</p>
              <p className="text-sm text-neutral-600">{formData.studentEmail}</p>
              <p className="text-sm text-neutral-600">{formData.studentPhone}</p>
            </div>

            {/* Items Table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-neutral-900">
                  <th className="text-left py-2 font-semibold text-neutral-900">Description</th>
                  <th className="text-right py-2 font-semibold text-neutral-900">Quantity</th>
                  <th className="text-right py-2 font-semibold text-neutral-900">Rate</th>
                  <th className="text-right py-2 font-semibold text-neutral-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index} className="border-b border-neutral-200">
                    <td className="py-3">{item.description}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(parseCurrencyInput(item.rate))}</td>
                    <td className="text-right font-semibold">
                      {formatCurrency(item.quantity * parseCurrencyInput(item.rate))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between py-2 border-b border-neutral-200">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-neutral-200">
                  <span className="text-neutral-600">Tax (18%)</span>
                  <span className="font-semibold">{formatCurrency(totals.tax)}</span>
                </div>
                <div className="flex justify-between py-3 bg-mahogany-50 px-4 rounded-lg">
                  <span className="font-bold text-neutral-900">Total</span>
                  <span className="font-bold text-mahogany-700">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {formData.notes && (
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-xs text-neutral-600 mb-1 font-semibold">NOTES</p>
                <p className="text-sm text-neutral-700">{formData.notes}</p>
              </div>
            )}
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Invoice Number" required error={errors.invoiceNumber}>
                <Input
                  value={formData.invoiceNumber}
                  onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
                  placeholder="e.g., INV-001"
                />
              </FormField>

              <FormField label="Student" required error={errors.studentId}>
                <Select
                  value={formData.studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                >
                  <option value="">Select student...</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name}
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Invoice Date">
                <Input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
                />
              </FormField>

              <FormField label="Due Date">
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                />
              </FormField>
            </div>

            {/* Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-neutral-900">Line Items</h3>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddItem}
                >
                  <Plus size={16} />
                  Add Item
                </Button>
              </div>

              {errors.items && <p className="text-xs text-red-600">{errors.items}</p>}

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="col-span-5"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="col-span-2"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                      className="col-span-3"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      disabled={formData.items.length <= 1}
                      className="col-span-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <FormField label="Notes">
              <textarea
                value={formData.notes}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Additional notes..."
                rows="3"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mahogany-700"
              />
            </FormField>

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
                disabled={loading}
                isLoading={loading}
              >
                {initialData ? 'Update' : 'Create'} Invoice
              </Button>
            </div>
          </form>
        )}
      </Modal>
    );
  }
);

InvoiceBuilder.displayName = 'InvoiceBuilder';

export default InvoiceBuilder;
