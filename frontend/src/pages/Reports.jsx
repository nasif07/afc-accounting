import { Download, Filter, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchReports, clearError } from '../store/slices/reportSlice';

const REPORT_TYPES = [
  { id: 'income_statement', name: 'Income Statement', description: 'Profit & Loss Report' },
  { id: 'balance_sheet', name: 'Balance Sheet', description: 'Assets, Liabilities & Equity' },
  { id: 'cash_flow', name: 'Cash Flow', description: 'Cash inflows and outflows' },
  { id: 'trial_balance', name: 'Trial Balance', description: 'All accounts with balances' },
  { id: 'receipt_payment', name: 'Receipt & Payment', description: 'Fee collection report' },
];

export default function Reports() {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector((state) => state.reports);
  const [selectedReport, setSelectedReport] = useState('income_statement');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleGenerateReport = () => {
    dispatch(fetchReports({ reportType: selectedReport, ...dateRange }));
  };

  const handleDownload = (format) => {
    toast.success(`Report downloaded as ${format.toUpperCase()}`);
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-gray-600 mt-1">Generate and view financial reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map((report) => (
          <div
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`p-4 rounded-lg cursor-pointer transition ${
              selectedReport === report.id
                ? 'bg-blue-100 border-2 border-blue-600'
                : 'bg-white border border-gray-200 hover:border-blue-400'
            }`}
          >
            <h3 className="font-semibold text-gray-900">{report.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{report.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Report Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="animate-spin" size={20} /> : <Filter size={20} />}
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Report Data</h2>
            <div className="flex gap-2">
              <button onClick={() => handleDownload('pdf')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Download size={18} /> PDF
              </button>
              <button onClick={() => handleDownload('excel')} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                <Download size={18} /> Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold">Account</th>
                  <th className="text-right py-3 px-4 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4">{item.name}</td>
                    <td className="py-3 px-4 text-right font-semibold">₹{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
