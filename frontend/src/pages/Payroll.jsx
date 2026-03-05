import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPayrolls, createPayroll } from '../store/slices/payrollSlice'
import { Plus, Edit2, Trash2, Download, CheckCircle } from 'lucide-react'

export default function Payroll() {
  const dispatch = useDispatch()
  const { payrolls, isLoading } = useSelector(state => state.payroll)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    employeeId: '',
    employeeName: '',
    designation: '',
    salaryType: 'Fixed',
    baseSalary: 0,
    allowances: 0,
    deductions: 0,
    bonus: 0,
    leaveDeduction: 0,
    netSalary: 0,
    paymentMode: 'Bank',
    referenceNumber: '',
    notes: ''
  })

  useEffect(() => {
    dispatch(fetchPayrolls())
  }, [dispatch])

  const calculateNetSalary = () => {
    const gross = parseFloat(formData.baseSalary || 0) + parseFloat(formData.allowances || 0) + parseFloat(formData.bonus || 0)
    const total = gross - parseFloat(formData.deductions || 0) - parseFloat(formData.leaveDeduction || 0)
    return Math.max(0, total)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const netSalary = calculateNetSalary()
    dispatch(createPayroll({
      ...formData,
      netSalary,
      baseSalary: parseFloat(formData.baseSalary),
      allowances: parseFloat(formData.allowances),
      deductions: parseFloat(formData.deductions),
      bonus: parseFloat(formData.bonus),
      leaveDeduction: parseFloat(formData.leaveDeduction)
    }))
    setFormData({
      month: new Date().toISOString().slice(0, 7),
      employeeId: '',
      employeeName: '',
      designation: '',
      salaryType: 'Fixed',
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
      bonus: 0,
      leaveDeduction: 0,
      netSalary: 0,
      paymentMode: 'Bank',
      referenceNumber: '',
      notes: ''
    })
    setShowForm(false)
  }

  const totalPayroll = payrolls.reduce((sum, p) => sum + p.netSalary, 0)
  const processedCount = payrolls.filter(p => p.status === 'Processed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Payroll Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          New Payroll
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-600 text-sm">Total Payroll</p>
          <p className="text-2xl font-bold text-gray-800 mt-2">₹{totalPayroll.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm">Processed</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{processedCount}</p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{payrolls.length - processedCount}</p>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Create Payroll Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  placeholder="EMP-001"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  placeholder="Teacher / Staff"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary Type</label>
                <select
                  value={formData.salaryType}
                  onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}
                  className="form-select"
                >
                  <option>Fixed</option>
                  <option>Hourly</option>
                  <option>Per-Class</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium text-gray-800 mb-3">Salary Components</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.allowances}
                    onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bonus</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.bonus}
                    onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deductions</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.deductions}
                    onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Deduction</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.leaveDeduction}
                    onChange={(e) => setFormData({ ...formData, leaveDeduction: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Net Salary</p>
              <p className="text-3xl font-bold text-blue-600">₹{calculateNetSalary().toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="form-select"
              >
                <option>Bank</option>
                <option>Cheque</option>
                <option>Cash</option>
              </select>
              <input
                type="text"
                placeholder="Reference Number"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="form-input"
              />
            </div>

            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input"
              rows="2"
            />

            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">Create Payroll</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Month</th>
              <th>Employee</th>
              <th>Designation</th>
              <th>Base Salary</th>
              <th>Allowances</th>
              <th>Deductions</th>
              <th>Net Salary</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="9" className="text-center py-4">Loading...</td></tr>
            ) : payrolls.length > 0 ? (
              payrolls.map((payroll) => (
                <tr key={payroll._id}>
                  <td className="text-sm">{payroll.month}</td>
                  <td className="font-medium">{payroll.employeeName}</td>
                  <td className="text-sm">{payroll.designation}</td>
                  <td className="text-right font-mono">₹{payroll.baseSalary?.toFixed(2) || '0.00'}</td>
                  <td className="text-right font-mono">₹{payroll.allowances?.toFixed(2) || '0.00'}</td>
                  <td className="text-right font-mono">₹{payroll.deductions?.toFixed(2) || '0.00'}</td>
                  <td className="text-right font-mono font-bold">₹{payroll.netSalary?.toFixed(2) || '0.00'}</td>
                  <td>
                    {payroll.status === 'Processed' ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle size={16} /> Processed
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
              <tr><td colSpan="9" className="text-center py-4 text-gray-600">No payroll records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
