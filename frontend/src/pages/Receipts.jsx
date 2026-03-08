import { Plus, Download, Eye } from 'lucide-react';
import { useState } from 'react';

export default function Receipts() {
  const [receipts] = useState([
    { id: 1, student: 'John Doe', amount: '₹5000', date: '2024-01-15', type: 'Tuition', status: 'Approved' },
    { id: 2, student: 'Jane Smith', amount: '₹3000', date: '2024-01-14', type: 'Exam', status: 'Approved' },
    { id: 3, student: 'Bob Johnson', amount: '₹2000', date: '2024-01-13', type: 'Registration', status: 'Pending' },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Collection</h1>
          <p className="text-gray-600 mt-1">Manage student fee receipts and payments</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition">
          <Plus size={20} /> New Receipt
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Total Receipts</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">₹10,000</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">₹2,000</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-gray-600 text-sm">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-2">₹8,000</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Student</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((receipt) => (
                <tr key={receipt.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{receipt.student}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-900">{receipt.amount}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{receipt.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{receipt.type}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      receipt.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {receipt.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-700 transition">
                        <Eye size={18} />
                      </button>
                      <button className="text-green-600 hover:text-green-700 transition">
                        <Download size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
