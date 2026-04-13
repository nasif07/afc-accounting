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
  BookOpen,
  Calendar,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import DynamicJournalForm from "../components/journal/DynamicJournalForm";
import SectionHeader from "../components/common/SectionHeader";

export default function JournalEntries() {
  const dispatch = useDispatch();
  const { entries, isLoading, error } = useSelector((state) => state.journals);

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    dispatch(fetchJournalEntries());
    dispatch(fetchAccounts());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    return entries.filter(
      (entry) =>
        entry.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.voucherNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [entries, searchTerm]);

  const handleFormSubmit = async (payload) => {
    let result;
    if (editingEntry) {
      result = await dispatch(
        updateJournalEntry({ id: editingEntry._id, ...payload }),
      );
    } else {
      result = await dispatch(createJournalEntry(payload));
    }

    if (result?.error) {
      toast.error(result.payload || "Operation failed");
    } else {
      toast.success(
        `Entry ${editingEntry ? "updated" : "created"} successfully`,
      );
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
    if (window.confirm("Are you sure you want to delete this entry?")) {
      const result = await dispatch(deleteJournalEntry(id));
      if (!result?.error) {
        toast.success("Entry deleted");
        dispatch(fetchJournalEntries());
      }
    }
  };

  const getStatusDisplay = (entry) => {
    const isApproved =
      entry.status === "posted" || entry.approvalStatus === "approved";
    const isRejected = entry.approvalStatus === "rejected";

    if (isApproved)
      return (
        <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
          <CheckCircle size={12} /> Approved
        </span>
      );
    if (isRejected)
      return (
        <span className="flex items-center gap-1.5 text-rose-600 font-bold text-[10px] uppercase tracking-wider">
          <XCircle size={12} /> Rejected
        </span>
      );
    return (
      <span className="px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-4 pb-10">
      <SectionHeader
        icon={BookOpen}
        title="Journal Entries"
        description="Financial transaction ledger"
        buttonText={"New Entry"}
        onButtonClick={() => setShowForm(true)}
        buttonIcon={Plus}
      />

      {showForm ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-tight">
              {editingEntry ? "Edit Entry" : "New Entry"}
            </h2>
            <button
              onClick={handleCloseForm}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
              <ArrowLeft size={18} className="text-slate-500" />
            </button>
          </div>
          <div className="p-4 md:p-8">
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
          {/* Search & Filters */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search description or voucher..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-slate-400 focus:ring-4 focus:ring-slate-50 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 text-sm font-medium transition-all">
              <Filter size={16} /> Filters
            </button>
          </div>

          {/* Responsive View Wrapper */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Desktop Table - Hidden on Mobile */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    {[
                      "Date",
                      "Voucher #",
                      "Description",
                      "Debit",
                      "Credit",
                      "Status",
                      "Actions",
                    ].map((head) => (
                      <th
                        key={head}
                        className={`px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${head.includes("Debit") || head.includes("Credit") ? "text-right" : ""}`}>
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry._id}
                      className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(
                          entry.voucherDate || entry.date,
                        ).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono font-bold text-blue-600 tracking-tighter">
                        {entry.voucherNumber || "---"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono font-medium text-slate-900">
                        {Number(entry.totalDebit || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono font-medium text-slate-900">
                        {Number(entry.totalCredit || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">{getStatusDisplay(entry)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-2 border border-slate-100 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all">
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry._id)}
                            className="p-2 border border-slate-100 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-100 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet Card View - Hidden on Desktop */}
            <div className="lg:hidden divide-y divide-slate-100">
              {filteredEntries.map((entry) => (
                <div key={entry._id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-blue-600 font-mono font-bold text-xs uppercase">
                        <Hash size={12} /> {entry.voucherNumber}
                      </div>
                      <div className="text-sm font-bold text-slate-900 leading-tight">
                        {entry.description}
                      </div>
                    </div>
                    {getStatusDisplay(entry)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-50">
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                        Debit
                      </div>
                      <div className="font-mono text-sm font-bold text-slate-800 tracking-tight">
                        ৳{Number(entry.totalDebit || 0).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                        Credit
                      </div>
                      <div className="font-mono text-sm font-bold text-slate-800 tracking-tight">
                        ৳{Number(entry.totalCredit || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Calendar size={12} />{" "}
                      {new Date(
                        entry.voucherDate || entry.date,
                      ).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase">
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry._id)}
                        className="px-3 py-1.5 border border-rose-100 text-rose-600 rounded-lg text-xs font-bold uppercase">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredEntries.length === 0 && !isLoading && (
              <div className="py-20 text-center text-slate-400 text-sm italic">
                No ledger entries found.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
