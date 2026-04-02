import React from 'react';
import { Filter, X } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';

const ReportFilters = ({ 
  reportType, 
  onReportTypeChange, 
  filters, 
  onFilterChange, 
  onReset,
  loading = false 
}) => {
  const reportOptions = [
    { value: 'trial-balance', label: 'Trial Balance' },
    { value: 'income-statement', label: 'Profit & Loss' },
    { value: 'balance-sheet', label: 'Balance Sheet' },
    { value: 'cash-flow', label: 'Cash Flow Statement' },
    { value: 'general-ledger', label: 'General Ledger' },
  ];

  const requiresDateRange = ['income-statement', 'cash-flow', 'general-ledger'].includes(reportType);
  const requiresSingleDate = ['trial-balance', 'balance-sheet'].includes(reportType);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Filter size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-900">Report Filters</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
          <Select
            value={reportType}
            onChange={(e) => onReportTypeChange(e.target.value)}
            options={reportOptions}
            disabled={loading}
          />
        </div>

        {/* Date Range or Single Date */}
        {requiresDateRange && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => onFilterChange('startDate', e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => onFilterChange('endDate', e.target.value)}
                disabled={loading}
              />
            </div>
          </>
        )}

        {requiresSingleDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">As of Date</label>
            <Input
              type="date"
              value={filters.asOfDate || ''}
              onChange={(e) => onFilterChange('asOfDate', e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {/* View Type (if applicable) */}
        {['general-ledger', 'income-statement'].includes(reportType) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
            <Select
              value={filters.viewType || 'detailed'}
              onChange={(e) => onFilterChange('viewType', e.target.value)}
              options={[
                { value: 'detailed', label: 'Detailed' },
                { value: 'grouped', label: 'Grouped' },
              ]}
              disabled={loading}
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          disabled={loading}
        >
          <X size={16} className="mr-1" />
          Reset
        </Button>
      </div>
    </div>
  );
};

export default ReportFilters;
