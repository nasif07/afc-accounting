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
      setShowModal(false);
      resetForm();
      dispatch(fetchExpenses());
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
      setFormData(expense);
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
      [name]: name === "amount" ? parseFloat(value) || "" : value,
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

  const handleDelete = (id) => {
    if (window.confirm("Delete this expense?")) {
      dispatch(deleteExpense(id));
      toast.success("Expense deleted!");
    }
  };

  const handleApprove = (id) => {
    if (window.confirm("Approve this expense?")) {
      dispatch(approveExpense(id));
      toast.success("Expense approved!");
    }
  };

  const handleReject = (id) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason) {
      dispatch(rejectExpense({ id, data: { rejectionReason: reason } }));
      toast.success("Expense rejected!");
    }
  };

  const filteredExpenses = items.filter(
    (exp) =>
      exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={DollarSign}
        title="Expenses Management"
        description="Manage organizational expenses"
        buttonText="Add Expense"
        onButtonClick={handleOpenModal}
        buttonIcon={Plus}
        buttonColor="bg-red-600 hover:bg-red-700" // Alliance Française theme
        iconBg="bg-red-50"
        iconColor="text-red-600"
      />
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by description or invoice number..."
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

        {!loading && filteredExpenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No expenses found. Create a new expense to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Vendor
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr
                    key={expense._id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {expense.description}
                    </td>
                    <td className="py-3 px-4 text-gray-600 capitalize">
                      {expense.category}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      ৳{expense.amount}
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {expense.vendor?.vendorName || "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.approvalStatus)}`}>
                        {expense.approvalStatus || "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {expense.approvalStatus === "pending" && (
                          <>
                            <button
                              onClick={() => handleOpenModal(expense)}
                              className="text-blue-600 hover:text-blue-700 transition">
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(expense._id)}
                              className="text-red-600 hover:text-red-700 transition">
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                        {user?.role === "director" &&
                          expense.approvalStatus === "pending" && (
                            <>
                              <button
                                onClick={() => handleApprove(expense._id)}
                                className="text-green-600 hover:text-green-700 transition">
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleReject(expense._id)}
                                className="text-red-600 hover:text-red-700 transition">
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
                {editingId ? "Edit Expense" : "Add New Expense"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor
                  </label>
                  <select
                    name="vendor"
                    value={formData.vendor}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Select a vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.vendorName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode *
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    name="invoiceDate"
                    value={formData.invoiceDate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader className="animate-spin" size={20} />
                  ) : null}
                  {loading
                    ? "Saving..."
                    : editingId
                      ? "Update Expense"
                      : "Create Expense"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 rounded-lg transition">
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
