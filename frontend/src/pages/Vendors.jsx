import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader,
  X,
  Store,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  User,
  ClipboardList,
  ShieldCheck,
  Power,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  fetchVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  clearSuccess,
} from "../store/slices/vendorSlice";
import SectionHeader from "../components/common/SectionHeader";

const PAYMENT_TERMS = [
  "net-15",
  "net-30",
  "net-60",
  "due-on-receipt",
  "custom",
];

export default function Vendors() {
  const dispatch = useDispatch();
  const { items, loading, success } = useSelector((state) => state.vendors);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Synced with Mongoose Schema
  const [formData, setFormData] = useState({
    vendorCode: "",
    vendorName: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    paymentTerms: "net-30",
    taxId: "",
    isActive: true,
  });

  useEffect(() => {
    dispatch(fetchVendors());
  }, [dispatch]);

  useEffect(() => {
    if (success) {
      toast.success(
        editingId ? "Vendor Profile Updated" : "Vendor Registered Successfully",
      );
      setShowModal(false);
      resetForm();
      dispatch(fetchVendors());
      dispatch(clearSuccess());
    }
  }, [success, dispatch, editingId]);

  const resetForm = () => {
    setFormData({
      vendorCode: "",
      vendorName: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      paymentTerms: "net-30",
      taxId: "",
      isActive: true,
    });
    setEditingId(null);
  };

  const handleOpenModal = (vendor = null) => {
    if (vendor) {
      setFormData({
        vendorCode: vendor.vendorCode || "",
        vendorName: vendor.vendorName || "",
        contactPerson: vendor.contactPerson || "",
        email: vendor.email || "",
        phone: vendor.phone || "",
        address: vendor.address || "",
        paymentTerms: vendor.paymentTerms || "net-30",
        taxId: vendor.taxId || "",
        isActive: vendor.isActive ?? true,
      });
      setEditingId(vendor._id);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    editingId
      ? dispatch(updateVendor({ id: editingId, data: formData }))
      : dispatch(createVendor(formData));
  };

  const filteredItems = items.filter(
    (v) =>
      v.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorCode?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={Store}
        title="Vendor Management"
        description="Manage supplier profiles, payment terms, and tax documentation."
        buttonText="Add Vendor"
        onButtonClick={() => handleOpenModal()}
        buttonIcon={Plus}
      />

      {/* Search Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative w-full md:w-96 group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search vendor name or code..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Vendor & Code</th>
                <th className="px-6 py-4">Contact Person</th>
                <th className="px-6 py-4">Payment Terms</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((vendor) => (
                <tr
                  key={vendor._id}
                  className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold border border-slate-200">
                        {vendor.vendorName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">
                          {vendor.vendorName}
                        </p>
                        <p className="text-[11px] font-mono text-slate-500 uppercase">
                          {vendor.vendorCode}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-700">
                      {vendor.contactPerson || "—"}
                    </div>
                    <div className="text-xs text-slate-500">{vendor.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded-lg text-[11px] font-bold text-slate-600 uppercase border border-slate-200">
                      {vendor.paymentTerms}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-bold ${vendor.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                      <div
                        className={`h-2 w-2 rounded-full ${vendor.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`}
                      />
                      {vendor.isActive ? "ACTIVE" : "INACTIVE"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenModal(vendor)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => dispatch(deleteVendor(vendor._id))}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
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

      {/* Modal - Synced with Mongoose Schema */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    {editingId
                      ? "Update Vendor Profile"
                      : "Vendor Registration"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Synced with Master Database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <form
              onSubmit={handleSubmit}
              className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
              {/* SECTION 1: BUSINESS IDENTITY */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600 font-bold text-[11px] uppercase tracking-[0.2em]">
                  <Store size={14} /> Identity & Registration
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input
                    label="Vendor Code *"
                    name="vendorCode"
                    value={formData.vendorCode}
                    onChange={handleChange}
                    required
                    placeholder="VND-001"
                  />
                  <Input
                    label="Business Name *"
                    name="vendorName"
                    value={formData.vendorName}
                    onChange={handleChange}
                    required
                    placeholder="Company Ltd."
                  />
                  <Input
                    label="Tax ID / GSTIN"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* SECTION 2: POINT OF CONTACT */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-[11px] uppercase tracking-[0.2em]">
                  <User size={14} /> Contact Person Details
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input
                    label="Full Name"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleChange}
                    placeholder="Manager Name"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="vendor@email.com"
                  />
                  <Input
                    label="Phone Number"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1..."
                  />
                </div>
              </div>

              {/* SECTION 3: CONTRACTUAL TERMS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-slate-600 font-bold text-[11px] uppercase tracking-[0.2em]">
                    <ClipboardList size={14} /> Payment Terms
                  </div>
                  <select
                    name="paymentTerms"
                    value={formData.paymentTerms}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase font-bold">
                    {PAYMENT_TERMS.map((term) => (
                      <option key={term} value={term}>
                        {term.replace(/-/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-600 font-bold text-[11px] uppercase tracking-[0.2em]">
                    <Power size={14} /> Account Status
                  </div>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-bold text-slate-700">
                      Vendor is Active and Verified
                    </span>
                  </label>
                </div>
              </div>

              {/* Address Field */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">
                  Business Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Full physical address..."
                />
              </div>

              {/* Footer Actions */}
              <div className="flex gap-4 pt-6 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-3 tracking-widest text-xs">
                  {loading ? (
                    <Loader className="animate-spin" size={20} />
                  ) : (
                    <Plus size={20} />
                  )}
                  {editingId ? "UPDATE RECORD" : "CREATE VENDOR"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all text-xs tracking-widest">
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const Input = ({ label, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold text-slate-500 uppercase ml-1 tracking-wider">
      {label}
    </label>
    <input
      {...props}
      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all"
    />
  </div>
);
