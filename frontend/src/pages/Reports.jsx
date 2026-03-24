import { useState } from 'react';
import { FileText, BarChart3 } from 'lucide-react';
import ReportRenderer from '../components/ReportRenderer';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';

export default function Reports() {
  const [reportType, setReportType] = useState('pl');
  const [period, setPeriod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Sample data for P&L
  const plData = {
    revenue: {
      items: [
        { name: 'Tuition Fees', amount: 500000000 },
        { name: 'Exam Fees', amount: 50000000 },
        { name: 'Registration Fees', amount: 30000000 },
      ],
      total: 580000000,
    },
    expenses: {
      items: [
        { name: 'Salaries & Wages', amount: 200000000 },
        { name: 'Rent & Utilities', amount: 50000000 },
        { name: 'Teaching Materials', amount: 30000000 },
        { name: 'Maintenance', amount: 20000000 },
      ],
      total: 300000000,
    },
  };

  // Sample data for Balance Sheet
  const bsData = {
    assets: {
      current: {
        items: [
          { name: 'Cash in Hand', amount: 100000000 },
          { name: 'Bank Accounts', amount: 150000000 },
          { name: 'Accounts Receivable', amount: 80000000 },
        ],
        total: 330000000,
      },
      fixed: {
        items: [
          { name: 'Buildings', amount: 500000000 },
          { name: 'Equipment', amount: 100000000 },
          { name: 'Furniture', amount: 50000000 },
        ],
        total: 650000000,
      },
    },
    liabilities: {
      current: {
        items: [
          { name: 'Accounts Payable', amount: 50000000 },
          { name: 'Short-term Loans', amount: 100000000 },
        ],
        total: 150000000,
      },
    },
    equity: {
      items: [
        { name: 'Capital', amount: 500000000 },
        { name: 'Retained Earnings', amount: 330000000 },
      ],
      total: 830000000,
    },
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setPeriod(`${startDate} to ${endDate}`);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Financial Reports</h1>
        <p className="text-neutral-600 mt-2">Generate and view financial statements</p>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Report Type">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mahogany-700"
              >
                <option value="pl">Profit & Loss Statement</option>
                <option value="bs">Balance Sheet</option>
              </select>
            </FormField>

            <FormField label="Start Date">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </FormField>

            <FormField label="End Date">
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </FormField>
          </div>

          <Button
            variant="primary"
            onClick={handleGenerateReport}
            isLoading={loading}
            fullWidth
          >
            <BarChart3 size={18} />
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Reports */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-semibold text-neutral-900">Quick Reports</h3>
          <Button
            variant="outline"
            fullWidth
            onClick={() => {
              setReportType('pl');
              const today = new Date();
              const startOfYear = new Date(today.getFullYear(), 0, 1);
              setStartDate(startOfYear.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
              setPeriod(`${startOfYear.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);
            }}
          >
            <FileText size={16} />
            YTD P&L
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => {
              setReportType('bs');
              const today = new Date();
              setStartDate(today.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
              setPeriod(`As of ${today.toISOString().split('T')[0]}`);
            }}
          >
            <FileText size={16} />
            Current Balance Sheet
          </Button>
        </div>

        {/* Report Display */}
        <div className="lg:col-span-3">
          {period ? (
            <ReportRenderer
              title={reportType === 'pl' ? 'Profit & Loss Statement' : 'Balance Sheet'}
              reportType={reportType}
              data={reportType === 'pl' ? plData : bsData}
              period={period}
              loading={loading}
            />
          ) : (
            <Card>
              <CardContent className="pt-12 text-center">
                <BarChart3 size={48} className="mx-auto text-neutral-300 mb-4" />
                <p className="text-neutral-600">Select dates and generate a report to view it here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'Profit & Loss - Jan 2026', date: '2026-01-31', type: 'P&L' },
              { name: 'Balance Sheet - Dec 2025', date: '2025-12-31', type: 'BS' },
              { name: 'Profit & Loss - Dec 2025', date: '2025-12-31', type: 'P&L' },
            ].map((report, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
              >
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-mahogany-700" />
                  <div>
                    <p className="font-medium text-neutral-900">{report.name}</p>
                    <p className="text-xs text-neutral-600">{report.date}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
