import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchExpenses, createExpense } from '../store/slices/expenseSlice'
import { Plus, Edit2, Trash2, Download, CheckCircle, XCircle } from 'lucide-react'

export default function Expenses() {
  const dispatch = useDispatch()
  const { expenses, isLoading } = useSelector(state => state.expenses)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    category: 'Operational',
    description: '',
    amount: 0,
    paymentMode: 'Bank',
    referenceNumber: '',
    billNumber: '',
    notes: '',
    status: 'Pending'
  })

  useEffect(() => {
    dispatch(fetchExpenses())
  }, [dispatch])

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(createExpense(formData))
    setFormData({
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      category: 'Operational',
      description: '',
      amount: 0,
      paymentMode: 'Bank',
      referenceNumber: '',
      billNumber: '',
      notes: '',
      status: 'Pending'
    })
    setShowForm(false)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingExpenses = expenses.filter(e => e.status === 'Pending').length
  const approvedExpenses = expenses.filter(e => e.status === 'Approved').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Expenses</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-600 text-sm">Total Expenses</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">₹{totalExpenses.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{pendingExpenses}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm">Approved</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{approvedExpenses}</p>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Record New Expense</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  placeholder="Vendor Name"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-select"
                >
                  <option>Operational</option>
                  <option>Maintenance</option>
                  <option>Utilities</option>
                  <option>Supplies</option>
                  <option>Petty Cash</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  className="form-select"
                >
                  <option>Bank</option>
                  <option>Cheque</option>
                  <option>Card</option>
                  <option>Cash</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference #</label>
                <input
                  type="text"
                  placeholder="Transaction ID"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                placeholder="Expense description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                rows="2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
              <input
                type="text"
                placeholder="Invoice/Bill Number"
                value={formData.billNumber}
                onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input"
                rows="2"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Record Expense</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
            ) : expenses.length > 0 ? (
              expenses.map((expense) => (
                <tr key={expense._id}>
                  <td className="text-sm">{new Date(expense.date).toLocaleDateString()}</td>
                  <td className="font-medium">{expense.vendor}</td>
                  <td><span className="badge badge-info text-xs">{expense.category}</span></td>
                  <td className="text-sm">{expense.description}</td>
                  <td className="text-right font-mono">₹{expense.amount.toFixed(2)}</td>
                  <td className="text-sm">{expense.paymentMode}</td>
                  <td>
                    {expense.status === 'Approved' ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle size={16} /> Approved
                      </span>
                    ) : expense.status === 'Rejected' ? (
                      <span className="flex items-center gap-1 text-red-600 text-sm">
                        <XCircle size={16} /> Rejected
                      </span>
                    ) : (
                      <span className="badge badge-warning text-xs">Pending</span>
                    )}
                  </td>
                  <td className="flex gap-2">
                    <button className="btn btn-sm btn-secondary"><Edit2 size={16} /></button>
                    <button className="btn btn-sm btn-danger"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="8" className="text-center py-4 text-gray-600">No expenses found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
