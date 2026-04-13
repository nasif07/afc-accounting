import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader,
  X,
  CheckCircle,
  XCircle,
  DollarSign,
  Filter,
  MoreVertical,
  Calendar,
  Tag,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  clearError,
  clearSuccess,
} from "../store/slices/expenseSlice";
import { fetchVendors } from "../store/slices/vendorSlice";
import SectionHeader from "../components/common/SectionHeader";

const EXPENSE_CATEGORIES = [
  "utilities",
  "maintenance",
  "supplies",
  "travel",
  "equipment",
  "other",
];
const PAYMENT_MODES = ["bank", "cheque", "card", "cash", "online"];

export default function Expenses() {
  const dispatch = useDispatch();
  const { items, loading, error, success } = useSelector(
    (state) => state.expenses,
  );
  const { items: vendors } = useSelector((state) => state.vendors);
  const { user } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    category: "utilities",
    vendor: "",
    description: "",
    amount: "",
    paymentMode: "bank",
    invoiceNumber: "",
    invoiceDate: "",
  });

  useEffect(() => {
    dispatch(fetchExpenses());
    dispatch(fetchVendors());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(editingId ? "Expense updated!" : "Expense created!");
      dispatch(clearSuccess());
      handleCloseModal();
      dispatch(fetchExpenses());
    }
  }, [success, dispatch, editingId]);

  const resetForm = () => {
    setFormData({
      category: "utilities",
      vendor: "",
      description: "",
      amount: "",
      paymentMode: "bank",
      invoiceNumber: "",
      invoiceDate: "",
    });
    setEditingId(null);
  };

  const handleOpenModal = (expense = null) => {
    if (expense) {
      // Format date for input type="date"
      const formattedExpense = {
        ...expense,
        invoiceDate: expense.invoiceDate
          ? expense.invoiceDate.split("T")[0]
          : "",
        vendor: expense.vendor?._id || expense.vendor || "",
      };
      setFormData(formattedExpense);
      setEditingId(expense._id);
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
      [name]:
        name === "amount" ? (value === "" ? "" : parseFloat(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      dispatch(updateExpense({ id: editingId, data: formData }));
    } else {
      dispatch(createExpense(formData));
    }
  };

  const filteredExpenses = items.filter(
    (exp) =>
      exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusStyles = (status) => {
    switch (status) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={DollarSign}
        title="Expense Tracker"
        description="Monitor and manage institutional spending and vendor payouts."
        buttonText="New Expense"
        onButtonClick={() => handleOpenModal()}
        buttonIcon={Plus}
      />

      {/* Stats Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ৳
            {items
              .reduce((acc, curr) => acc + (curr.amount || 0), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-amber-600">Pending Approval</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {items.filter((i) => i.approvalStatus === "pending").length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-emerald-600">
            Approved This Month
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ৳
            {items
              .filter((i) => i.approvalStatus === "approved")
              .reduce((acc, curr) => acc + curr.amount, 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <Filter size={16} />
              Filter
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">Expense Details</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center">
                    <Loader
                      className="animate-spin text-slate-400 mx-auto"
                      size={32}
                    />
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-20 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <DollarSign size={40} className="text-slate-200 mb-2" />
                      <p className="font-medium text-slate-600">
                        No expenses found
                      </p>
                      <p className="text-sm">
                        Try adjusting your search or add a new record.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr
                    key={expense._id}
                    className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {expense.description}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Calendar size={12} />{" "}
                          {new Date(expense.invoiceDate).toLocaleDateString()} •{" "}
                          {expense.vendor?.vendorName || "No Vendor"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-slate-600 text-sm">
                        <Tag size={14} className="text-slate-400" />
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-base font-bold text-slate-900">
                        ৳{expense.amount.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-slate-400 uppercase tracking-tight">
                        {expense.paymentMode}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getStatusStyles(expense.approvalStatus)}`}>
                        {expense.approvalStatus?.toUpperCase() || "PENDING"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {expense.approvalStatus === "pending" && (
                          <>
                            <button
                              onClick={() => handleOpenModal(expense)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit">
                              <Edit2 size={16} />
                            </button>
                            {user?.role === "director" && (
                              <button
                                onClick={() =>
                                  dispatch(approveExpense(expense._id))
                                }
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Approve">
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() =>
                                dispatch(deleteExpense(expense._id))
                              }
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Modal Design */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={handleCloseModal}
          />
          <div className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Update Expense Record" : "New Expense Entry"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <input
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    placeholder="What was this expense for?"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Amount (৳)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none appearance-none">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Vendor
                  </label>
                  <select
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none">
                    <option value="">No Vendor</option>
                    {vendors.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.vendorName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    name="invoiceDate"
                    value={formData.invoiceDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] px-4 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2">
                  {loading && <Loader size={16} className="animate-spin" />}
                  {editingId ? "Update Record" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
