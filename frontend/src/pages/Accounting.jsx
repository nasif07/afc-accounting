import { Plus, Edit2, Trash2, Search, Loader, X, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchAccounting, createAccounting, updateAccounting, deleteAccounting, approveAccounting, rejectAccounting, clearError, clearSuccess } from '../store/slices/accountingSlice';
import { fetchCoa } from '../store/slices/coaSlice';

export default function Accounting() {
  const dispatch = useDispatch();
  const { items, loading, error, success } = useSelector((state) => state.accounting);
  const { items: accounts } = useSelector((state) => state.coa);
  const { user } = useSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    voucherNumber: '',
    transactionType: 'journal',
    debitAccount: '',
    creditAccount: '',
    amount: '',
    description: '',
    referenceNumber: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    dispatch(fetchAccounting());
    dispatch(fetchCoa());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(editingId ? 'Entry updated!' : 'Entry created!');
      dispatch(clearSuccess());
      setShowModal(false);
      dispatch(fetchAccounting());
    }
  }, [success, dispatch, editingId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleOpenModal = (entry = null) => {
    if (entry) setFormData(entry);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      voucherNumber: '',
      transactionType: 'journal',
      debitAccount: '',
      creditAccount: '',
      amount: '',
      description: '',
      referenceNumber: '',
      transactionDate: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || '' : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingId) {
      dispatch(updateAccounting({ id: editingId, data: formData }));
    } else {
      dispatch(createAccounting(formData));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this entry?')) {
      dispatch(deleteAccounting(id));
      toast.success('Entry deleted!');
    }
  };

  const filteredEntries = items.filter((entry) =>
    entry.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-gray-600 mt-1">Manage accounting journal entries</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition">
          <Plus size={20} /> Add Entry
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin text-blue-600" size={32} />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No entries found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold">Voucher #</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                  <th className="text-left py-3 px-4 font-semibold">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{entry.voucherNumber}</td>
                    <td className="py-3 px-4">{entry.description}</td>
                    <td className="py-3 px-4 font-semibold">₹{entry.amount}</td>
                    <td className="py-3 px-4"><span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs">{entry.approvalStatus || 'Pending'}</span></td>
                    <td className="py-3 px-4 flex gap-2">
                      <button onClick={() => handleOpenModal(entry)} className="text-blue-600 hover:text-blue-700"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(entry._id)} className="text-red-600 hover:text-red-700"><Trash2 size={18} /></button>
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
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">{editingId ? 'Edit' : 'Add'} Entry</h2>
              <button onClick={handleCloseModal} className="text-gray-500"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="voucherNumber" value={formData.voucherNumber} onChange={handleChange} placeholder="Voucher Number" required className="px-4 py-2 border rounded-lg" />
                <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="Amount" required step="0.01" className="px-4 py-2 border rounded-lg" />
                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Description" rows="3" className="md:col-span-2 px-4 py-2 border rounded-lg" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg">
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button type="button" onClick={handleCloseModal} className="flex-1 bg-gray-200 py-2 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
