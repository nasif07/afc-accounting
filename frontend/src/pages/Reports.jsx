import React, { useState, useEffect, useRef } from 'react';
import { Download, Printer, BarChart3, AlertCircle, Loader } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import KPICard from '../components/reports/KPICard';
import ReportFilters from '../components/reports/ReportFilters';
import TrialBalanceReport from '../components/reports/TrialBalanceReport';
import IncomeStatementReport from '../components/reports/IncomeStatementReport';
import BalanceSheetReport from '../components/reports/BalanceSheetReport';
import CashFlowReport from '../components/reports/CashFlowReport';
import GeneralLedgerReport from '../components/reports/GeneralLedgerReport';
import { formatCurrency } from '../utils/currency';
import { toast } from 'sonner';
import api from '../services/api'; // Use the configured axios instance

export default function Reports() {
  const dispatch = useDispatch();
  const printRef = useRef();

  const [reportType, setReportType] = useState('trial-balance');
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    asOfDate: new Date().toISOString().split('T')[0],
    viewType: 'detailed',
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  const user = useSelector(state => state.auth.user);

  // Fetch report data
  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      let endpoint = '/accounting/journal-entries';
      let params = {};

      switch (reportType) {
        case 'trial-balance':
          endpoint += '/trial-balance';
          if (filters.asOfDate) params.asOfDate = filters.asOfDate;
          break;
        case 'income-statement':
          endpoint += '/income-statement';
          if (filters.startDate) params.startDate = filters.startDate;
          if (filters.endDate) params.endDate = filters.endDate;
          break;
        case 'balance-sheet':
          endpoint += '/balance-sheet';
          if (filters.asOfDate) params.asOfDate = filters.asOfDate;
          break;
        case 'cash-flow':
          endpoint += '/cash-flow';
          if (filters.startDate) params.startDate = filters.startDate;
          if (filters.endDate) params.endDate = filters.endDate;
          break;
        default:
          throw new Error('Invalid report type');
      }

      // Use the axios instance which handles withCredentials (cookies) automatically
      const response = await api.get(endpoint, { params });
      
      setReportData(response.data.data);
      toast.success('Report generated successfully');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to generate report';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle report type change
  const handleReportTypeChange = (type) => {
    setReportType(type);
    setReportData(null);
    setError(null);
  };

  // Reset filters
  const handleReset = () => {
    setFilters({
      startDate: '',
      endDate: '',
      asOfDate: new Date().toISOString().split('T')[0],
      viewType: 'detailed',
    });
    setReportData(null);
    setError(null);
  };

  // Print report
  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Report</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">');
    printWindow.document.write('</head><body>');
    printWindow.document.write(printRef.current.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Download as PDF
  const handleDownloadPDF = async () => {
    try {
      const element = printRef.current;
      if (!element) return;

      // Dynamic import of html2pdf
      const html2pdf = (await import('html2pdf.js')).default;
      
      const opt = {
        margin: 10,
        filename: `${reportType}-${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      };

      html2pdf().set(opt).from(element).save();
      toast.success('Report downloaded successfully');
    } catch (err) {
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  // Calculate KPIs based on report data
  const getKPIs = () => {
    if (!reportData) return [];

    switch (reportType) {
      case 'income-statement':
        return [
          {
            title: 'Total Revenue',
            value: reportData.totalRevenue || 0,
            color: 'green',
          },
          {
            title: 'Total Expenses',
            value: reportData.totalExpenses || 0,
            color: 'red',
          },
          {
            title: 'Net Income',
            value: reportData.netIncome || 0,
            color: reportData.netIncome >= 0 ? 'green' : 'red',
          },
        ];
      case 'balance-sheet':
        return [
          {
            title: 'Total Assets',
            value: reportData.totalAssets || 0,
            color: 'blue',
          },
          {
            title: 'Total Liabilities',
            value: reportData.totalLiabilities || 0,
            color: 'amber',
          },
          {
            title: 'Total Equity',
            value: reportData.totalEquity || 0,
            color: 'purple',
          },
        ];
      case 'cash-flow':
        return [
          {
            title: 'Total Inflows',
            value: reportData.totalInflow || 0,
            color: 'green',
          },
          {
            title: 'Total Outflows',
            value: reportData.totalOutflow || 0,
            color: 'red',
          },
          {
            title: 'Net Cash Flow',
            value: reportData.netCashFlow || 0,
            color: reportData.netCashFlow >= 0 ? 'green' : 'red',
          },
        ];
      case 'trial-balance':
        return [
          {
            title: 'Total Debits',
            value: reportData.totalDebits || 0,
            color: 'blue',
          },
          {
            title: 'Total Credits',
            value: reportData.totalCredits || 0,
            color: 'blue',
          },
          {
            title: 'Status',
            value: reportData.isBalanced ? 'Balanced' : 'Unbalanced',
            color: reportData.isBalanced ? 'green' : 'red',
            format: 'text',
          },
        ];
      default:
        return [];
    }
  };

  const kpis = getKPIs();

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Financial Reports</h1>
          <p className="text-neutral-600 mt-2">Generate and analyze comprehensive financial statements</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={fetchReport}
            isLoading={loading}
            disabled={loading}
            size="md"
            className="shadow-lg"
          >
            <BarChart3 size={18} className="mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Report Filters */}
      <ReportFilters
        reportType={reportType}
        onReportTypeChange={handleReportTypeChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        loading={loading}
      />

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle size={20} className="text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-12 text-center">
            <Loader size={48} className="mx-auto text-neutral-400 mb-4 animate-spin" />
            <p className="text-neutral-600">Generating report...</p>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      {reportData && !loading && (
        <>
          {/* KPI Cards */}
          {kpis.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {kpis.map((kpi, idx) => (
                <KPICard
                  key={idx}
                  title={kpi.title}
                  value={kpi.value}
                  color={kpi.color}
                  format={kpi.format || 'currency'}
                />
              ))}
            </div>
          )}

          {/* Report Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer size={16} className="mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download size={16} className="mr-2" />
              Download PDF
            </Button>
          </div>

          {/* Report Display */}
          <Card className="shadow-xl border-t-4 border-mahogany-700">
            <CardContent className="pt-8" ref={printRef}>
              {/* Report Header */}
              <div className="text-center mb-8 pb-6 border-b-2 border-neutral-900">
                <h1 className="text-2xl font-bold text-neutral-900 uppercase tracking-wider">Alliance Française</h1>
                <p className="text-neutral-600 mt-1 font-medium">Financial Management System</p>
                <div className="mt-6 inline-block px-4 py-1 bg-neutral-900 text-white rounded-full text-sm font-bold uppercase tracking-widest">
                  {reportType === 'trial-balance' && 'Trial Balance'}
                  {reportType === 'income-statement' && 'Profit & Loss Statement'}
                  {reportType === 'balance-sheet' && 'Balance Sheet'}
                  {reportType === 'cash-flow' && 'Cash Flow Statement'}
                  {reportType === 'general-ledger' && 'General Ledger'}
                </div>
                <div className="mt-4 flex flex-col items-center gap-1">
                  {(filters.startDate || filters.endDate) && (
                    <p className="text-sm text-neutral-600">
                      <span className="font-semibold">Period:</span> {filters.startDate ? new Date(filters.startDate).toLocaleDateString() : 'N/A'} to {filters.endDate ? new Date(filters.endDate).toLocaleDateString() : 'N/A'}
                    </p>
                  )}
                  {filters.asOfDate && (
                    <p className="text-sm text-neutral-600">
                      <span className="font-semibold">As of:</span> {new Date(filters.asOfDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Report Content */}
              <div className="min-h-[400px]">
                {reportType === 'trial-balance' && (
                  <TrialBalanceReport data={reportData} asOfDate={filters.asOfDate} />
                )}
                {reportType === 'income-statement' && (
                  <IncomeStatementReport data={reportData} startDate={filters.startDate} endDate={filters.endDate} />
                )}
                {reportType === 'balance-sheet' && (
                  <BalanceSheetReport data={reportData} asOfDate={filters.asOfDate} />
                )}
                {reportType === 'cash-flow' && (
                  <CashFlowReport data={reportData} startDate={filters.startDate} endDate={filters.endDate} />
                )}
              </div>

              {/* Report Footer */}
              <div className="mt-12 pt-6 border-t border-neutral-200 text-center text-xs text-neutral-500 italic">
                <p>Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
                <p>This is a computer-generated report and does not require a signature.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Empty State */}
      {!reportData && !loading && !error && (
        <Card className="border-dashed border-2 border-neutral-200 bg-neutral-50">
          <CardContent className="py-20 text-center">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <BarChart3 size={40} className="text-neutral-300" />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">No Report Generated</h3>
            <p className="text-neutral-600 max-w-md mx-auto mb-8">
              Select your report type and date filters above, then click the "Generate Report" button to view your financial statements.
            </p>
            <Button
              variant="primary"
              onClick={fetchReport}
              size="lg"
            >
              <BarChart3 size={18} className="mr-2" />
              Generate Report Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
