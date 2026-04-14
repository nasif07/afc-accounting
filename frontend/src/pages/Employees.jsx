import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader,
  X,
  Users,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  CreditCard,
  MapPin,
  ClipboardList,
  Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  clearError,
  clearSuccess,
} from "../store/slices/employeeSlice";
import SectionHeader from "../components/common/SectionHeader";

const DESIGNATIONS = [
  "director",
  "teacher",
  "accountant",
  "admin",
  "support",
];
const STATUS_OPTIONS = ["active", "inactive", "on-leave", "resigned"];

export default function Employees() {
  const dispatch = useDispatch();
  const { items, loading, error, success } = useSelector(
    (state) => state.employees,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Updated state to match Mongoose Model
  const [formData, setFormData] = useState({
    employeeCode: "",
    name: "",
    email: "",
    phone: "",
    designation: "teacher",
    department: "",
    dateOfJoining: "",
    dateOfBirth: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    bankAccountNumber: "",
    bankName: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(
        editingId ? "Updated successfully!" : "Created successfully!",
      );
      dispatch(clearSuccess());
      setShowModal(false);
      resetForm();
      dispatch(fetchEmployees());
    }
  }, [success, dispatch, editingId]);

  const resetForm = () => {
    setFormData({
      employeeCode: "",
      name: "",
      email: "",
      phone: "",
      designation: "teacher",
      department: "",
      dateOfJoining: "",
      dateOfBirth: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      bankAccountNumber: "",
      bankName: "",
      status: "active",
      notes: "",
    });
    setEditingId(null);
  };

  const handleOpenModal = (employee = null) => {
    if (employee) {
      // Basic formatting for dates to work with HTML date inputs
      const formattedEmployee = { ...employee };
      if (employee.dateOfJoining)
        formattedEmployee.dateOfJoining = employee.dateOfJoining.split("T")[0];
      if (employee.dateOfBirth)
        formattedEmployee.dateOfBirth = employee.dateOfBirth.split("T")[0];

      setFormData(formattedEmployee);
      setEditingId(employee._id);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      dispatch(updateEmployee({ id: editingId, data: formData }));
    } else {
      dispatch(createEmployee(formData));
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Delete this employee?")) {
      dispatch(deleteEmployee(id));
      toast.success("Deleted successfully!");
    }
  };

  const filteredEmployees = items.filter(
    (emp) =>
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Users}
        title="Employee Directory"
        description="Comprehensive management of staff records, payroll data, and employment status."
        buttonText="Add Employee"
        onButtonClick={() => handleOpenModal()}
        buttonIcon={Plus}
      />

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"
            size={20}
          />
          <input
            type="text"
            placeholder="Search by name or employee code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                  Employee
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                  Designation
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                  Status
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">
                  Department
                </th>
                <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp._id}
                  className="hover:bg-blue-50/30 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {emp.name}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          #{emp.employeeCode}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600 capitalize">
                    {emp.designation?.replace("_", " ")}
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.status === "active"
                          ? "bg-green-100 text-green-700"
                          : emp.status === "on-leave"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                      }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {emp.department || "N/A"}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(emp)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(emp._id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full Feature Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId
                    ? "Edit Employee Profile"
                    : "New Employee Registration"}
                </h2>
                <p className="text-sm text-gray-500">
                  Provide all details to maintain an accurate staff record.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body - Form */}
            <form
              onSubmit={handleSubmit}
              className="p-8 overflow-y-auto space-y-8">
              {/* SECTION 1: PROFESSIONAL DETAILS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Briefcase size={16} /> Professional Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Employee Code *
                    </label>
                    <input
                      type="text"
                      name="employeeCode"
                      value={formData.employeeCode}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none capitalize">
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Designation
                    </label>
                    <select
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none capitalize">
                      {DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Joining Date *
                    </label>
                    <input
                      type="date"
                      name="dateOfJoining"
                      value={formData.dateOfJoining}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: CONTACT & PERSONAL */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Mail size={16} /> Contact & Personal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: ADDRESS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={16} /> Address Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      State/Province
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: BANKING & NOTES */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={16} /> Financial & Notes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="bankAccountNumber"
                      value={formData.bankAccountNumber}
                      onChange={handleChange}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-700 ml-1">
                      Administrative Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows="2"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <Loader className="animate-spin" size={20} />
                  ) : null}
                  {editingId ? "Update Employee Record" : "Register Employee"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all">
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
