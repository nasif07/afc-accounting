import { Plus, Edit2, Trash2, Search, Loader, X, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  fetchPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
  approvePayroll,
  rejectPayroll,
  clearError,
  clearSuccess,
} from '../store/slices/payrollSlice';
import { fetchEmployees } from '../store/slices/employeeSlice';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SALARY_TYPES = ['monthly', 'contract', 'hourly'];

export default function Payroll() {
  const dispatch = useDispatch();
  const { items, loading, error, success } = useSelector((state) => state.payroll);
  const { items: employees } = useSelector((state) => state.employees);
  const { user } = useSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    employee: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    salaryType: 'monthly',
    baseSalary: '',
    allowances: 0,
    deductions: 0,
    notes: '',
  });

  useEffect(() => {
    dispatch(fetchPayroll());
    dispatch(fetchEmployees());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(editingId ? 'Payroll updated successfully!' : 'Payroll created successfully!');
      dispatch(clearSuccess());
      setShowModal(false);
      resetForm();
      dispatch(fetchPayroll());
    }
  }, [success, dispatch, editingId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const resetForm = () => {
    setFormData({
      employee: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      salaryType: 'monthly',
      baseSalary: '',
      allowances: 0,
      deductions: 0,
      notes: '',
    });
    setEditingId(null);
  };

  const handleOpenModal = (payroll = null) => {
    if (payroll) {
      setFormData(payroll);
      setEditingId(payroll._id);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['baseSalary', 'allowances', 'deductions', 'month', 'year'].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      dispatch(updatePayroll({ id: editingId, data: formData }));
    } else {
      dispatch(createPayroll(formData));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this payroll?')) {
      dispatch(deletePayroll(id));
      toast.success('Payroll deleted successfully!');
    }
  };

  const handleApprove = (id) => {
    if (window.confirm('Approve this payroll?')) {
      dispatch(approvePayroll(id));
      toast.success('Payroll approved!');
    }
  };

  const handleReject = (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason) {
      dispatch(rejectPayroll({ id, data: { rejectionReason: reason } }));
      toast.success('Payroll rejected!');
    }
  };

  const filteredPayroll = items.filter((p) =>
    p.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.employee?.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const calculateNetSalary = (base, allowances, deductions) => {
    return (base || 0) + (allowances || 0) - (deductions || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Manage employee payroll and salaries</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} /> Add Payroll
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by employee name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        )}

        {!loading && filteredPayroll.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No payroll records found. Create a new payroll to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Employee</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Month/Year</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Base Salary</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Allowances</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Deductions</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Net Salary</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.map((payroll) => (
                  <tr key={payroll._id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-900">{payroll.employee?.name}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {MONTHS[payroll.month - 1]} {payroll.year}
                    </td>
                    <td className="py-3 px-4 text-gray-600">৳{payroll.baseSalary}</td>
                    <td className="py-3 px-4 text-gray-600">৳{payroll.allowances}</td>
                    <td className="py-3 px-4 text-gray-600">৳{payroll.deductions}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ৳{calculateNetSalary(payroll.baseSalary, payroll.allowances, payroll.deductions)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(payroll.approvalStatus)}`}>
                        {payroll.approvalStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {payroll.approvalStatus === 'pending' && (
                          <>
                            <button onClick={() => handleOpenModal(payroll)} className="text-blue-600 hover:text-blue-700 transition">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(payroll._id)} className="text-red-600 hover:text-red-700 transition">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        {user?.role === 'director' && payroll.approvalStatus === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(payroll._id)} className="text-green-600 hover:text-green-700 transition">
                              <CheckCircle size={18} />
                            </button>
                            <button onClick={() => handleReject(payroll._id)} className="text-red-600 hover:text-red-700 transition">
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? 'Edit Payroll' : 'Add New Payroll'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee *</label>
                  <select
                    name="employee"
                    value={formData.employee}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select an employee</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Salary Type *</label>
                  <select
                    name="salaryType"
                    value={formData.salaryType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {SALARY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Month *</label>
                  <select
                    name="month"
                    value={formData.month}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {MONTHS.map((month, index) => (
                      <option key={index} value={index + 1}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Salary *</label>
                  <input
                    type="number"
                    name="baseSalary"
                    value={formData.baseSalary}
                    onChange={handleChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allowances</label>
                  <input
                    type="number"
                    name="allowances"
                    value={formData.allowances}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deductions</label>
                  <input
                    type="number"
                    name="deductions"
                    value={formData.deductions}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
                >
                  {loading ? <Loader className="animate-spin" size={20} /> : null}
                  {loading ? 'Saving...' : editingId ? 'Update Payroll' : 'Create Payroll'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
