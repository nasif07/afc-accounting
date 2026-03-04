import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAccounts, createAccount } from '../store/slices/accountSlice'
import { Plus } from 'lucide-react'
import { useState } from 'react'

export default function Accounts() {
  const dispatch = useDispatch()
  const { accounts, isLoading } = useSelector(state => state.accounts)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Asset',
    description: '',
    openingBalance: 0,
  })

  useEffect(() => {
    dispatch(fetchAccounts())
  }, [dispatch])

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(createAccount(formData))
    setFormData({ code: '', name: '', type: 'Asset', description: '', openingBalance: 0 })
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Chart of Accounts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Account
        </button>
      </div>

      {showForm && (
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Account Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="Account Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="form-select"
            >
              <option>Asset</option>
              <option>Liability</option>
              <option>Equity</option>
              <option>Income</option>
              <option>Expense</option>
            </select>
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input"
            />
            <input
              type="number"
              placeholder="Opening Balance"
              value={formData.openingBalance}
              onChange={(e) => setFormData({ ...formData, openingBalance: parseFloat(e.target.value) })}
              className="form-input"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Create Account</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Type</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="5" className="text-center py-4">Loading...</td></tr>
            ) : accounts.length > 0 ? (
              accounts.map((account) => (
                <tr key={account._id}>
                  <td className="font-mono text-sm">{account.code}</td>
                  <td>{account.name}</td>
                  <td><span className="badge badge-info">{account.type}</span></td>
                  <td>₹{account.currentBalance.toFixed(2)}</td>
                  <td><span className="badge badge-success">{account.status}</span></td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="text-center py-4 text-gray-600">No accounts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
