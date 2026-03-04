import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAccounts } from '../store/slices/accountSlice'
import { fetchJournalEntries } from '../store/slices/journalSlice'
import { fetchStudents } from '../store/slices/studentSlice'
import { fetchExpenses } from '../store/slices/expenseSlice'
import { fetchPayrolls } from '../store/slices/payrollSlice'
import { TrendingUp, TrendingDown, Users, DollarSign } from 'lucide-react'

export default function Dashboard() {
  const dispatch = useDispatch()
  const { accounts } = useSelector(state => state.accounts)
  const { entries } = useSelector(state => state.journals)
  const { students } = useSelector(state => state.students)
  const { expenses } = useSelector(state => state.expenses)
  const { payrolls } = useSelector(state => state.payroll)

  useEffect(() => {
    dispatch(fetchAccounts())
    dispatch(fetchJournalEntries())
    dispatch(fetchStudents())
    dispatch(fetchExpenses())
    dispatch(fetchPayrolls())
  }, [dispatch])

  const totalReceipts = entries
    .filter(e => e.transactionType === 'Fee Collection')
    .reduce((sum, e) => sum + (e.totalDebit || 0), 0)

  const totalPayments = expenses.reduce((sum, e) => sum + e.amount, 0)

  const pendingApprovals = [
    ...entries.filter(e => e.status === 'Pending'),
    ...expenses.filter(e => e.status === 'Pending'),
  ].length

  const stats = [
    {
      title: 'Total Receipts',
      value: `₹${totalReceipts.toFixed(2)}`,
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'Total Payments',
      value: `₹${totalPayments.toFixed(2)}`,
      icon: TrendingDown,
      color: 'bg-red-100 text-red-600',
    },
    {
      title: 'Active Students',
      value: students.filter(s => s.status === 'Active').length,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals,
      icon: DollarSign,
      color: 'bg-yellow-100 text-yellow-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="text-sm text-gray-600">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Journal Entries */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {entries.slice(0, 5).map((entry) => (
              <div key={entry._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{entry.description}</p>
                  <p className="text-sm text-gray-600">{new Date(entry.date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">₹{entry.totalDebit}</p>
                  <p className={`text-sm ${entry.status === 'Approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {entry.status}
                  </p>
                </div>
              </div>
            ))}
            {entries.length === 0 && (
              <p className="text-gray-600 text-center py-4">No transactions yet</p>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Expenses</h2>
          <div className="space-y-3">
            {expenses.slice(0, 5).map((expense) => (
              <div key={expense._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{expense.description}</p>
                  <p className="text-sm text-gray-600">{expense.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">₹{expense.amount.toFixed(2)}</p>
                  <p className={`text-sm ${expense.status === 'Approved' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {expense.status}
                  </p>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <p className="text-gray-600 text-center py-4">No expenses yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
