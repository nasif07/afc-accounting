import { BarChart3, TrendingUp, Users, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';

export default function Dashboard() {
  const { user } = useSelector((state) => state.auth);

  const stats = [
    { label: 'Total Receipts', value: '₹0', icon: DollarSign, color: 'bg-blue-500', lightColor: 'bg-blue-50' },
    { label: 'Total Expenses', value: '₹0', icon: BarChart3, color: 'bg-red-500', lightColor: 'bg-red-50' },
    { label: 'Students', value: '0', icon: Users, color: 'bg-green-500', lightColor: 'bg-green-50' },
    { label: 'Pending Approvals', value: '0', icon: AlertCircle, color: 'bg-yellow-500', lightColor: 'bg-yellow-50' },
  ];

  const recentTransactions = [
    { id: 1, type: 'Receipt', description: 'Fee Collection', amount: '₹5000', date: 'Today', status: 'Approved' },
    { id: 2, type: 'Expense', description: 'Office Supplies', amount: '₹2000', date: 'Yesterday', status: 'Pending' },
    { id: 3, type: 'Payroll', description: 'Staff Salary', amount: '₹50000', date: '2 days ago', status: 'Approved' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user?.name || 'User'}!</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition">
          Generate Report
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.lightColor} p-4 rounded-lg`}>
                <stat.icon className={`${stat.color.replace('bg-', 'text-')}`} size={28} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Transactions</h2>
            <a href="#" className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Description</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {transaction.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{transaction.description}</td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900">{transaction.amount}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{transaction.date}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'Approved' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition text-sm font-medium">
                Add Receipt
              </button>
              <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition text-sm font-medium">
                Add Expense
              </button>
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition text-sm font-medium">
                Add Student
              </button>
              <button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg transition text-sm font-medium">
                Process Payroll
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Server</span>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Running
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Backup</span>
                <span className="text-xs text-gray-600">Today at 10:30 AM</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
