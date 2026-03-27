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

    return accounts.filter(
      (acc) =>
        !acc.hasChildren &&
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
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Create Journal Entry
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.voucherDate}
                  onChange={(e) =>
                    setFormData({ ...formData, voucherDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Voucher #
                </label>
                <input
                  type="text"
                  placeholder="Optional - auto generated if empty"
                  value={formData.voucherNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, voucherNumber: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={formData.transactionType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transactionType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="receipt">Receipt</option>
                  <option value="payment">Payment</option>
                  <option value="journal-entry">Journal Entry</option>
                  <option value="transfer">Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter transaction description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                required
              />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Entry Lines</h3>
                <span className="text-xs text-gray-600">
                  {formData.bookEntries.length}/10 items
                </span>
              </div>

              <div className="space-y-3">
                {formData.bookEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end bg-gray-50 p-3 rounded-lg">
                    <div>
                      <label className="text-xs text-gray-600 font-medium">
                        Account *
                      </label>
                      <select
                        value={entry.account}
                        onChange={(e) =>
                          handleEntryChange(index, "account", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required>
                        <option value="">Select Account</option>
                        {leafAccounts.length > 0 ? (
                          leafAccounts.map((acc) => (
                            <option key={acc._id} value={acc._id}>
                              {acc.accountCode} - {acc.accountName}
                            </option>
                          ))
                        ) : (
                          <option disabled>No accounts available</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 font-medium">
                        Debit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.debit}
                        onChange={(e) =>
                          handleEntryChange(
                            index,
                            "debit",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600 font-medium">
                        Credit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.credit}
                        onChange={(e) =>
                          handleEntryChange(
                            index,
                            "credit",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    <div></div>

                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(index)}
                      disabled={formData.bookEntries.length <= 2}
                      className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:bg-gray-200 disabled:text-gray-400 transition text-sm font-medium">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddEntry}
                disabled={formData.bookEntries.length >= 10}
                className="mt-3 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 transition text-sm font-medium flex items-center gap-2">
                <Plus size={16} /> Add Line
              </button>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-600 font-medium">
                    Total Debit
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    ৳{totalDebit.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">
                    Total Credit
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    ৳{totalCredit.toFixed(2)}
                  </p>
                </div>
              </div>

              <div
                className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  isBalanced
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                {isBalanced ? (
                  <>
                    <CheckCircle size={18} />
                    Entry is balanced
                  </>
                ) : (
                  <>
                    <AlertCircle size={18} />
                    Entry is not balanced (Difference: ৳
                    {Math.abs(totalDebit - totalCredit).toFixed(2)})
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium">
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition font-medium">
                {isLoading ? "Creating..." : "Create Entry"}
              </button>
            </div>
          </form>
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
