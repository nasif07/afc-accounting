import { Plus, Edit2, Trash2, Search, Loader, X, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  fetchReceipts,
  createReceipt,
  updateReceipt,
  deleteReceipt,
  approveReceipt,
  rejectReceipt,
  clearError,
  clearSuccess,
} from '../store/slices/receiptSlice';
import { fetchStudents } from '../store/slices/studentSlice';

const FEE_TYPES = ['tuition', 'exam', 'registration', 'activity', 'transport', 'hostel'];
const PAYMENT_MODES = ['bank', 'cheque', 'card', 'cash', 'online'];

export default function Receipts() {
  const dispatch = useDispatch();
  const { items, loading, error, success } = useSelector((state) => state.receipts);
  const { items: students } = useSelector((state) => state.students);
  const { user } = useSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    student: '',
    feeType: 'tuition',
    amount: '',
    paymentMode: 'bank',
    referenceNumber: '',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    cardNumber: '',
    transactionId: '',
    description: '',
  });

  useEffect(() => {
    dispatch(fetchReceipts());
    dispatch(fetchStudents());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(editingId ? 'Receipt updated successfully!' : 'Receipt created successfully!');
      dispatch(clearSuccess());
      setShowModal(false);
      resetForm();
      dispatch(fetchReceipts());
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
      student: '',
      feeType: 'tuition',
      amount: '',
      paymentMode: 'bank',
      referenceNumber: '',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      cardNumber: '',
      transactionId: '',
      description: '',
    });
    setEditingId(null);
  };

  const handleOpenModal = (receipt = null) => {
    if (receipt) {
      setFormData(receipt);
      setEditingId(receipt._id);
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
      [name]: name === 'amount' ? parseFloat(value) || '' : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      dispatch(updateReceipt({ id: editingId, data: formData }));
    } else {
      dispatch(createReceipt(formData));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this receipt?')) {
      dispatch(deleteReceipt(id));
      toast.success('Receipt deleted successfully!');
    }
  };

  const handleApprove = (id) => {
    if (window.confirm('Approve this receipt?')) {
      dispatch(approveReceipt(id));
      toast.success('Receipt approved!');
    }
  };

  const handleReject = (id) => {
    const reason = window.prompt('Enter rejection reason:');
    if (reason) {
      dispatch(rejectReceipt({ id, data: { rejectionReason: reason } }));
      toast.success('Receipt rejected!');
    }
  };

  const filteredReceipts = items.filter(
    (receipt) =>
      receipt.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.student?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fee Collection (Receipts)</h1>
          <p className="text-gray-600 mt-1">Manage student fee receipts and payments</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition"
        >
          <Plus size={20} /> Add Receipt
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by receipt number or student name..."
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

        {!loading && filteredReceipts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No receipts found. Create a new receipt to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Receipt #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Fee Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Mode</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((receipt) => (
                  <tr key={receipt._id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-900">{receipt.receiptNumber}</td>
                    <td className="py-3 px-4 text-gray-600">{receipt.student?.name || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-600 capitalize">{receipt.feeType}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">₹{receipt.amount}</td>
                    <td className="py-3 px-4 text-gray-600 capitalize">{receipt.paymentMode}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt.approvalStatus)}`}>
                        {receipt.approvalStatus || 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {receipt.approvalStatus === 'pending' && (
                          <>
                            <button onClick={() => handleOpenModal(receipt)} className="text-blue-600 hover:text-blue-700 transition" title="Edit">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(receipt._id)} className="text-red-600 hover:text-red-700 transition" title="Delete">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        {user?.role === 'director' && receipt.approvalStatus === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(receipt._id)} className="text-green-600 hover:text-green-700 transition" title="Approve">
                              <CheckCircle size={18} />
                            </button>
                            <button onClick={() => handleReject(receipt._id)} className="text-red-600 hover:text-red-700 transition" title="Reject">
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
                {editingId ? 'Edit Receipt' : 'Add New Receipt'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Student *</label>
                  <select
                    name="student"
                    value={formData.student}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student._id} value={student._id}>
                        {student.name} ({student.rollNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type *</label>
                  <select
                    name="feeType"
                    value={formData.feeType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {FEE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
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
                  {loading ? 'Saving...' : editingId ? 'Update Receipt' : 'Create Receipt'}
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
