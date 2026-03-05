import { useState } from 'react'
import { Download, FileText, BarChart3 } from 'lucide-react'

export default function Reports() {
  const [reportType, setReportType] = useState('income-statement')
  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0])
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0])

  const handleGenerateReport = () => {
    console.log(`Generating ${reportType} from ${fromDate} to ${toDate}`)
    // Report generation logic would go here
  }

  const handleExport = (format) => {
    console.log(`Exporting as ${format}`)
    // Export logic would go here
  }

  const sampleReportData = {
    'income-statement': {
      title: 'Income Statement',
      subtitle: 'For the period from ' + fromDate + ' to ' + toDate,
      sections: [
        {
          name: 'Income',
          items: [
            { label: 'Tuition Fees', value: 500000 },
            { label: 'Exam Fees', value: 50000 },
            { label: 'Registration Fees', value: 25000 },
            { label: 'Other Income', value: 15000 }
          ]
        },
        {
          name: 'Expenses',
          items: [
            { label: 'Salaries & Wages', value: 300000 },
            { label: 'Utilities', value: 30000 },
            { label: 'Maintenance', value: 20000 },
            { label: 'Supplies', value: 15000 }
          ]
        }
      ]
    },
    'balance-sheet': {
      title: 'Balance Sheet',
      subtitle: 'As on ' + toDate,
      sections: [
        {
          name: 'Assets',
          items: [
            { label: 'Cash & Bank', value: 250000 },
            { label: 'Accounts Receivable', value: 100000 },
            { label: 'Fixed Assets', value: 500000 }
          ]
        },
        {
          name: 'Liabilities',
          items: [
            { label: 'Accounts Payable', value: 50000 },
            { label: 'Loans', value: 100000 }
          ]
        },
        {
          name: 'Equity',
          items: [
            { label: 'Capital', value: 700000 }
          ]
        }
      ]
    },
    'cash-flow': {
      title: 'Cash Flow Statement',
      subtitle: 'For the period from ' + fromDate + ' to ' + toDate,
      sections: [
        {
          name: 'Operating Activities',
          items: [
            { label: 'Cash from Fees', value: 550000 },
            { label: 'Cash Paid for Expenses', value: -365000 }
          ]
        },
        {
          name: 'Investing Activities',
          items: [
            { label: 'Purchase of Assets', value: -50000 }
          ]
        },
        {
          name: 'Financing Activities',
          items: [
            { label: 'Loan Repayment', value: -20000 }
          ]
        }
      ]
    }
  }

  const currentReport = sampleReportData[reportType]

  const calculateTotal = (items) => items.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Financial Reports</h1>

      {/* Report Selection */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Generate Report</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setReportType('income-statement')}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === 'income-statement'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="mx-auto mb-2 text-blue-600" size={24} />
              <p className="font-medium">Income Statement</p>
              <p className="text-xs text-gray-600">P&L Report</p>
            </button>
            <button
              onClick={() => setReportType('balance-sheet')}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === 'balance-sheet'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className="mx-auto mb-2 text-blue-600" size={24} />
              <p className="font-medium">Balance Sheet</p>
              <p className="text-xs text-gray-600">Assets & Liabilities</p>
            </button>
            <button
              onClick={() => setReportType('cash-flow')}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === 'cash-flow'
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="mx-auto mb-2 text-blue-600" size={24} />
              <p className="font-medium">Cash Flow</p>
              <p className="text-xs text-gray-600">Cash Movement</p>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                className="btn btn-primary w-full"
              >
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Display */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{currentReport.title}</h2>
            <p className="text-sm text-gray-600">{currentReport.subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('pdf')}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              PDF
            </button>
            <button
              onClick={() => handleExport('excel')}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Excel
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {currentReport.sections.map((section, idx) => (
            <div key={idx}>
              <h3 className="font-bold text-gray-800 mb-3 text-lg">{section.name}</h3>
              <table className="w-full">
                <tbody>
                  {section.items.map((item, itemIdx) => (
                    <tr key={itemIdx} className="border-b">
                      <td className="py-2 text-gray-700">{item.label}</td>
                      <td className="py-2 text-right font-mono">₹{item.value.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-50">
                    <td className="py-2 text-gray-800">{section.name} Total</td>
                    <td className="py-2 text-right font-mono">₹{calculateTotal(section.items).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}

          <div className="border-t-2 pt-4 mt-6">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-gray-800">Net Result</p>
              <p className="text-2xl font-bold text-blue-600">
                ₹{currentReport.sections.reduce((sum, section) => sum + calculateTotal(section.items), 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reports */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">Receipt & Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Receipts</span>
              <span className="font-mono font-bold">₹590,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Payments</span>
              <span className="font-mono font-bold">₹365,000</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-800 font-medium">Net Cash</span>
              <span className="font-mono font-bold text-green-600">₹225,000</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-800 mb-4">Head-wise Income</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Tuition Fees</span>
              <span className="font-mono font-bold">₹500,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Exam Fees</span>
              <span className="font-mono font-bold">₹50,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Other Income</span>
              <span className="font-mono font-bold">₹40,000</span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-800 font-medium">Total Income</span>
              <span className="font-mono font-bold text-blue-600">₹590,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
