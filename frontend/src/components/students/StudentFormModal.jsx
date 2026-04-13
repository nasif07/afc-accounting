import React, { useEffect, useState, useRef } from "react";
import {
  X,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Save,
  ChevronDown,
} from "lucide-react";

const initialFormData = {
  rollNumber: "",
  name: "",
  class: "",
  section: "",
  email: "",
  phone: "",
  nationality: "Unknown",
  profession: "",
  parentName: "",
  parentEmail: "",
  parentPhone: "",
  address: "",
  status: "active",
  totalPayable: 0,
  totalPaid: 0,
  notes: "",
};

const StudentFormModal = ({
  open,
  onClose,
  student = null,
  onSubmit,
  onBulkImport,
  isSubmitting = false,
}) => {
  const [activeTab, setActiveTab] = useState("single");
  const [formData, setFormData] = useState(initialFormData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (student) {
      setFormData({
        rollNumber: student.rollNumber || "",
        name: student.name || "",
        class: student.class || "",
        section: student.section || "",
        email: student.email || "",
        phone: student.phone || "",
        nationality: student.nationality || "Unknown",
        profession: student.profession || "",
        parentName: student.parent?.name || "",
        parentEmail: student.parent?.email || "",
        parentPhone: student.parent?.phone || "",
        address: student.address || "",
        status: student.status || "active",
        totalPayable: student.financials?.totalPayable || 0,
        totalPaid: student.financials?.totalPaid || 0,
        notes: student.notes || "",
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
    setSelectedFile(null);
  }, [student, open]);

  if (!open) return null;

  // --- CSV Logic ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setSelectedFile(file);
      setErrors({});
    } else {
      setErrors({ bulk: "Please upload a valid CSV file." });
    }
  };

  const handleBulkSubmit = () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split("\n").filter((l) => l.trim());
      const headers = lines[0].split(",").map((h) => h.trim());

      const data = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row = {};
        headers.forEach((h, i) => {
          // Logic to handle nested parent/financials in CSV if needed
          if (["totalPayable", "totalPaid"].includes(h)) {
            if (!row.financials) row.financials = {};
            row.financials[h] = Number(values[i]) || 0;
          } else if (h.startsWith("parent")) {
            if (!row.parent) row.parent = {};
            const key = h.replace("parent", "").toLowerCase();
            row.parent[key] = values[i];
          } else {
            row[h] = values[i];
          }
        });
        return row;
      });
      await onBulkImport(data);
    };
    reader.readAsText(selectedFile);
  };

  // --- Single Entry Logic ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === "bulk") return handleBulkSubmit();

    // Map Flat State to Schema Structure
    const payload = {
      rollNumber: formData.rollNumber,
      name: formData.name,
      class: formData.class,
      section: formData.section,
      email: formData.email,
      phone: formData.phone,
      nationality: formData.nationality,
      profession: formData.profession,
      address: formData.address,
      status: formData.status,
      notes: formData.notes,
      parent: {
        name: formData.parentName,
        email: formData.parentEmail,
        phone: formData.parentPhone,
      },
      financials: {
        totalPayable: Number(formData.totalPayable) || 0,
        totalPaid: Number(formData.totalPaid) || 0,
      },
    };

    await onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-auto rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              {student ? "Edit Student Profile" : "New Student Admission"}
            </h2>
            <p className="text-xs text-neutral-500">
              Ensure all mandatory fields are filled.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        {!student && (
          <div className="flex px-6 border-b border-neutral-100 bg-neutral-50/50">
            <TabBtn
              active={activeTab === "single"}
              onClick={() => setActiveTab("single")}
              label="Single Entry"
            />
            <TabBtn
              active={activeTab === "bulk"}
              onClick={() => setActiveTab("bulk")}
              label="Bulk CSV Upload"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6">
          {activeTab === "single" ? (
            <div className="space-y-6">
              {/* Personal Info */}
              <SectionTitle title="Basic Information" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Roll Number *"
                  value={formData.rollNumber}
                  onChange={(v) => setFormData({ ...formData, rollNumber: v })}
                  placeholder="e.g. S101"
                />
                <Input
                  label="Full Name *"
                  className="md:col-span-2"
                  value={formData.name}
                  onChange={(v) => setFormData({ ...formData, name: v })}
                />
                <Input
                  label="Class *"
                  value={formData.class}
                  onChange={(v) => setFormData({ ...formData, class: v })}
                />
                <Input
                  label="Section"
                  value={formData.section}
                  onChange={(v) => setFormData({ ...formData, section: v })}
                />
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(v) => setFormData({ ...formData, status: v })}
                  options={["active", "inactive", "suspended"]}
                />
              </div>

              {/* Contact & Parent */}
              <SectionTitle title="Contact & Parent Details" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(v) => setFormData({ ...formData, email: v })}
                />
                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                />
                <Input
                  label="Parent/Guardian Name"
                  value={formData.parentName}
                  onChange={(v) => setFormData({ ...formData, parentName: v })}
                />
                <Input
                  label="Parent Phone"
                  value={formData.parentPhone}
                  onChange={(v) => setFormData({ ...formData, parentPhone: v })}
                />
              </div>

              {/* Financials */}
              <SectionTitle title="Financial Records" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                <Input
                  label="Total Payable Fee ($)"
                  type="number"
                  value={formData.totalPayable}
                  onChange={(v) =>
                    setFormData({ ...formData, totalPayable: v })
                  }
                />
                <Input
                  label="Amount Already Paid ($)"
                  type="number"
                  value={formData.totalPaid}
                  onChange={(v) => setFormData({ ...formData, totalPaid: v })}
                />
                <div className="md:col-span-2 text-xs text-amber-700 font-medium">
                  Note: Pending balance is calculated automatically.
                </div>
              </div>
            </div>
          ) : (
            /* Bulk CSV UI */
            <div className="space-y-4 py-8 text-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center cursor-pointer transition ${selectedFile ? "border-emerald-500 bg-emerald-50" : "border-neutral-200 hover:border-neutral-900 bg-neutral-50"}`}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv"
                  className="hidden"
                />
                <div
                  className={`p-4 rounded-full mb-4 ${selectedFile ? "bg-emerald-500 text-white" : "bg-white text-neutral-400 shadow-sm"}`}>
                  {selectedFile ? (
                    <CheckCircle2 size={32} />
                  ) : (
                    <FileSpreadsheet size={32} />
                  )}
                </div>
                <p className="font-bold text-neutral-900">
                  {selectedFile
                    ? selectedFile.name
                    : "Click to select CSV File"}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  Expected columns: rollNumber, name, class, section, email...
                </p>
              </div>
              {errors.bulk && (
                <p className="text-red-500 text-sm">{errors.bulk}</p>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 flex items-center justify-end gap-3 border-t border-neutral-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-neutral-500 hover:text-neutral-900 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (activeTab === "bulk" && !selectedFile)}
              className="flex items-center gap-2 bg-neutral-900 text-white px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-800 disabled:opacity-50 transition shadow-lg shadow-neutral-200">
              {isSubmitting ? (
                "Processing..."
              ) : student ? (
                <>
                  <Save size={18} /> Update Record
                </>
              ) : (
                <>
                  <UserPlus size={18} /> Admission Done
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Sub-components ---
const SectionTitle = ({ title }) => (
  <h4 className="text-[10px] uppercase tracking-[2px] font-black text-neutral-400 mb-2">
    {title}
  </h4>
);

const TabBtn = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${active ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-400 hover:text-neutral-600"}`}>
    {label}
  </button>
);

const Input = ({ label, className = "", onChange, ...props }) => (
  <div className={`flex flex-col gap-1.5 ${className}`}>
    <label className="text-xs font-bold text-neutral-600 ml-1">{label}</label>
    <input
      {...props}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 transition"
    />
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-neutral-600 ml-1">{label}</label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-900 transition">
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
      />
    </div>
  </div>
);

export default StudentFormModal;
