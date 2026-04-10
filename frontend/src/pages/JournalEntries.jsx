import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchJournalEntries,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  clearError,
} from "../store/slices/journalSlice";
import { fetchAccounts } from "../store/slices/accountSlice";
import {
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import DynamicJournalForm from "../components/journal/DynamicJournalForm";

export default function JournalEntries() {
  const dispatch = useDispatch();
  const { entries, isLoading, error } = useSelector((state) => state.journals);
  
  // State for UI management
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Load data on mount
  useEffect(() => {
    dispatch(fetchJournalEntries());
    dispatch(fetchAccounts());
  }, [dispatch]);

  // Error Handling
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Filtered Entries for Search
  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(entry => 
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [entries, searchTerm]);

  // Handle Create or Update
  const handleFormSubmit = async (payload) => {
    let result;
    if (editingEntry) {
      result = await dispatch(updateJournalEntry({ id: editingEntry._id, ...payload }));
    } else {
      result = await dispatch(createJournalEntry(payload));
    }

    if (result?.error) {
      toast.error(result.payload || "Operation failed");
    } else {
      toast.success(`Entry ${editingEntry ? "updated" : "created"} successfully`);
      handleCloseForm();
      dispatch(fetchJournalEntries());
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      const result = await dispatch(deleteJournalEntry(id));
      if (!result?.error) {
        toast.success("Entry deleted");
        dispatch(fetchJournalEntries());
      }
    }
  };

  const getTransactionTypeLabel = (type) => {
    const types = {
      'receipt': 'Receipt',
      'payment': 'Payment',
      'journal-entry': 'Journal Entry',
      'transfer': 'Transfer'
    };
    return types[type] || type;
  };

  const getStatusDisplay = (entry) => {
    const isApproved = entry.status === "posted" || entry.approvalStatus === "approved";
    const isRejected = entry.approvalStatus === "rejected";

    if (isApproved) return (
      <span className="flex items-center gap-1 text-green-600 font-medium text-xs">
        <CheckCircle size={14} /> Approved
      </span>
    );
    if (isRejected) return (
      <span className="flex items-center gap-1 text-red-600 font-medium text-xs">
        <XCircle size={14} /> Rejected
      </span>
    );
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-sm text-gray-500">Record and monitor your financial transactions</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
          >
            <Plus size={18} />
            New Entry
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-semibold text-gray-700">
              {editingEntry ? "Edit Journal Entry" : "Create New Journal Entry"}
            </h2>
            <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={20} />
            </button>
          </div>
          <div className="p-6">
            <DynamicJournalForm 
              initialData={editingEntry} 
              onSubmit={handleFormSubmit}
              onCancel={handleCloseForm}
              isLoading={isLoading}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Filters/Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by description or voucher #..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-600">
              <Filter size={18} />
              Filters
            </button>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Voucher #</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Debit (৳)</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Credit (৳)</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan="8" className="px-6 py-6 border-b"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                      </tr>
                    ))
                  ) : filteredEntries.length > 0 ? (
                    filteredEntries.map((entry) => (
                      <tr key={entry._id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(entry.voucherDate || entry.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono font-medium text-blue-700">
                          {entry.voucherNumber || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] px-2 py-1 rounded-md bg-gray-100 text-gray-600 font-semibold uppercase">
                            {getTransactionTypeLabel(entry.transactionType)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-mono">
                          {Number(entry.totalDebit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-mono">
                          {Number(entry.totalCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">{getStatusDisplay(entry)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-3">
                            <button 
                              onClick={() => handleEdit(entry)}
                              className="text-gray-400 hover:text-blue-600 transition"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(entry._id)}
                              className="text-gray-400 hover:text-red-600 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                        No entries found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}