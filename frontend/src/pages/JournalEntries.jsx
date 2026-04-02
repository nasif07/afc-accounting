import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchJournalEntries,
  createJournalEntry,
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
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function JournalEntries() {
  const dispatch = useDispatch();
  const { entries, isLoading, error } = useSelector((state) => state.journals);
  const { accounts } = useSelector((state) => state.accounts);

  const initialFormState = {
    voucherDate: new Date().toISOString().split("T")[0],
    description: "",
    voucherNumber: "",
    transactionType: "journal-entry",
    bookEntries: [
      { account: "", debit: 0, credit: 0 },
      { account: "", debit: 0, credit: 0 },
    ],
  };

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormState);

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

  const leafAccounts = useMemo(() => {
    if (!Array.isArray(accounts)) return [];

    // The backend now provides a leaf-nodes endpoint, but for local filtering:
    // We check if an account is a parent by looking at other accounts' parentAccount field
    const parentIds = new Set(
      accounts
        .map((acc) => acc.parentAccount?._id || acc.parentAccount)
        .filter(Boolean)
        .map((id) => id.toString())
    );

    return accounts.filter(
      (acc) =>
        !parentIds.has(acc._id.toString()) &&
        acc.status === "active" &&
        acc.isActive !== false &&
        !acc.deletedAt,
    );
  }, [accounts]);

  const handleAddEntry = () => {
    if (formData.bookEntries.length >= 10) {
      toast.error("Maximum 10 line items allowed");
      return;
    }

    setFormData({
      ...formData,
      bookEntries: [
        ...formData.bookEntries,
        { account: "", debit: 0, credit: 0 },
      ],
    });
  };

  const handleRemoveEntry = (index) => {
    if (formData.bookEntries.length <= 2) {
      toast.error("Minimum 2 line items required");
      return;
    }

    setFormData({
      ...formData,
      bookEntries: formData.bookEntries.filter((_, i) => i !== index),
    });
  };

  const handleEntryChange = (index, field, value) => {
    const newEntries = [...formData.bookEntries];
    const currentEntry = { ...newEntries[index] };

    if (field === "debit") {
      currentEntry.debit = value;
      if (value > 0) currentEntry.credit = 0;
    } else if (field === "credit") {
      currentEntry.credit = value;
      if (value > 0) currentEntry.debit = 0;
    } else {
      currentEntry[field] = value;
    }

    newEntries[index] = currentEntry;
    setFormData({ ...formData, bookEntries: newEntries });
  };

  const calculateTotalDebit = () =>
    formData.bookEntries.reduce((sum, e) => sum + parseFloat(e.debit || 0), 0);

  const calculateTotalCredit = () =>
    formData.bookEntries.reduce((sum, e) => sum + parseFloat(e.credit || 0), 0);

  const totalDebit = calculateTotalDebit();
  const totalCredit = calculateTotalCredit();

  const isBalanced = Math.abs(totalDebit - totalCredit) <= 0.01;
  const hasValidAccounts = formData.bookEntries.every((e) => e.account);
  const hasValidAmounts = formData.bookEntries.every(
    (e) => (e.debit > 0 || e.credit > 0) && !(e.debit > 0 && e.credit > 0),
  );

  const canSubmit =
    isBalanced &&
    hasValidAccounts &&
    hasValidAmounts &&
    formData.bookEntries.length >= 2 &&
    !!formData.description.trim();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!canSubmit) {
      if (!isBalanced) {
        toast.error(
          "Journal entry is not balanced. Debits must equal credits.",
        );
      } else if (!hasValidAccounts) {
        toast.error("All line items must have an account selected");
      } else if (!hasValidAmounts) {
        toast.error("Each line must have either debit or credit, not both");
      } else {
        toast.error("Please complete the journal entry correctly");
      }
      return;
    }

    const payload = {
      voucherDate: formData.voucherDate,
      description: formData.description.trim(),
      transactionType: formData.transactionType,
      bookEntries: formData.bookEntries.map((entry) => ({
        account: entry.account,
        debit: parseFloat(entry.debit || 0),
        credit: parseFloat(entry.credit || 0),
      })),
    };

    if (formData.voucherNumber?.trim()) {
      payload.voucherNumber = formData.voucherNumber.trim();
    }

    const result = await dispatch(createJournalEntry(payload));

    if (result?.error) {
      toast.error(result.payload || "Failed to create journal entry");
      return;
    }

    toast.success("Journal entry created successfully");
    setFormData(initialFormState);
    setShowForm(false);
    dispatch(fetchJournalEntries());
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this journal entry?");
    if (!confirmed) return;

    const result = await dispatch(deleteJournalEntry(id));

    if (result?.error) {
      toast.error(result.payload || "Failed to delete journal entry");
      return;
    }

    toast.success("Journal entry deleted successfully");
    dispatch(fetchJournalEntries());
  };

  const handleReset = () => {
    setFormData(initialFormState);
    setShowForm(false);
  };

  const getTransactionTypeLabel = (type) => {
    switch (type) {
      case "receipt":
        return "Receipt";
      case "payment":
        return "Payment";
      case "journal-entry":
        return "Journal Entry";
      case "transfer":
        return "Transfer";
      default:
        return type || "-";
    }
  };

  const getStatusDisplay = (entry) => {
    if (entry.status === "posted" || entry.approvalStatus === "approved") {
      return (
        <span className="flex items-center gap-1 text-green-600 font-medium">
          <CheckCircle size={16} /> Approved
        </span>
      );
    }

    if (entry.approvalStatus === "rejected") {
      return (
        <span className="flex items-center gap-1 text-red-600 font-medium">
          <XCircle size={16} /> Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journal Entries</h1>
          <p className="text-gray-600 mt-1">
            Create and manage journal entries with double-entry validation
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus size={20} />
          New Entry
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <DynamicJournalForm 
            onSubmit={async (payload) => {
              const result = await dispatch(createJournalEntry(payload));
              if (result?.error) {
                toast.error(result.payload || "Failed to create journal entry");
                return;
              }
              toast.success("Journal entry created successfully");
              setShowForm(false);
              dispatch(fetchJournalEntries());
            }}
            onCancel={() => setShowForm(false)}
            isLoading={isLoading}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Voucher #
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Debit
                </th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                  Credit
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : entries && entries.length > 0 ? (
                entries.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(
                        entry.voucherDate || entry.date,
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      {entry.voucherNumber || entry.referenceNumber}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900">
                      {entry.description}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getTransactionTypeLabel(entry.transactionType)}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-right font-mono text-gray-900">
                      ৳{Number(entry.totalDebit || 0).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-sm text-right font-mono text-gray-900">
                      ৳{Number(entry.totalCredit || 0).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      {getStatusDisplay(entry)}
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          className="p-1 text-gray-600 hover:text-blue-600 transition"
                          title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(entry._id)}
                          className="p-1 text-gray-600 hover:text-red-600 transition"
                          title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-8 text-center text-gray-500">
                    No journal entries found. Create your first entry to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
