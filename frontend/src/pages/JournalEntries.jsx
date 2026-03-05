import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchJournalEntries, createJournalEntry } from '../store/slices/journalSlice'
import { fetchAccounts } from '../store/slices/accountSlice'
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react'

export default function JournalEntries() {
  const dispatch = useDispatch()
  const { entries, isLoading } = useSelector(state => state.journals)
  const { accounts } = useSelector(state => state.accounts)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    referenceNumber: '',
    transactionType: 'General',
    entries: [
      { accountId: '', debit: 0, credit: 0 },
      { accountId: '', debit: 0, credit: 0 }
    ]
  })

  useEffect(() => {
    dispatch(fetchJournalEntries())
    dispatch(fetchAccounts())
  }, [dispatch])

  const handleAddEntry = () => {
    setFormData({
      ...formData,
      entries: [...formData.entries, { accountId: '', debit: 0, credit: 0 }]
    })
  }

  const handleRemoveEntry = (index) => {
    setFormData({
      ...formData,
      entries: formData.entries.filter((_, i) => i !== index)
    })
  }

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...formData.entries]
    newEntries[index] = { ...newEntries[index], [field]: value }
    setFormData({ ...formData, entries: newEntries })
  }

  const calculateTotalDebit = () => formData.entries.reduce((sum, e) => sum + parseFloat(e.debit || 0), 0)
  const calculateTotalCredit = () => formData.entries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0)

  const isBalanced = Math.abs(calculateTotalDebit() - calculateTotalCredit()) < 0.01

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!isBalanced) {
      alert('Journal entry is not balanced. Debits must equal credits.')
      return
    }
    dispatch(createJournalEntry({
      ...formData,
      totalDebit: calculateTotalDebit(),
      totalCredit: calculateTotalCredit()
    }))
    setFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      referenceNumber: '',
      transactionType: 'General',
      entries: [
        { accountId: '', debit: 0, credit: 0 },
        { accountId: '', debit: 0, credit: 0 }
      ]
    })
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Journal Entries</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Entry
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Create Journal Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference #</label>
                <input
                  type="text"
                  placeholder="JE-001"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.transactionType}
                  onChange={(e) => setFormData({ ...formData, transactionType: e.target.value })}
                  className="form-select"
                >
                  <option>General</option>
                  <option>Fee Collection</option>
                  <option>Expense</option>
                  <option>Payroll</option>
                  <option>Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter transaction description"
                className="form-input"
                rows="2"
                required
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-800 mb-3">Entry Lines</h3>
              <div className="space-y-3">
                {formData.entries.map((entry, index) => (
                  <div key={index} className="grid grid-cols-5 gap-2 items-end">
                    <select
                      value={entry.accountId}
                      onChange={(e) => handleEntryChange(index, 'accountId', e.target.value)}
                      className="form-select"
                      required
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc._id} value={acc._id}>{acc.code} - {acc.name}</option>
                      ))}
                    </select>
                    <div>
                      <label className="text-xs text-gray-600">Debit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.debit}
                        onChange={(e) => handleEntryChange(index, 'debit', e.target.value)}
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Credit</label>
                      <input
                        type="number"
                        step="0.01"
                        value={entry.credit}
                        onChange={(e) => handleEntryChange(index, 'credit', e.target.value)}
                        className="form-input"
                        placeholder="0.00"
                      />
                    </div>
                    <div></div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      className="btn btn-danger text-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddEntry}
                className="mt-3 btn btn-secondary text-sm"
              >
                <Plus size={16} /> Add Line
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Debit</p>
                  <p className="text-2xl font-bold text-gray-800">₹{calculateTotalDebit().toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Credit</p>
                  <p className="text-2xl font-bold text-gray-800">₹{calculateTotalCredit().toFixed(2)}</p>
                </div>
              </div>
              <div className={`mt-3 p-2 rounded text-sm font-medium ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {isBalanced ? '✓ Entry is balanced' : '✗ Entry is not balanced'}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={!isBalanced} className="btn btn-primary">Create Entry</button>
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
              <th>Ref #</th>
              <th>Description</th>
              <th>Type</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
            ) : entries.length > 0 ? (
              entries.map((entry) => (
                <tr key={entry._id}>
                  <td className="text-sm">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="font-mono text-sm">{entry.referenceNumber}</td>
                  <td className="text-sm">{entry.description}</td>
                  <td><span className="badge badge-info text-xs">{entry.transactionType}</span></td>
                  <td className="text-right font-mono">₹{entry.totalDebit?.toFixed(2) || '0.00'}</td>
                  <td className="text-right font-mono">₹{entry.totalCredit?.toFixed(2) || '0.00'}</td>
                  <td>
                    {entry.status === 'Approved' ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle size={16} /> Approved
                      </span>
                    ) : entry.status === 'Rejected' ? (
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
              <tr><td colSpan="8" className="text-center py-4 text-gray-600">No entries found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
