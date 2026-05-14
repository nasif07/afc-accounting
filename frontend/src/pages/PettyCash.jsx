import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader,
  X,
  Calendar,
  ReceiptText,
  AlertCircle,
  CoinsIcon,
  Coins,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

import {
  fetchPettyCash,
  createPettyCash,
  updatePettyCash,
  deletePettyCash,
  fetchPettyCashStats,
  clearError,
} from "../store/slices/pettyCashSlice";

import { fetchCoa } from "../store/slices/coaSlice";
import SectionHeader from "../components/common/SectionHeader";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Button from "../components/common/Button";

const PAYMENT_MODES = ["cash", "bank", "cheque", "card", "online"];

const initialFormData = {
  date: new Date().toISOString().split("T")[0],
  description: "",
  amount: "",
  paidTo: "",
  expenseAccount: "",
  referenceNumber: "",
};

export default function PettyCash() {
  const dispatch = useDispatch();

  const {
    items = [],
    stats,
    loading,
    error,
  } = useSelector((state) => state.pettyCash);

  const { items: accounts = [] } = useSelector((state) => state.coa);
  const { user } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManagePettyCash =
    user?.role === "accountant" || user?.role === "sub-accountant";

  useEffect(() => {
    dispatch(fetchPettyCash());
    dispatch(fetchCoa());
    dispatch(fetchPettyCashStats());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setFormError("");
  };

  const handleOpenModal = (pettyCash = null) => {
    setFormError("");

    if (pettyCash) {
      setFormData({
        date: pettyCash.date
          ? pettyCash.date.split("T")[0]
          : new Date().toISOString().split("T")[0],
        description: pettyCash.description || "",
        amount: pettyCash.amount || "",
        paidTo: pettyCash.paidTo || "",
        expenseAccount:
          pettyCash.expenseAccount?._id || pettyCash.expenseAccount || "",
        referenceNumber: pettyCash.referenceNumber || "",
      });

      setEditingId(pettyCash._id);
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

    setFormError("");

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.date) return "Date is required.";
    if (!formData.amount || Number(formData.amount) <= 0)
      return "Amount must be greater than 0.";
    if (!formData.description.trim()) return "Description is required.";
    if (!formData.expenseAccount) return "Please select an expense account.";
    return "";
  };

  const getErrorMessage = (err) => {
    if (typeof err === "string") return err;

    return (
      err?.message ||
      err?.error ||
      err?.data?.message ||
      err?.response?.data?.message ||
      "Something went wrong. Please try again."
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }

    const payload = {
      ...formData,
      amount: Number(formData.amount),
    };

    try {
      setIsSubmitting(true);
      setFormError("");

      if (editingId) {
        await dispatch(
          updatePettyCash({ id: editingId, data: payload }),
        ).unwrap();
        toast.success("Petty cash record updated successfully.");
      } else {
        await dispatch(createPettyCash(payload)).unwrap();
        toast.success("Petty cash record created successfully.");
      }

      handleCloseModal();
      dispatch(fetchPettyCash());
      dispatch(fetchPettyCashStats());
    } catch (err) {
      const message = getErrorMessage(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this petty cash record?",
    );

    if (!confirmed) return;

    try {
      await dispatch(deletePettyCash(id)).unwrap();
      toast.success("Petty cash record deleted successfully.");
      dispatch(fetchPettyCash());
      dispatch(fetchPettyCashStats());
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filteredPettyCash = useMemo(() => {
    const search = searchTerm.toLowerCase();

    return items.filter((item) => {
      return (
        item.description?.toLowerCase().includes(search) ||
        item.pettyCashNumber?.toLowerCase().includes(search) ||
        item.paidTo?.toLowerCase().includes(search) ||
        item.referenceNumber?.toLowerCase().includes(search)
      );
    });
  }, [items, searchTerm]);

  const expenseAccounts = useMemo(() => {
    return accounts.filter((account) => account.accountType === "expense");
  }, [accounts]);

  const pettyCashAccounts = useMemo(() => {
    return accounts.filter((account) => account.accountType === "asset");
  }, [accounts]);

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Coins}
        title="Petty Cash Management"
        description="Manage small cash expenses with automatic journal posting"
        buttonText="New Petty Cash"
        onButtonClick={() => handleOpenModal()}
        buttonIcon={Plus}
      />

      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            {
              title: "Total Expense",
              value: `৳${stats.totalAmount?.toLocaleString() || 0}`,
              icon: CoinsIcon,
              iconBg: "bg-blue-50",
              iconColor: "text-blue-600",
            },
            {
              title: "Total Transactions",
              value: stats.count || 0,
              icon: ReceiptText,
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
            },
            {
              title: "Average Expense",
              value: `৳${stats.averageAmount?.toLocaleString() || 0}`,
              icon: Calendar,
              iconBg: "bg-violet-50",
              iconColor: "text-violet-600",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 sm:p-5">
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconBg}`}>
                    <Icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-500">
                      {item.title}
                    </p>
                    <p className="mt-1 truncate text-2xl font-semibold text-slate-900">
                      {item.value}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative">
          <Search
            className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400"
            size={16}
          />

          <Input
            type="text"
            placeholder="Search by voucher, description, paid to, or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
            Petty Cash Records
          </h3>
        </div>

        <div className="overflow-x-auto">
          {loading && !isSubmitting ? (
            <div className="flex items-center justify-center py-14">
              <Loader className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredPettyCash.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <CoinsIcon className="h-12 w-12 text-slate-300" />
              <h3 className="mt-3 text-sm font-semibold text-slate-900">
                No petty cash records
              </h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Create a new petty cash expense to get started.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Voucher",
                    "Date",
                    "Description",
                    "Paid To",
                    "Expense Account",
                    "Amount",
                    "Accounting",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:px-6">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredPettyCash.map((item) => (
                  <tr
                    key={item._id}
                    className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 sm:px-6">
                      {item.pettyCashNumber}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 sm:px-6">
                      {new Date(item.date).toLocaleDateString()}
                    </td>

                    <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-700 sm:px-6">
                      {item.description}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 sm:px-6">
                      {item.paidTo}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500 sm:px-6">
                      {item.expenseAccount?.accountName || "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-900 sm:px-6">
                      ৳{item.amount?.toLocaleString()}
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium capitalize text-emerald-700">
                        {item.accountingStatus || "posted"}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium sm:px-6">
                      {canManagePettyCash && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            disabled={item.accountingStatus === "posted"}
                            className="rounded-lg p-1.5 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                            <Edit2 className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item._id)}
                            disabled={item.accountingStatus === "posted"}
                            className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm">
          <div className="min-h-full px-3 py-6 sm:px-4">
            <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {editingId ? "Edit Petty Cash" : "New Petty Cash Expense"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Fill in the expense details below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && (
                  <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{formError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="Date"
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />

                  <Input
                    label="Amount (৳)"
                    type="number"
                    name="amount"
                    placeholder="00"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    min="0.01"
                    step="0.01"
                    disabled={isSubmitting}
                  />
                </div>

                <Input
                  label="Description"
                  name="description"
                  placeholder="Describe the petty cash expense"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  textarea
                  rows={3}
                  disabled={isSubmitting}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select
                    label="Expense Account"
                    name="expenseAccount"
                    value={formData.expenseAccount}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    placeholder="Select expense account"
                    options={expenseAccounts.map((account) => ({
                      label: `${account.accountCode} - ${account.accountName}`,
                      value: account._id,
                    }))}
                  />
                  <Input
                    label="Paid To"
                    name="paidTo"
                    placeholder="Person who received cash"
                    value={formData.paidTo}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>

                <Input
                  label="Reference Number"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                  placeholder="Optional reference number"
                  disabled={isSubmitting}
                />

                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto">
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto">
                    {isSubmitting
                      ? editingId
                        ? "Updating..."
                        : "Creating..."
                      : editingId
                        ? "Update Petty Cash"
                        : "Create Petty Cash"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
