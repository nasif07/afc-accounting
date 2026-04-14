import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader,
  X,
  CheckCircle,
  XCircle,
  Users,
  Wallet,
  TrendingDown,
  TrendingUp,
  FileText,
  Filter,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  fetchPayroll,
  createPayroll,
  updatePayroll,
  deletePayroll,
  approvePayroll,
  rejectPayroll,
  clearError,
  clearSuccess,
} from "../store/slices/payrollSlice";
import { fetchEmployees } from "../store/slices/employeeSlice";
import SectionHeader from "../components/common/SectionHeader";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SALARY_TYPES = ["monthly", "contract", "hourly"];

export default function Payroll() {
  const dispatch = useDispatch();
  const { items, loading, error, success } = useSelector(
    (state) => state.payroll,
  );
  const { items: employees } = useSelector((state) => state.employees);
  const { user } = useSelector((state) => state.auth);

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    employee: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    salaryType: "monthly",
    baseSalary: "",
    allowances: 0,
    deductions: 0,
    notes: "",
  });

  useEffect(() => {
    dispatch(fetchPayroll());
    dispatch(fetchEmployees());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(editingId ? "Record updated!" : "Payroll generated!");
      dispatch(clearSuccess());
      setShowModal(false);
      resetForm();
      dispatch(fetchPayroll());
    }
  }, [success, dispatch, editingId]);

  const resetForm = () => {
    setFormData({
      employee: "",
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      salaryType: "monthly",
      baseSalary: "",
      allowances: 0,
      deductions: 0,
      notes: "",
    });
    setEditingId(null);
  };

  const handleOpenModal = (payroll = null) => {
    if (payroll) {
      setFormData({
        ...payroll,
        employee: payroll.employee?._id || payroll.employee,
      });
      setEditingId(payroll._id);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: [
        "baseSalary",
        "allowances",
        "deductions",
        "month",
        "year",
      ].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    editingId
      ? dispatch(updatePayroll({ id: editingId, data: formData }))
      : dispatch(createPayroll(formData));
  };

  const filteredPayroll = items.filter(
    (p) =>
      p.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employee?.employeeCode
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const getStatusStyles = (status) => {
    switch (status) {
      case "approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "rejected":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "paid":
        return "bg-blue-50 text-blue-700 border-blue-100";
      default:
        return "bg-amber-50 text-amber-700 border-amber-100";
    }
  };

  const netSalary = (b, a, d) => (b || 0) + (a || 0) - (d || 0);

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Users}
        title="Payroll Registry"
        description="Process salaries, manage deductions, and track historical disbursements."
        buttonText="Generate Payroll"
        onButtonClick={() => handleOpenModal()}
        buttonIcon={Plus}
      />

      {/* Stats Quick-View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 ">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Net Disbursement
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ৳
            {items
              .reduce(
                (acc, curr) =>
                  acc +
                  netSalary(curr.baseSalary, curr.allowances, curr.deductions),
                0,
              )
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200  flex items-center gap-4">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Allowances
            </p>
            <p className="text-lg font-bold text-slate-900">
              ৳
              {items
                .reduce((acc, curr) => acc + (curr.allowances || 0), 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200  flex items-center gap-4">
          <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
            <TrendingDown size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Deductions
            </p>
            <p className="text-lg font-bold text-slate-900">
              ৳
              {items
                .reduce((acc, curr) => acc + (curr.deductions || 0), 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200  flex items-center gap-4">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pending Approval
            </p>
            <p className="text-lg font-bold text-slate-900">
              {items.filter((i) => i.approvalStatus === "pending").length}{" "}
              Records
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl  border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/30">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <Filter size={16} /> Filter Month
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                <th className="px-6 py-4">Employee Details</th>
                <th className="px-6 py-4 text-center">Period</th>
                <th className="px-6 py-4">Salary Breakdown</th>
                <th className="px-6 py-4">Net Payout</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center">
                    <Loader
                      className="animate-spin text-slate-400 mx-auto"
                      size={32}
                    />
                  </td>
                </tr>
              ) : filteredPayroll.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-slate-400">
                    No payroll records for this period.
                  </td>
                </tr>
              ) : (
                filteredPayroll.map((payroll) => (
                  <tr
                    key={payroll._id}
                    className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {payroll.employee?.name}
                        </span>
                        <span className="text-xs text-slate-500 uppercase font-medium">
                          {payroll.employee?.employeeCode} •{" "}
                          {payroll.salaryType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {MONTHS[payroll.month - 1].slice(0, 3)} {payroll.year}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs space-y-0.5">
                        <div className="flex justify-between w-32">
                          <span className="text-slate-400">Base:</span>{" "}
                          <span className="font-medium">
                            ৳{payroll.baseSalary}
                          </span>
                        </div>
                        <div className="flex justify-between w-32">
                          <span className="text-emerald-500">Allow:</span>{" "}
                          <span className="font-medium text-emerald-600">
                            +৳{payroll.allowances}
                          </span>
                        </div>
                        <div className="flex justify-between w-32">
                          <span className="text-rose-400">Ded:</span>{" "}
                          <span className="font-medium text-rose-600">
                            -৳{payroll.deductions}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-base font-bold text-slate-900">
                        ৳
                        {netSalary(
                          payroll.baseSalary,
                          payroll.allowances,
                          payroll.deductions,
                        ).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border ${getStatusStyles(payroll.approvalStatus)}`}>
                        {payroll.approvalStatus?.toUpperCase() || "PENDING"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {payroll.approvalStatus === "pending" && (
                          <>
                            <button
                              onClick={() => handleOpenModal(payroll)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit2 size={16} />
                            </button>
                            {user?.role === "director" && (
                              <button
                                onClick={() =>
                                  dispatch(approvePayroll(payroll._id))
                                }
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                <CheckCircle size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(payroll._id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                        <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                          <FileText size={16} />
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

      {/* Modern Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white w-full max-w-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId
                  ? "Update Payroll Record"
                  : "New Payroll Disbursement"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Employee
                  </label>
                  <select
                    name="employee"
                    value={formData.employee}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all">
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name} ({emp.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Salary Period
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="month"
                      value={formData.month}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm">
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      name="year"
                      type="number"
                      value={formData.year}
                      onChange={handleChange}
                      className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Type
                  </label>
                  <select
                    name="salaryType"
                    value={formData.salaryType}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none">
                    {SALARY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Financial Breakdown
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Base Salary
                      </label>
                      <input
                        name="baseSalary"
                        type="number"
                        value={formData.baseSalary}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-emerald-600 mb-1">
                        Allowances
                      </label>
                      <input
                        name="allowances"
                        type="number"
                        value={formData.allowances}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-emerald-100 rounded-lg outline-none bg-emerald-50/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-rose-600 mb-1">
                        Deductions
                      </label>
                      <input
                        name="deductions"
                        type="number"
                        value={formData.deductions}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-rose-100 rounded-lg outline-none bg-rose-50/30"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-900 rounded-2xl flex justify-between items-center text-white">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Calculated Net Payout
                  </p>
                  <p className="text-xl font-bold">
                    ৳
                    {netSalary(
                      formData.baseSalary,
                      formData.allowances,
                      formData.deductions,
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition">
                    Discard
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition flex items-center gap-2">
                    {loading && <Loader size={14} className="animate-spin" />}
                    {editingId ? "Update Record" : "Commit Payroll"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
